/**
 * Confirma una suscripción recién aprobada, preguntando a PayPal.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 * El acceso lo concedía solo el webhook. Eso significa que el usuario paga y
 * después espera a que PayPal, desde fuera, decida avisarnos. Si el aviso se
 * retrasa o se pierde —en sandbox pasa a menudo— el usuario ha pagado y no
 * tiene nada, y no hay forma de que lo arregle por su cuenta. Depender de un
 * aviso que no controlamos para algo por lo que ya se ha cobrado está mal.
 *
 * Aquí el camino se invierte: en cuanto el usuario aprueba, la app manda el
 * identificador de la suscripción y **nosotros** le preguntamos a PayPal si es
 * de verdad y está activa. Si lo está, se escribe el derecho en el acto.
 *
 * El webhook sigue haciendo falta: es quien se entera de las renovaciones, las
 * cancelaciones y los reembolsos, que ocurren cuando la app no está abierta.
 * Los dos escriben la misma fila, así que da igual cuál llegue primero.
 *
 * ── Por qué se puede confiar en esto ──────────────────────────────────────
 * El navegador solo manda un identificador de suscripción, que no sirve de
 * nada por sí solo. Todo lo que decide qué se concede se comprueba aquí:
 *   1. Quién llama, contra su sesión de Supabase (no contra lo que él diga).
 *   2. Que la suscripción existe y está activa, preguntándole a PayPal.
 *   3. Que esa suscripción es suya, mirando el `custom_id` que grabó PayPal.
 *   4. Qué desbloquea, según el `plan_id` que PayPal cobró de verdad.
 *
 * Se despliega con --no-verify-jwt y la sesión se valida a mano, porque así se
 * puede devolver un motivo claro en vez de un 401 pelado del portero.
 */

import {
  PLANES,
  RAIZ,
  caducaEn,
  escribeDerecho,
  retiraPlanAnterior,
  tokenDePaypal,
} from '../_compartido/derechos.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const responde = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

/** Quién llama de verdad, según su sesión. Nunca según lo que mande el cuerpo. */
async function usuarioDeLaSesion(token: string): Promise<string | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !token) return null;

  const r = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anon ?? '' },
  });
  if (!r.ok) return null;
  return (await r.json())?.id ?? null;
}

Deno.serve(async (peticion) => {
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (peticion.method !== 'POST') return responde({ error: 'Solo POST' }, 405);

  const token = (peticion.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const usuarioId = await usuarioDeLaSesion(token);
  if (!usuarioId) {
    console.log('RECHAZADO: sesion no valida');
    return responde({ error: 'Sesión no válida' }, 401);
  }

  const { subscriptionID } = await peticion.json().catch(() => ({}));
  if (!subscriptionID || typeof subscriptionID !== 'string') {
    return responde({ error: 'Falta subscriptionID' }, 400);
  }

  console.log('confirmando', subscriptionID, 'para', usuarioId);

  const acceso = await tokenDePaypal();
  if (!acceso) {
    console.log('FALLO: no hay credenciales de PayPal (PAYPAL_CLIENT_ID / PAYPAL_SECRET)');
    return responde({ error: 'No se pudo verificar con PayPal' }, 502);
  }

  const r = await fetch(`${RAIZ}/v1/billing/subscriptions/${encodeURIComponent(subscriptionID)}`, {
    headers: { Authorization: `Bearer ${acceso}` },
  });
  if (!r.ok) {
    console.log('PayPal no reconoce la suscripcion:', r.status, await r.text());
    return responde({ error: 'PayPal no reconoce esa suscripción' }, 404);
  }
  const sus = await r.json();

  console.log('estado:', sus.status, '| plan:', sus.plan_id, '| custom:', sus.custom_id);

  /*
   * Solo concede `ACTIVE`. Es el único estado en el que PayPal ha cobrado.
   *
   * Antes valía también `APPROVED`, para no hacer esperar al usuario los
   * segundos que PayPal tarda en activar. Pero `APPROVED` significa "el
   * comprador dijo que sí", no "el dinero está cobrado", y una suscripción
   * puede quedarse ahí para siempre —pasó: el usuario cerró la ventana de
   * PayPal antes de tiempo, la suscripción se quedó en `APPROVED` y el plan
   * se concedió sin que llegara un céntimo—. En sandbox es anecdótico; en
   * producción es regalar el producto.
   *
   * Esperar no deja a nadie tirado: el 202 hace que la app conserve el
   * identificador y reintente al volver a la pantalla, y además el webhook
   * concede el acceso en cuanto PayPal manda `BILLING.SUBSCRIPTION.ACTIVATED`.
   * Son dos caminos hacia lo mismo, y ninguno regala nada.
   *
   * `APPROVAL_PENDING` cae aquí también: el comprador ni siquiera ha aprobado.
   */
  if (sus.status !== 'ACTIVE') {
    return responde({ error: 'pendiente', estado: sus.status }, 202);
  }

  // Que la suscripción sea suya. Sin esto, cualquiera que averigüe el
  // identificador de otro se apuntaría su compra.
  const dueno = String(sus.custom_id ?? '').split('|')[0];
  if (dueno && dueno !== usuarioId) {
    console.log('RECHAZADO: la suscripcion es de otro usuario');
    return responde({ error: 'Esa suscripción no es tuya' }, 403);
  }

  // Qué desbloquea sale del plan que PayPal cobró, no de lo que diga el navegador.
  const plan = PLANES[sus.plan_id];
  if (!plan) {
    console.log('RECHAZADO: plan desconocido', sus.plan_id);
    return responde({ error: 'Plan desconocido' }, 400);
  }

  /*
   * Los planes parciales no conceden ninguna competición todavía: conceden
   * **huecos**. El usuario elige cuáles después, desde la app, y esa elección
   * pasa por `paypal-elige` con su sesión.
   *
   * Se hace así y no mandando las ligas en el `custom_id` porque ese lo
   * escribe el navegador: quien pagara dos ligas podría mandar diez. Con los
   * huecos, lo que se compra es un número, y ese número lo pone esta tabla.
   */
  /*
   * Un plan sustituye al otro. Se retira lo anterior antes de escribir, en la
   * dirección que sea: del parcial al completo o del completo al parcial.
   */
  await retiraPlanAnterior(usuarioId, subscriptionID);

  const ok = await escribeDerecho({
    usuario_id: usuarioId,
    competicion: plan.competicion,
    periodo: plan.periodo,
    caduca: caducaEn(plan.periodo),
    compra_id: subscriptionID,
    cobro_fallido: false,
    cancelada: false,
    huecos: plan.cuantas ?? 0,
  });

  console.log(ok ? 'ESCRITO en derechos' : 'FALLO al escribir en derechos');
  if (!ok) return responde({ error: 'No se pudo guardar el acceso' }, 500);

  return responde({
    ok: true,
    competicion: plan.competicion,
    periodo: plan.periodo,
    // La app lo usa para llevar al usuario a elegir sus ligas nada más pagar.
    huecos: plan.cuantas ?? 0,
  });
});
