/**
 * Crea un enlace de pago de Payphone para el plan que el usuario ha elegido.
 *
 * ── Por qué esto vive en el servidor ────────────────────────────────────────
 *
 * Podría hacerlo la app y ahorrarse un viaje, pero entonces el precio lo
 * pondría el navegador. Cualquiera abriría la consola, cambiaría 1799 por 1 y
 * se llevaría el plan anual por un centavo. Aquí el precio sale de un catálogo
 * del servidor y lo único que manda la app es qué plan quiere.
 *
 * Y el token de Payphone tampoco puede salir de aquí: con él se pueden crear
 * cobros a nombre del negocio.
 *
 * Se despliega con --no-verify-jwt y la sesión se valida a mano, para poder
 * devolver un motivo claro en vez de un 401 pelado.
 */

import {
  PAYPHONE,
  PLANES_PAYPHONE,
  cabecerasPayphone,
  referenciaNueva,
} from '../_compartido/payphone.ts';

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
  const usuario = await r.json();
  return usuario?.id ?? null;
}

/** Apunta la compra antes de mandar a nadie a pagar. */
async function guardaCompra(fila: Record<string, unknown>): Promise<boolean> {
  const url = Deno.env.get('SUPABASE_URL');
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave) return false;

  const r = await fetch(`${url}/rest/v1/compras`, {
    method: 'POST',
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(fila),
  });
  if (!r.ok) console.log('no se pudo guardar la compra:', r.status, await r.text());
  return r.ok;
}

Deno.serve(async (peticion) => {
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const token = (peticion.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const usuarioId = await usuarioDeLaSesion(token);
    if (!usuarioId) return responde({ error: 'Sesión no válida' }, 401);

    const { plan, vuelveA } = await peticion.json();
    const elegido = PLANES_PAYPHONE[String(plan)];
    if (!elegido) return responde({ error: 'Plan desconocido' }, 400);

    const cabeceras = cabecerasPayphone();
    // .trim() por lo mismo que el token: un salto de línea pegado al copiarlo
    // haría que la tienda "no exista" para Payphone.
    const storeId = Deno.env.get('PAYPHONE_STORE_ID')?.trim();
    if (!cabeceras || !storeId) {
      console.log('Faltan PAYPHONE_TOKEN o PAYPHONE_STORE_ID');
      return responde({ error: 'Pagos no configurados' }, 503);
    }

    const referencia = referenciaNueva();

    /*
     * Se apunta la compra ANTES de mandar a nadie a pagar.
     *
     * Si se apuntara después, un usuario que paga y cierra el navegador antes
     * de volver dejaría un cobro del que no hay rastro: dinero cobrado sin
     * saber de quién ni por qué. Así, pase lo que pase, la fila existe y se
     * puede cerrar a mano.
     */
    const apuntada = await guardaCompra({
      referencia,
      usuario_id: usuarioId,
      plan: String(plan),
      centavos: elegido.centavos,
      estado: 'pendiente',
    });
    if (!apuntada) return responde({ error: 'No se pudo registrar la compra' }, 500);

    const r = await fetch(`${PAYPHONE}/button/Prepare`, {
      method: 'POST',
      headers: cabeceras,
      body: JSON.stringify({
        amount: elegido.centavos,
        // Sin desglose de impuestos: es un servicio digital y el total va
        // entero sin IVA discriminado. Payphone exige que las partes sumen el
        // total, así que se manda el total como base y el resto a cero.
        amountWithoutTax: elegido.centavos,
        amountWithTax: 0,
        tax: 0,
        service: 0,
        tip: 0,
        currency: 'USD',
        clientTransactionId: referencia,
        // Solo ASCII: el "·" del nombre ("Golden Pro · Semanal") y cualquier
        // acento podrían atragantar al servidor de Payphone. El concepto se lee
        // igual sin ellos.
        reference: elegido.nombre.replace(/[^\x20-\x7E]/g, '-'),
        storeId,
        // A dónde vuelve el usuario después de pagar. Lo manda la app porque
        // el dominio puede cambiar, pero se comprueba que sea nuestro.
        responseUrl: vuelveA,
        // Payphone exige una URL de cancelación. Sin ella rechaza el pago con
        // un 400 antes de crearlo. Se vuelve a la misma pantalla de Pro: si el
        // usuario cancela, se encuentra donde estaba y puede reintentar.
        cancellationUrl: vuelveA,
      }),
    });

    if (!r.ok) {
      const detalle = await r.text();
      console.log('Payphone no creó el pago:', r.status, detalle);
      return responde({ error: 'No se pudo crear el pago' }, 502);
    }

    const datos = await r.json();
    return responde({ referencia, url: datos?.payWithPayPhone ?? datos?.payWithCard ?? datos });
  } catch (e) {
    console.log('error inesperado:', e);
    return responde({ error: 'Error inesperado' }, 500);
  }
});
