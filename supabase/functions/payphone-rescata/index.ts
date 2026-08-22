/**
 * Respaldo de los pagos de Payphone.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 *
 * El camino normal es que, al volver de Payphone, la app confirme el pago y se
 * conceda el acceso al instante. Pero esa vuelta puede fallar: el usuario cierra
 * la pestaña antes de tiempo, la sesión no se restaura, se va la red. Entonces
 * el pago queda cobrado y sin conceder, y sin esto no habría forma automática de
 * arreglarlo —con PayPal lo recogía el webhook; aquí lo recoge esta función—.
 *
 * ── Cómo ────────────────────────────────────────────────────────────────────
 *
 * Mira las compras que quedaron "pendiente" de quien llama y le pregunta a
 * Payphone por cada una POR NUESTRA REFERENCIA (no hace falta el id de la
 * vuelta, que es justo el dato que se pierde cuando la vuelta falla). Si el pago
 * está aprobado y el importe cuadra, concede; si Payphone lo dio por rechazado,
 * lo cierra. La comprobación es la misma que en el camino normal: no se fía de
 * nada que venga del navegador.
 *
 * Se despliega con --no-verify-jwt y la sesión se valida a mano.
 */

import { caducaEn, escribeDerecho, retiraPlanAnterior } from '../_compartido/derechos.ts';
import { PLANES_PAYPHONE, confirmaEnPayphone, consultaPorReferencia } from '../_compartido/payphone.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const responde = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

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

/** Las compras que quedaron a medias de un usuario, con la clave de servicio. */
async function comprasPendientes(usuarioId: string): Promise<Record<string, unknown>[]> {
  const url = Deno.env.get('SUPABASE_URL');
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave) return [];

  const r = await fetch(
    `${url}/rest/v1/compras?usuario_id=eq.${usuarioId}&estado=eq.pendiente&select=*`,
    { headers: { apikey: clave, Authorization: `Bearer ${clave}` } },
  );
  if (!r.ok) {
    console.log('no se pudieron leer las compras pendientes:', r.status, await r.text());
    return [];
  }
  return await r.json();
}

async function cierraCompra(referencia: string, cambios: Record<string, unknown>): Promise<void> {
  const url = Deno.env.get('SUPABASE_URL');
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave) return;
  await fetch(`${url}/rest/v1/compras?referencia=eq.${encodeURIComponent(referencia)}`, {
    method: 'PATCH',
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ ...cambios, cerrado: new Date().toISOString() }),
  });
}

/** Concede una compra ya verificada. Devuelve si se escribió el derecho. */
async function concede(
  usuarioId: string,
  compra: Record<string, unknown>,
  transactionId: string,
): Promise<boolean> {
  const plan = PLANES_PAYPHONE[String(compra.plan)];
  if (!plan) return false;

  const referencia = String(compra.referencia);
  const escrito = await escribeDerecho({
    usuario_id: usuarioId,
    competicion: plan.competicion,
    periodo: plan.periodo,
    caduca: caducaEn(plan.periodo),
    compra_id: referencia,
    ...(plan.cuantas ? { huecos: plan.cuantas } : {}),
  });
  if (!escrito) return false;

  await retiraPlanAnterior(usuarioId, referencia);
  await cierraCompra(referencia, { estado: 'pagada', payphone_id: transactionId });
  return true;
}

Deno.serve(async (peticion) => {
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const token = (peticion.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const usuarioId = await usuarioDeLaSesion(token);
    if (!usuarioId) return responde({ error: 'Sesión no válida' }, 401);

    const pendientes = await comprasPendientes(usuarioId);
    let concedidos = 0;

    for (const compra of pendientes) {
      const referencia = String(compra.referencia);

      // Se le pregunta a Payphone por nuestra referencia: de ahí sale el id.
      const cons = await consultaPorReferencia(referencia);
      // Sin transacción (abandonada) o no se pudo consultar: se deja como está.
      if (!cons || !cons.transactionId) continue;

      // Payphone la dio por rechazada: se cierra y no se concede nada.
      if (cons.statusCode === 2) {
        await cierraCompra(referencia, { estado: 'rechazada', payphone_id: cons.transactionId });
        continue;
      }

      /*
       * Con el id ya se confirma como en el camino normal —capturar y verificar
       * en el mismo paso—, sin fiarse del `statusCode` de la consulta: manda lo
       * que diga el Confirm.
       */
      const pago = await confirmaEnPayphone(cons.transactionId, referencia);
      if (!pago || pago.estado !== 'Approved') continue;

      // Y que se pagara lo que costaba, igual que en payphone-confirma.
      if (pago.centavos !== Number(compra.centavos)) {
        console.log('rescate: importe distinto', pago.centavos, 'esperado', compra.centavos);
        await cierraCompra(referencia, { estado: 'rechazada', payphone_id: cons.transactionId });
        continue;
      }

      if (await concede(usuarioId, compra, cons.transactionId)) concedidos++;
    }

    return responde({ ok: true, concedidos });
  } catch (e) {
    console.log('error inesperado en rescate:', e);
    return responde({ error: 'Error inesperado' }, 500);
  }
});
