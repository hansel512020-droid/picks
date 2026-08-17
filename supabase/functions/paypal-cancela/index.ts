/**
 * Da de baja la suscripción del usuario en PayPal.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 * En el perfil había un "Cancelar suscripción" que solo borraba un valor
 * guardado en el teléfono. PayPal seguía cobrando cada periodo, y el acceso
 * reaparecía en cuanto se volvía a leer la tabla. Una baja que no da de baja es
 * peor que no ofrecerla: el usuario cree que ha cancelado y le siguen cobrando.
 *
 * ── Qué se comprueba, y por qué así ──────────────────────────────────────
 * El navegador manda **solo su sesión**. No dice qué suscripción cancelar: si
 * lo hiciera, cambiar ese identificador por el de otro daría de baja la ajena.
 * El identificador se busca aquí, en `derechos`, partiendo del usuario que sale
 * de la sesión ya verificada.
 *
 * ── Qué NO hace ──────────────────────────────────────────────────────────
 * No retira el acceso. Lo pagado es suyo hasta que se acabe el periodo, y eso
 * ya lo dice la columna `caduca`. PayPal manda después
 * `BILLING.SUBSCRIPTION.CANCELLED` y el webhook se encarga del resto.
 *
 * ── Despliegue ───────────────────────────────────────────────────────────
 *   supabase functions deploy paypal-cancela --no-verify-jwt
 *
 * OJO: tras cada despliegue hay que comprobar que `PAYPAL_SECRET` sigue
 * puesto. Se ha visto quedar vacío justo después de desplegar, y entonces todo
 * lo que habla con PayPal falla con un 502 que no explica nada.
 */

import {
  RAIZ,
  borraDerecho,
  cancelaEnPaypal,
  derechosDe,
  tokenDePaypal,
} from '../_compartido/derechos.ts';

/**
 * En qué estado está una suscripción, según PayPal.
 *
 * Hace falta porque PayPal **solo** cancela las que están `ACTIVE` o
 * `SUSPENDED`. Con cualquier otro estado responde un `404 RESOURCE_NOT_FOUND`
 * —el mismo que daría si la suscripción no existiera— y eso llegaba al usuario
 * como "PayPal no pudo dar de baja la suscripción", que suena a avería y le
 * deja pensando que le van a seguir cobrando. Es justo lo contrario: una
 * suscripción que se quedó en `APPROVED` nunca llegó a activarse y no cobra
 * nada. Mirando el estado antes se puede decir eso con todas las letras.
 */
async function estadoDe(suscripcion: string): Promise<string | null> {
  const acceso = await tokenDePaypal();
  if (!acceso) return null;

  const r = await fetch(`${RAIZ}/v1/billing/subscriptions/${encodeURIComponent(suscripcion)}`, {
    headers: { Authorization: `Bearer ${acceso}` },
  });
  if (!r.ok) return null;
  return (await r.json())?.status ?? null;
}

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

  const filas = await derechosDe(usuarioId);
  const conCompra = filas.filter((f) => f.compra_id);
  console.log('cancelando para', usuarioId, '| suscripciones:', conCompra.length);

  if (!conCompra.length) {
    return responde({ error: 'No hay ninguna suscripción activa que cancelar' }, 404);
  }

  /*
   * Se recorren todas. Normalmente hay una sola, pero si alguien acabó con dos
   * —dos pagos seguidos antes de que la tabla se pusiera al día— cancelar solo
   * la primera dejaría la otra cobrando en silencio, que es justo el fallo que
   * esta función viene a quitar de en medio.
   */
  const fallidas: string[] = [];
  const sinCobro: string[] = [];
  let canceladas = 0;
  let yaParadas = 0;

  for (const f of conCompra) {
    const suscripcion = f.compra_id as string;
    const estado = await estadoDe(suscripcion);
    console.log('suscripcion', suscripcion, 'esta en', estado ?? '(desconocido)');

    /*
     * Solo se pide la baja de lo que puede seguir cobrando.
     *
     * Y ojo con la diferencia, que costó un acceso pagado: `APPROVED` y
     * `APPROVAL_PENDING` son suscripciones que se quedaron a medias y **nunca
     * cobraron** —ahí sí hay que retirar el acceso, porque no se pagó—. Pero
     * `CANCELLED` y `EXPIRED` son suscripciones que **sí llegaron a cobrar** y
     * después terminaron: ese acceso está pagado y se respeta hasta su fecha.
     *
     * Al principio se metían todas en el mismo saco, y bastaba con darle dos
     * veces a "cancelar" para perder el mes que acababas de pagar: la primera
     * la cancelaba de verdad, y la segunda la encontraba ya en `CANCELLED` y
     * la tomaba por una compra que nunca se cobró.
     */
    if (estado === 'APPROVED' || estado === 'APPROVAL_PENDING') {
      sinCobro.push(f.competicion);
      continue;
    }
    if (estado !== 'ACTIVE' && estado !== 'SUSPENDED') {
      // Ya estaba parada y sí cobró en su día: nada que cancelar, nada que
      // quitar. El acceso vence solo cuando le toque.
      yaParadas++;
      continue;
    }

    const ok = await cancelaEnPaypal(suscripcion, 'Baja pedida desde la app');
    console.log(ok ? 'CANCELADA' : 'FALLO al cancelar', suscripcion);
    if (ok) canceladas++;
    else fallidas.push(suscripcion);
  }

  if (fallidas.length) {
    return responde({ error: 'PayPal no pudo dar de baja la suscripción' }, 502);
  }

  /*
   * Nada que cancelar no es un fallo, pero tampoco se queda igual todo.
   *
   * El "mantienes el acceso hasta que acabe el periodo pagado" solo tiene
   * sentido si hubo pago. Una suscripción que se quedó en `APPROVED` nunca
   * cobró nada, así que no hay periodo pagado que respetar: dejar el plan
   * puesto sería regalarlo por un pago a medias. Y el usuario acaba de pedir
   * la baja, o sea que tampoco lo quiere.
   */
  if (!canceladas && sinCobro.length) {
    for (const competicion of sinCobro) {
      const quitado = await borraDerecho(usuarioId, competicion);
      console.log(quitado ? 'ACCESO RETIRADO' : 'FALLO al retirar acceso', competicion);
    }
    return responde({
      ok: true,
      canceladas: 0,
      aviso:
        'No tenías ningún cobro activo: esa suscripción nunca llegó a activarse en PayPal, así que se ha retirado el acceso.',
    });
  }

  // Ya estaba cancelada de antes. No se toca el acceso: se pagó por él y dura
  // hasta su fecha.
  if (!canceladas && yaParadas) {
    return responde({
      ok: true,
      canceladas: 0,
      aviso: 'Tu suscripción ya estaba cancelada. Mantienes el acceso hasta que acabe el periodo pagado.',
    });
  }

  // El acceso sigue vivo hasta `caduca`: se ha pagado por él.
  return responde({ ok: true, canceladas });
});
