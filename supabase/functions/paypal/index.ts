/**
 * Webhook de PayPal → tabla `derechos`.
 *
 * Esta función es la única que puede escribir lo que un usuario ha comprado.
 * La app solo lee: si pudiera escribir, cualquiera se regalaría el plan anual
 * desde la consola del navegador.
 *
 * PayPal avisa aquí cuando una suscripción se activa, se renueva o se cancela.
 * De cada aviso salen tres datos: quién compró, qué compró y hasta cuándo.
 *
 * ── Despliegue ───────────────────────────────────────────────────────────
 *   supabase functions deploy paypal --no-verify-jwt
 *
 *   (--no-verify-jwt porque quien llama es PayPal, no un usuario con sesión;
 *    la autenticidad se comprueba con la firma, más abajo.)
 *
 * ── Secretos (Supabase → Edge Functions → Secrets) ───────────────────────
 *   PAYPAL_CLIENT_ID       de tu app en developer.paypal.com
 *   PAYPAL_SECRET          idem
 *   PAYPAL_WEBHOOK_ID      el id del webhook que crees en el panel de PayPal
 *   PAYPAL_ENTORNO         "sandbox" para probar, "live" para cobrar de verdad
 *   SUPABASE_URL           lo pone Supabase solo
 *   SUPABASE_SERVICE_ROLE_KEY  lo pone Supabase solo — NUNCA en la app
 *
 * ── Cómo se sabe quién compró ────────────────────────────────────────────
 * Al crear la suscripción, la app manda el identificador del usuario en
 * `custom_id`, con el formato  "<usuarioId>|<competicion>|<periodo>".
 * PayPal lo devuelve intacto en cada aviso, y de ahí sale la fila.
 */

import {
  PLANES,
  RAIZ,
  borraDerecho,
  caducaEn,
  escribeDerecho,
  marcaSituacion,
  retiraPlanAnterior,
  tokenDePaypal,
} from '../_compartido/derechos.ts';

/**
 * Comprueba que el aviso viene de PayPal de verdad.
 *
 * Sin esto, cualquiera que averigüe la dirección de la función puede regalarse
 * el plan anual mandando un JSON a mano. Es el punto crítico de todo esto.
 */
