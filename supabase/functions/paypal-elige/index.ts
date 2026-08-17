/**
 * Guarda qué competiciones elige quien compró un plan parcial.
 *
 * ── Por qué existe ───────────────────────────────────────────────────────
 * Los planes de "2 ligas" y "3 ligas" no conceden competiciones al pagar:
 * conceden **huecos**. Aquí es donde esos huecos se convierten en accesos
 * concretos.
 *
 * Se separó del pago a propósito. La otra opción era mandar las ligas dentro
 * del `custom_id` de PayPal, pero ese lo escribe el navegador: quien pagara
 * dos podía mandar diez. Con este camino lo que se compra es un número —que lo
 * pone el servidor al cobrar— y la elección llega por una petición con sesión,
 * donde se puede comprobar quién es y a cuánto tiene derecho.
 *
 * ── Qué se comprueba ─────────────────────────────────────────────────────
 *   1. Quién llama, contra su sesión de Supabase.
 *   2. Que tiene un plan parcial vigente, y cuántos huecos le dio.
 *   3. Que no pide más ligas que huecos pagados.
 *
 * ── Despliegue ───────────────────────────────────────────────────────────
 *   supabase functions deploy paypal-elige --no-verify-jwt
 *
 * OJO: tras cada despliegue hay que reponer `PAYPAL_SECRET`, que se queda
 * vacío. No lo usa esta función, pero sí las otras dos.
 */

import { borraDerecho, derechosDe, escribeDerecho } from '../_compartido/derechos.ts';

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
  if (!usuarioId) return responde({ error: 'Sesión no válida' }, 401);

  const { competiciones } = await peticion.json().catch(() => ({}));
  if (!Array.isArray(competiciones)) {
    return responde({ error: 'Falta la lista de competiciones' }, 400);
  }

  // El plan parcial vigente y los huecos que dio. Se lee del servidor, no de
  // lo que diga el cliente.
  const filas = await derechosDe(usuarioId);
  const parcial = filas.find((f) => f.competicion === 'elegidas' && (f.huecos ?? 0) > 0);
  if (!parcial) {
    console.log('RECHAZADO: no tiene ningun plan de ligas a elegir');
    return responde({ error: 'No tienes ningún plan de ligas a elegir' }, 403);
  }

  /*
   * Solo se elige una vez por cobro.
   *
   * Dejar cambiarlas libremente parecía amable y era un agujero: eligiendo dos
   * ligas hoy y otras dos mañana se acaban viendo las treinta y seis por el
   * precio de dos. El plan sería el completo con pasos extra.
   *
   * Se compara contra el `compra_id` del plan: las ligas que se guardaron con
   * el cobro en curso ya son la elección de este periodo. Cuando PayPal cobre
   * la siguiente mensualidad, el webhook escribe un `compra_id` nuevo en la
   * fila del plan y el usuario vuelve a poder elegir.
   */
  const yaElegidas = filas.filter(
    (f) =>
      f.competicion !== 'elegidas' &&
      f.competicion !== 'todas' &&
      f.compra_id === parcial.compra_id,
  );
  if (yaElegidas.length) {
    console.log('RECHAZADO: ya eligió en este periodo:', yaElegidas.map((f) => f.competicion));
    return responde(
      {
        error: 'Ya has elegido tus ligas para este periodo. Podrás cambiarlas en la próxima renovación.',
        competiciones: yaElegidas.map((f) => f.competicion),
      },
      409,
    );
  }

  const huecos = parcial.huecos ?? 0;
  const pedidas = [
    ...new Set(
      competiciones
        .filter((c: unknown): c is string => typeof c === 'string')
        .map((c) => c.trim())
        // `todas` no se elige: eso es otro plan y cuesta otra cosa.
        .filter((c) => c && c !== 'todas' && c !== 'elegidas'),
    ),
  ];

  if (!pedidas.length) return responde({ error: 'No has elegido ninguna competición' }, 400);
  if (pedidas.length > huecos) {
    console.log('RECHAZADO: pide', pedidas.length, 'y solo pagó', huecos);
    return responde({ error: `Tu plan permite ${huecos} competiciones` }, 400);
  }

  /*
   * Se retiran las elegidas anteriormente antes de escribir las nuevas.
   *
   * Sin esto, cambiar de ligas sumaría en vez de sustituir: quien eligiera dos
   * un mes y otras dos al siguiente acabaría con cuatro por el precio de dos.
   * Las de "todas" no se tocan, que son de otro plan.
   */
  for (const f of filas) {
    if (f.competicion === 'todas' || f.competicion === 'elegidas') continue;
    if (!pedidas.includes(f.competicion)) await borraDerecho(usuarioId, f.competicion);
  }

  let escritas = 0;
  for (const competicion of pedidas) {
    const ok = await escribeDerecho({
      usuario_id: usuarioId,
      competicion,
      periodo: parcial.periodo,
      // La misma fecha que el plan que las paga: las ligas elegidas no duran
      // más que la suscripción de la que salen.
      caduca: parcial.caduca,
      compra_id: parcial.compra_id,
      cobro_fallido: false,
      cancelada: false,
    });
    console.log(ok ? 'ELEGIDA:' : 'FALLO al elegir:', competicion);
    if (ok) escritas++;
  }

  if (!escritas) return responde({ error: 'No se pudieron guardar tus ligas' }, 500);
  return responde({ ok: true, competiciones: pedidas, huecos });
});
