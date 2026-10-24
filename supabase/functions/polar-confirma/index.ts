/**
 * Confirma un pago de Polar al volver a la app y concede el acceso.
 *
 * Es el camino rápido: el aviso de Polar (`polar-webhook`) también concede,
 * pero puede tardar unos segundos, y así los candados se abren nada más volver.
 *
 * ── Por qué se puede confiar en esto ────────────────────────────────────────
 *
 * El navegador solo manda el identificador de la sesión de pago, que por sí
 * solo no vale nada. Lo que decide se comprueba aquí:
 *
 *   1. Quién llama, contra su sesión de Supabase.
 *   2. Que la compra es suya, mirando la fila que se apuntó al crearla.
 *   3. Que está pagada, preguntándoselo a Polar.
 *   4. Que Polar la cobró a ese mismo usuario y para ese mismo plan.
 *
 * Se despliega con --no-verify-jwt y la sesión se valida a mano.
 */

import {
  POLAR,
  cabecerasPolar,
  cierraCompra,
  compraDe,
  concede,
  referenciaPolar,
  usuarioDeLaSesion,
} from '../_compartido/polar.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const responde = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (peticion) => {
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const usuario = await usuarioDeLaSesion(peticion);
    if (!usuario) return responde({ error: 'Sesión no válida' }, 401);

    const { checkout } = await peticion.json();
    // Solo letras, números y guiones: va dentro de una dirección de la API.
    if (typeof checkout !== 'string' || !/^[\w-]{8,64}$/.test(checkout)) {
      return responde({ error: 'Faltan datos del pago' }, 400);
    }

    const referencia = referenciaPolar(checkout);
    const compra = await compraDe(referencia);
    if (!compra) return responde({ error: 'Esa compra no existe' }, 404);

    // Que sea suya. Sin esto, quien averigüe el pago de otro se lo apunta.
    if (compra.usuario_id !== usuario.id) {
      console.log('pago de otro usuario:', referencia);
      return responde({ error: 'Esa compra no es tuya' }, 403);
    }

    // Ya concedida (por aquí o por el aviso): no se toca nada.
    if (compra.estado === 'pagada') return responde({ ok: true, yaEstaba: true, plan: compra.plan });
    if (compra.estado !== 'pendiente') {
      return responde({ error: `Esa compra está ${compra.estado}` }, 402);
    }

    const cabeceras = cabecerasPolar();
    if (!cabeceras) return responde({ error: 'Pagos no configurados' }, 503);

    const r = await fetch(`${POLAR}/v1/checkouts/${encodeURIComponent(checkout)}`, {
      headers: cabeceras,
    });
    if (!r.ok) {
      // No se pudo preguntar. NO se da por rechazada: puede ser un fallo nuestro
      // y el usuario ha pagado. El aviso de Polar la concederá igual.
      console.log('Polar no dio la sesión de pago:', r.status, await r.text());
      return responde({ error: 'No se pudo verificar el pago todavía' }, 202);
    }
    const sesion = await r.json();

    if (sesion.external_customer_id && sesion.external_customer_id !== usuario.id) {
      console.log('la sesión de Polar es de otro cliente:', checkout);
      return responde({ error: 'Esa compra no es tuya' }, 403);
    }
    if (sesion.metadata?.plan && sesion.metadata.plan !== compra.plan) {
      console.log('el plan de Polar no cuadra con la compra:', sesion.metadata.plan, compra.plan);
      return responde({ error: 'El plan no coincide' }, 400);
    }

    switch (sesion.status) {
      case 'succeeded':
        break;
      // Pagado y en proceso: falta un momento.
      case 'confirmed':
        return responde({ error: 'El pago se está procesando' }, 202);
      case 'expired':
      case 'failed':
        await cierraCompra(referencia, { estado: 'rechazada' });
        return responde({ error: 'El pago no se completó' }, 402);
      // Abierta: no ha pagado (todavía). No se cierra, puede seguir en otra pestaña.
      default:
        return responde({ error: 'El pago no se ha completado' }, 402);
    }

    if (!(await concede(compra))) return responde({ error: 'No se pudo activar el acceso' }, 500);
    return responde({ ok: true, plan: compra.plan });
  } catch (e) {
    console.log('error inesperado:', e);
    return responde({ error: 'Error inesperado' }, 500);
  }
});