async function firmaValida(cabeceras: Headers, cuerpo: unknown): Promise<boolean> {
  const token = await tokenDePaypal();
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
  if (!token || !webhookId) return false;

  const r = await fetch(`${RAIZ}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: cabeceras.get('paypal-auth-algo'),
      cert_url: cabeceras.get('paypal-cert-url'),
      transmission_id: cabeceras.get('paypal-transmission-id'),
      transmission_sig: cabeceras.get('paypal-transmission-sig'),
      transmission_time: cabeceras.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: cuerpo,
    }),
  });
  if (!r.ok) return false;
  return (await r.json()).verification_status === 'SUCCESS';
}

/**
 * Qué plan cobró PayPal en este aviso.
 *
 * Los avisos de suscripción traen el `plan_id` puesto. Los de cobro
 * (`PAYMENT.SALE.COMPLETED`, que es cada renovación) no: solo traen el
 * identificador de la suscripción, así que hay que ir a preguntarle a PayPal
 * cuál era su plan.
 */
async function planDelAviso(
  recurso: Record<string, any>,
): Promise<{ competicion: string; periodo: string } | null> {
  if (recurso.plan_id) return PLANES[recurso.plan_id] ?? null;

  const suscripcion = recurso.billing_agreement_id;
  if (!suscripcion) return null;

  const acceso = await tokenDePaypal();
  if (!acceso) return null;

  const r = await fetch(`${RAIZ}/v1/billing/subscriptions/${encodeURIComponent(suscripcion)}`, {
    headers: { Authorization: `Bearer ${acceso}` },
  });
  if (!r.ok) return null;
  return PLANES[(await r.json()).plan_id] ?? null;
}

Deno.serve(async (peticion) => {
  if (peticion.method !== 'POST') return new Response('Solo POST', { status: 405 });

  const aviso = await peticion.json();

  /*
   * Trazas. Un webhook sin ellas es imposible de depurar: los avisos los manda
   * PayPal desde fuera, no se pueden reproducir a mano, y si algo se rechaza no
   * queda rastro de por que. Cada linea dice en que punto se quedo.
   */
  console.log('aviso recibido:', aviso?.event_type, '| id:', aviso?.id);

  if (!(await firmaValida(peticion.headers, aviso))) {
    // No se da pista de por qué falla: quien lo intenta no debe aprender nada.
    console.log('RECHAZADO: la firma no valida. Revisa PAYPAL_WEBHOOK_ID.');
    return new Response('No autorizado', { status: 401 });
  }

  const recurso = aviso?.resource ?? {};
  const custom: string = recurso.custom_id ?? recurso.custom ?? '';

  /*
   * Del `custom_id` solo se cree quién compró. El periodo y la competición
   * salen del plan que PayPal cobró de verdad: ese dato lo pone PayPal, no el
   * navegador. Antes se leían los tres del `custom_id`, que lo escribe la web y
   * por tanto lo puede cambiar el usuario — bastaba con suscribirse al plan
   * semanal mandando "…|todas|anual" para llevarse el año por el precio de una
   * semana.
   */
  const [usuarioId] = custom.split('|');
  const plan = await planDelAviso(recurso);
  const competicion = plan?.competicion ?? 'todas';
  const periodo = plan?.periodo ?? 'mensual';

  console.log('custom_id:', custom || '(vacio)', '-> usuario:', usuarioId || '(ninguno)', '| competicion:', competicion, '| periodo:', periodo);

  if (!usuarioId) {
    // Sin dueño no hay nada que apuntar, pero se responde 200: si no, PayPal
    // reintenta este aviso para siempre.
    return new Response('Sin custom_id', { status: 200 });
  }

  switch (aviso.event_type) {
    // Alta y cada renovación cobrada: se extiende la fecha de caducidad.
    case 'BILLING.SUBSCRIPTION.ACTIVATED':
    case 'BILLING.SUBSCRIPTION.RE-ACTIVATED':
    case 'PAYMENT.SALE.COMPLETED':
      // Sin plan reconocido no se concede nada: no sabemos qué se compró ni
      // por cuánto tiempo, y adivinarlo sería regalar el que más dure.
      if (!plan) {
        console.log('NO SE CONCEDE: plan desconocido', recurso.plan_id ?? '(sin plan_id)');
        break;
      }
      // Igual que en la confirmación: el plan nuevo retira al anterior.
      await retiraPlanAnterior(usuarioId, recurso.id ?? aviso.id);

      await escribeDerecho({
        usuario_id: usuarioId,
        competicion,
        periodo,
        caduca: caducaEn(periodo),
        compra_id: recurso.id ?? aviso.id,
        /*
         * Un alta o una renovación buenas dejan la fila limpia: ni impago ni
         * baja pendientes. La fila se reutiliza —la clave es usuario+
         * competición—, así que sin esto una compra nueva heredaba el
         * `cancelada: true` de la anterior y el perfil seguía diciendo que
         * estabas dado de baja después de haber vuelto a pagar.
         */
        cobro_fallido: false,
        cancelada: false,
      }).then((ok) => console.log(ok ? 'ESCRITO en derechos' : 'FALLO al escribir en derechos'));
      break;

    /*
     * ── Bajas e impagos: `caduca` NO se toca ─────────────────────────────
     *
     * En ninguno de los casos de abajo se reescribe la fecha de caducidad. La
     * fila ya tiene la del último cobro, y esa es justo la que hay que
     * respetar: el usuario conserva lo que pagó y el acceso se apaga solo
     * cuando llegue el día.
     *
     * Antes sí se reescribía, con `caduca: caducaEn(periodo)`, bajo un
     * comentario que decía "caduca cuando tocaba, no ahora mismo". Era falso:
     * `caducaEn` cuenta los días **desde este instante**. A quien se le
     * suspendía la suscripción por quedarse sin fondos se le regalaba otro
     * periodo entero —siete días en el semanal, un año en el anual—, y no se
     * notaba, porque nadie reclama por tener acceso de más.
     */

    /*
     * Baja voluntaria. No es un problema de pago y no se avisa como tal: lo ha
     * decidido el usuario. Solo se deja constancia para poder decirle hasta
     * cuándo le dura lo que ya pagó.
     */
    case 'BILLING.SUBSCRIPTION.CANCELLED':
      await marcaSituacion(usuarioId, competicion, {
        cancelada: true,
        // Si venía marcada por un impago anterior, deja de ser lo relevante.
        cobro_fallido: false,
      }).then((ok) => console.log(ok ? 'marcada como cancelada' : 'FALLO al marcar cancelada'));
      break;

    /*
     * Impago de verdad: PayPal intentó cobrar y no pudo, o la suscripción se
     * suspendió por ello. Aquí sí hay que avisar, y con tiempo.
     */
    case 'BILLING.SUBSCRIPTION.EXPIRED':
    case 'BILLING.SUBSCRIPTION.SUSPENDED':
    case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
    case 'PAYMENT.SALE.DENIED':
      /*
       * `caduca` no se toca —ver arriba—, pero sí se deja constancia de que el
       * cobro falló.
       *
       * Sin esta marca, al usuario le desaparecían los candados abiertos un
       * día cualquiera y sin una palabra: había pagado, de pronto ya no, y no
       * había forma de que supiera por qué ni de que lo arreglara. Con la marca
       * puesta, la app puede decírselo mientras aún le queda acceso, que es
       * cuando todavía se puede hacer algo.
       */
      await marcaSituacion(usuarioId, competicion, { cobro_fallido: true }).then((ok) =>
        console.log(ok ? 'marcado impago' : 'FALLO al marcar impago'),
      );
      break;

    // Reembolso: eso sí retira el acceso de inmediato.
    case 'PAYMENT.SALE.REFUNDED':
    case 'PAYMENT.SALE.REVERSED':
      await borraDerecho(usuarioId, competicion);
      break;
  }

  return new Response('ok', { status: 200 });
});
