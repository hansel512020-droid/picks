/**
 * Lo que comparten las dos funciones de PayPal.
 *
 * Hay dos caminos por los que se concede un plan y los dos escriben la misma
 * fila, así que la regla de caducidad y la forma de escribir tienen que vivir
 * en un solo sitio. Duplicadas se separan con el tiempo y acabas con un usuario
 * al que un camino le da 31 días y el otro 30.
 *
 * Las carpetas que empiezan por `_` no se despliegan como función propia.
 */

const PAYPAL = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
} as const;

const entorno = (Deno.env.get('PAYPAL_ENTORNO') ?? 'sandbox') as keyof typeof PAYPAL;
export const RAIZ = PAYPAL[entorno] ?? PAYPAL.sandbox;

/** Token de aplicación para hablar con la API de PayPal. */
export async function tokenDePaypal(): Promise<string | null> {
  const id = Deno.env.get('PAYPAL_CLIENT_ID');
  const secreto = Deno.env.get('PAYPAL_SECRET');

  /*
   * Los dos motivos por los que esto falla llevan a sitios opuestos —falta el
   * secreto, o PayPal lo rechaza— y antes los dos salían como el mismo 502
   * mudo. Se distinguen aquí. Del identificador solo se apuntan los primeros
   * caracteres, que bastan para ver si es el de la app que usa el navegador;
   * el secreto no se escribe nunca.
   */
  if (!id || !secreto) {
    console.log(
      'PayPal: faltan credenciales |',
      'PAYPAL_CLIENT_ID:', id ? `${id.slice(0, 12)}…` : '(vacio)',
      '| PAYPAL_SECRET:', secreto ? 'presente' : '(vacio)',
    );
    return null;
  }

  const r = await fetch(`${RAIZ}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secreto}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) {
    console.log(
      'PayPal rechaza las credenciales:', r.status, await r.text(),
      '| entorno:', entorno, '| PAYPAL_CLIENT_ID empieza por:', id.slice(0, 12),
    );
    return null;
  }
  return (await r.json()).access_token ?? null;
}

/**
 * Qué desbloquea cada plan, y por cuánto tiempo. **Esta tabla manda.**
 *
 * El `custom_id` lo pone el navegador, así que el usuario lo controla: puede
 * suscribirse al plan semanal y mandar "…|todas|anual". Si nos fiáramos de él,
 * pagaría una semana y se llevaría el año. Del `custom_id` solo se cree una
 * cosa —quién es el usuario, que además se comprueba contra su sesión— y el
 * periodo y la competición salen de aquí, del `plan_id` que cobró PayPal.
 *
 * Al pasar a producción hay que añadir los `plan_id` de Live.
 */
export const PLANES: Record<
  string,
  { competicion: string; periodo: string; cuantas?: number }
> = {
  'P-2YM95169R7499880TNKAROCI': { competicion: 'todas', periodo: 'anual' },
  'P-2NL80130H1296394YNKBGEBI': { competicion: 'todas', periodo: 'mensual' },
  'P-01S395028H7387306NKBGECA': { competicion: 'todas', periodo: 'semanal' },
  // Planes parciales: el usuario elige qué competiciones. `cuantas` es el tope
  // y **manda sobre lo que pida el navegador**.
  'P-40F56912DE995063XNKBGDXI': { competicion: 'elegidas', periodo: 'mensual', cuantas: 2 },
  'P-02C942313Y099943LNKBGDYQ': { competicion: 'elegidas', periodo: 'mensual', cuantas: 3 },

  /*
   * Planes viejos, con los precios anteriores.
   *
   * Se quedan aquí porque un plan de PayPal no se puede cambiar de precio: al
   * bajarlos hubo que crear planes nuevos. Quien se suscribió antes sigue
   * pagando lo que contrató y su suscripción sigue apuntando al plan antiguo,
   * así que si se borran de esta tabla, su próxima renovación llegaría como
   * "plan desconocido" y se quedaría sin acceso habiendo pagado.
   */
  'P-09H3627014641790GNKAROYA': { competicion: 'todas', periodo: 'mensual' },
  'P-77904674A0451282NNKARQOY': { competicion: 'todas', periodo: 'semanal' },
  'P-5TC72785KW1445112NKBERSQ': { competicion: 'elegidas', periodo: 'mensual', cuantas: 2 },
  'P-26634278KC4286036NKBERTA': { competicion: 'elegidas', periodo: 'mensual', cuantas: 3 },
};

/*
 * Los planes parciales no traen las competiciones en el `custom_id`: al cobrar
 * se apuntan `cuantas` como huecos en la fila `elegidas`, y el usuario escoge
 * después desde la app, en `paypal-elige`. Se hizo así porque el `custom_id`
 * lo escribe el navegador y quien pagara dos ligas podía mandar diez.
 */

/** Cuándo caduca el derecho según el periodo comprado. */
export function caducaEn(periodo: string): string | null {
  const dias: Record<string, number> = { semanal: 7, mensual: 31, anual: 366 };
  const d = dias[periodo];
  if (!d) return null; // vitalicio
  // Un día de gracia: si PayPal se retrasa en avisar del cobro, el usuario no
  // se queda fuera en mitad de una jornada.
  return new Date(Date.now() + (d + 1) * 86400000).toISOString();
}

export async function escribeDerecho(fila: Record<string, unknown>): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave) return false;

  const r = await fetch(`${url}/rest/v1/derechos?on_conflict=usuario_id,competicion`, {
    method: 'POST',
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(fila),
  });
  if (!r.ok) console.log('derechos respondio', r.status, await r.text());
  return r.ok;
}

/**
 * Las compras vigentes de un usuario, leídas con la clave de servicio.
 *
 * Hace falta para poder cancelar: el navegador manda quién es —y se comprueba
 * contra su sesión—, pero **no** cuál es su suscripción. Si el identificador de
 * la suscripción viajara desde el cliente, bastaría con cambiarlo por el de
 * otro para darle de baja la suya. Aquí se busca en el servidor, partiendo de
 * un usuario que ya está verificado.
 */
export async function derechosDe(usuarioId: string): Promise<
  {
    competicion: string;
    periodo: string;
    compra_id: string | null;
    caduca: string | null;
    huecos?: number;
  }[]
> {
  const url = Deno.env.get('SUPABASE_URL');
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave) return [];

  const r = await fetch(
    `${url}/rest/v1/derechos?usuario_id=eq.${usuarioId}&select=competicion,periodo,compra_id,caduca,huecos`,
    { headers: { apikey: clave, Authorization: `Bearer ${clave}` } },
  );
  if (!r.ok) {
    console.log('no se pudieron leer los derechos:', r.status, await r.text());
    return [];
  }
  return await r.json();
}

/**
 * Anota en qué situación quedó la suscripción, sin tocar nada más.
 *
 * Distingue dos cosas que no se pueden confundir:
 *
 *   · `cobro_fallido` — PayPal intentó cobrar y no pudo. El usuario **no ha
 *     hecho nada mal**, pero tiene que arreglar el pago o perderá el acceso.
 *   · `cancelada` — se dio de baja él mismo. Es una decisión suya, no un
 *     problema.
 *
 * Al principio iban en el mismo saco y a quien cancelaba voluntariamente le
 * saltaba un aviso rojo diciéndole que no se había podido cobrar: alarmante y
 * además falso.
 *
 * Es un `PATCH` y no un alta: si el usuario no tiene fila, no se crea. Con
 * `escribeDerecho` habría sido un upsert, y al no mandar `caduca` la fila nueva
 * habría salido con caducidad nula —que en esta tabla significa **vitalicio**—.
 * Un impago no puede acabar regalando el acceso para siempre.
 */
export async function marcaSituacion(
  usuarioId: string,
  competicion: string,
  campos: { cobro_fallido?: boolean; cancelada?: boolean },
): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave) return false;

  const r = await fetch(
    `${url}/rest/v1/derechos?usuario_id=eq.${usuarioId}&competicion=eq.${competicion}`,
    {
      method: 'PATCH',
      headers: {
        apikey: clave,
        Authorization: `Bearer ${clave}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(campos),
    },
  );
  if (!r.ok) console.log('no se pudo anotar la situacion:', r.status, await r.text());
  return r.ok;
}

