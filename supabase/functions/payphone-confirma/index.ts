/**
 * Confirma un pago de Payphone y concede el acceso.
 *
 * ── Por qué se puede confiar en esto ────────────────────────────────────────
 *
 * El navegador solo manda dos identificadores, que por sí solos no valen nada.
 * Todo lo que decide si se concede algo se comprueba aquí:
 *
 *   1. Quién llama, contra su sesión de Supabase. No contra lo que él diga.
 *   2. Que ese pago existe y está aprobado, preguntándoselo a Payphone.
 *   3. Que la compra es suya, mirando la fila que se apuntó al crearla.
 *   4. Que se pagó lo que costaba, comparando centavos con centavos.
 *
 * El punto 4 parece redundante y no lo es: sin él, alguien podría pagar el
 * plan de 1,99 y confirmar con la referencia del de 99,99. Se compara lo que
 * Payphone dice que cobró con lo que la compra decía costar.
 *
 * Se despliega con --no-verify-jwt y la sesión se valida a mano, para poder
 * devolver un motivo claro en vez de un 401 pelado.
 */

import { caducaEn, escribeDerecho, retiraPlanAnterior } from '../_compartido/derechos.ts';
import { PLANES_PAYPHONE, confirmaEnPayphone } from '../_compartido/payphone.ts';

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

/** La compra que se apuntó al crear el enlace, leída con la clave de servicio. */
async function compraDe(referencia: string): Promise<Record<string, unknown> | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave) return null;

  const r = await fetch(
    `${url}/rest/v1/compras?referencia=eq.${encodeURIComponent(referencia)}&select=*`,
    { headers: { apikey: clave, Authorization: `Bearer ${clave}` } },
  );
  if (!r.ok) return null;
  const filas = await r.json();
  return filas?.[0] ?? null;
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

Deno.serve(async (peticion) => {
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const token = (peticion.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const usuarioId = await usuarioDeLaSesion(token);
    if (!usuarioId) return responde({ error: 'Sesión no válida' }, 401);

    const { id, referencia } = await peticion.json();
    if (!id || !referencia) return responde({ error: 'Faltan datos del pago' }, 400);

    const compra = await compraDe(String(referencia));
    if (!compra) return responde({ error: 'Esa compra no existe' }, 404);

    // Que sea suya. Sin esto, quien averigüe la referencia de otro se apunta
    // su compra.
    if (compra.usuario_id !== usuarioId) {
      console.log('referencia de otro usuario:', referencia);
      return responde({ error: 'Esa compra no es tuya' }, 403);
    }

    // Ya estaba concedida: se responde bien y no se toca nada. Volver a la
    // misma dirección dos veces no puede regalar un periodo extra.
    if (compra.estado === 'pagada') return responde({ ok: true, yaEstaba: true });

    const pago = await confirmaEnPayphone(id, String(referencia));
    if (!pago) {
      // No se pudo preguntar. NO se marca como rechazada: puede ser un fallo
      // nuestro y el usuario ha pagado. Se deja pendiente para reintentar.
      return responde({ error: 'No se pudo verificar el pago todavía' }, 202);
    }

    if (pago.estado !== 'Approved') {
      await cierraCompra(String(referencia), { estado: 'rechazada', payphone_id: String(id) });
      return responde({ error: `El pago no se completó (${pago.estado})` }, 402);
    }

    /*
     * Y que se pagara lo que costaba.
     *
     * Sin esta comprobación, alguien podría pagar el plan de 1,99 y confirmar
     * con la referencia del de 99,99: Payphone diría "aprobado" con toda la
     * razón, porque ese pago existe y es válido. Lo que no cuadra es el
     * importe, y eso solo lo sabemos nosotros.
     */
    if (pago.centavos !== compra.centavos) {
      console.log('importe distinto:', pago.centavos, 'esperado', compra.centavos);
      await cierraCompra(String(referencia), { estado: 'rechazada', payphone_id: String(id) });
      return responde({ error: 'El importe no coincide' }, 402);
    }

    const plan = PLANES_PAYPHONE[String(compra.plan)];
    if (!plan) return responde({ error: 'Plan desconocido' }, 400);

    const escrito = await escribeDerecho({
      usuario_id: usuarioId,
      competicion: plan.competicion,
      periodo: plan.periodo,
      caduca: caducaEn(plan.periodo),
      compra_id: String(referencia),
      // Cuántas ligas puede elegir, en los planes parciales. Lo pone el plan
      // que se cobró, nunca lo que pida el navegador.
      ...(plan.cuantas ? { huecos: plan.cuantas } : {}),
    });

    if (!escrito) return responde({ error: 'No se pudo activar el acceso' }, 500);

    // Si venía de otro plan, se retira el anterior para que no acumule.
    await retiraPlanAnterior(usuarioId, String(referencia));
    await cierraCompra(String(referencia), { estado: 'pagada', payphone_id: String(id) });

    return responde({ ok: true, periodo: plan.periodo, huecos: plan.cuantas ?? 0 });
  } catch (e) {
    console.log('error inesperado:', e);
    return responde({ error: 'Error inesperado' }, 500);
  }
});
