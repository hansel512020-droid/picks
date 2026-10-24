/**
 * Abre un pago de Polar para el plan que el usuario ha elegido.
 *
 * Igual que con Payphone, esto vive en el servidor para que ni el precio ni el
 * token los toque el navegador: la app solo dice qué plan quiere, y el
 * producto —con su precio— sale de lo que hay dado de alta en Polar.
 *
 * Con un GET responde si el cobro con Polar está listo (token puesto y
 * productos creados). La app lo pregunta al abrir Pro y solo enseña el botón
 * si lo está: así, mientras no se configure, nadie se encuentra un botón que
 * falla.
 *
 * Se despliega con --no-verify-jwt y la sesión se valida a mano, para poder
 * devolver un motivo claro en vez de un 401 pelado.
 */

import {
  PLANES,
  POLAR,
  cabecerasPolar,
  guardaCompra,
  productosPorPlan,
  referenciaPolar,
  usuarioDeLaSesion,
} from '../_compartido/polar.ts';
import { retornoValido } from '../_compartido/retorno.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const responde = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

/**
 * La IP de quien paga.
 *
 * Polar decide el país —y con él los impuestos y el país que sale puesto en
 * el formulario— por la IP de quien abre el pago. Aquí quien lo abre es el
 * servidor de Supabase, así que sin pasarle la del usuario todos saldrían
 * como si estuvieran donde está el servidor.
 */
function ipDe(peticion: Request): string | null {
  const ip = (peticion.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}

Deno.serve(async (peticion) => {
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    if (peticion.method === 'GET') {
      const planes = cabecerasPolar() ? Object.keys(await productosPorPlan()) : [];
      return responde({ listo: planes.length > 0, planes });
    }

    const usuario = await usuarioDeLaSesion(peticion);
    if (!usuario) return responde({ error: 'Sesión no válida' }, 401);

    const { plan, vuelveA } = await peticion.json();
    const elegido = PLANES[String(plan)];
    if (!elegido) return responde({ error: 'Plan desconocido' }, 400);

    // La URL de retorno la elige el navegador: se comprueba que sea nuestra
    // antes de dársela a Polar (ver `retornoValido`).
    if (!retornoValido(vuelveA)) {
      console.log('RECHAZADO: URL de retorno ajena:', vuelveA);
      return responde({ error: 'URL de retorno no válida' }, 400);
    }

    const cabeceras = cabecerasPolar();
    if (!cabeceras) return responde({ error: 'Pagos no configurados' }, 503);

    const producto = (await productosPorPlan())[String(plan)];
    if (!producto) return responde({ error: 'Ese plan todavía no está a la venta con tarjeta' }, 503);

    const ip = ipDe(peticion);
    const pide = (conIp: boolean) =>
      fetch(`${POLAR}/v1/checkouts/`, {
        method: 'POST',
        headers: cabeceras,
        body: JSON.stringify({
          // Un solo producto: en la página de pago no se puede cambiar por otro.
          products: [producto],
          // A quién se le concede. Polar lo devuelve en cada aviso como
          // `customer.external_id`, y se comprueba antes de conceder.
          external_customer_id: usuario.id,
          ...(usuario.email ? { customer_email: usuario.email } : {}),
          metadata: { usuario_id: usuario.id, plan: String(plan) },
          // Sin códigos de descuento: el importe es el del plan y punto.
          allow_discount_codes: false,
          locale: 'es',
          // Polar cambia {CHECKOUT_ID} por el de esta sesión al volver.
          success_url: `${vuelveA}${String(vuelveA).includes('?') ? '&' : '?'}pago=polar&checkout_id={CHECKOUT_ID}`,
          // Un botón de "volver" en la página de pago, a donde estaba.
          return_url: vuelveA,
          ...(conIp && ip ? { customer_ip_address: ip } : {}),
        }),
      });

    let r = await pide(true);
    // Si Polar no acepta la IP (una interna, por ejemplo), se reintenta sin
    // ella: es una comodidad para el formulario, no algo de lo que dependa el
    // cobro.
    if (r.status === 422 && ip) {
      console.log('Polar no aceptó la sesión con IP, se reintenta sin ella:', await r.text());
      r = await pide(false);
    }
    if (!r.ok) {
      console.log('Polar no creó el pago:', r.status, await r.text());
      return responde({ error: 'No se pudo crear el pago' }, 502);
    }

    const sesion = await r.json();
    if (!sesion?.id || !sesion?.url) {
      console.log('Polar respondió sin id o sin url:', sesion);
      return responde({ error: 'No se pudo crear el pago' }, 502);
    }

    /*
     * Se apunta antes de devolver la dirección de pago. Es lo que permite
     * después saber de quién es y qué plan era —y que un mismo pago no se
     * conceda dos veces—. Si no se puede apuntar, no se manda a nadie a pagar.
     */
    const apuntada = await guardaCompra({
      referencia: referenciaPolar(sesion.id),
      usuario_id: usuario.id,
      plan: String(plan),
      centavos: elegido.centavos,
      estado: 'pendiente',
    });
    if (!apuntada) return responde({ error: 'No se pudo registrar la compra' }, 500);

    return responde({ checkout: sesion.id, url: sesion.url });
  } catch (e) {
    console.log('error inesperado:', e);
    return responde({ error: 'Error inesperado' }, 500);
  }
});