/**
 * Retira lo que quedara de un plan anterior.
 *
 * Un plan sustituye al otro; nunca se suman. Se borra todo lo que no venga de
 * la suscripción que se está concediendo ahora, y da igual en qué dirección sea
 * el cambio:
 *
 *   · De dos ligas al completo — si no, la app seguía viendo huecos, la
 *     insignia decía "Pro · 2 ligas" y le pedía elegir competiciones que ya
 *     tenía todas.
 *   · Del completo a dos ligas — la fila `todas` se quedaba puesta, así que
 *     "Mis ligas" respondía "no tienes un plan de ligas a elegir" a alguien que
 *     acababa de pagarlo.
 *   · Cambiando de periodo — la suscripción vieja deja de mandar en cuanto
 *     entra la nueva.
 *
 * Se compara por `compra_id` y no por tipo de plan: es el único dato que dice
 * de qué suscripción viene cada fila.
 */
export async function retiraPlanAnterior(usuarioId: string, compraActual: string): Promise<void> {
  const filas = await derechosDe(usuarioId);
  const viejas = new Set<string>();

  for (const f of filas) {
    if (f.compra_id === compraActual) continue;
    if (f.compra_id) viejas.add(f.compra_id);
    const quitado = await borraDerecho(usuarioId, f.competicion);
    console.log(quitado ? 'retirado del plan anterior:' : 'FALLO al retirar:', f.competicion);
  }

  /*
   * Y se da de baja en PayPal, que es lo que de verdad cobra.
   *
   * Quitar la fila solo cierra el acceso: la suscripción vieja seguiría viva y
   * cobrando cada mes por un plan que el usuario ya no tiene. Alguien que
   * cambiase tres veces de plan acabaría pagando tres suscripciones a la vez
   * sin usar dos de ellas, y se enteraría por el extracto del banco.
   */
  for (const suscripcion of viejas) {
    const ok = await cancelaEnPaypal(suscripcion, 'Sustituida por un plan nuevo');
    console.log(ok ? 'suscripcion anterior cancelada:' : 'no se pudo cancelar:', suscripcion);
  }
}

/** Da de baja una suscripción en PayPal. No toca el acceso ya pagado. */
export async function cancelaEnPaypal(suscripcion: string, motivo: string): Promise<boolean> {
  const acceso = await tokenDePaypal();
  if (!acceso) return false;

  const r = await fetch(
    `${RAIZ}/v1/billing/subscriptions/${encodeURIComponent(suscripcion)}/cancel`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${acceso}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: motivo }),
    },
  );
  // PayPal contesta 204 sin cuerpo cuando la baja se hace.
  if (!r.ok) console.log('PayPal no cancelo:', r.status, await r.text());
  return r.ok;
}

export async function borraDerecho(usuarioId: string, competicion: string): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave) return false;

  const r = await fetch(
    `${url}/rest/v1/derechos?usuario_id=eq.${usuarioId}&competicion=eq.${competicion}`,
    { method: 'DELETE', headers: { apikey: clave, Authorization: `Bearer ${clave}` } },
  );
  return r.ok;
}
