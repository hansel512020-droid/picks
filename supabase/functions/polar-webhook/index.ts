/**
 * Avisos de Polar → tabla `derechos`.
 *
 * Polar avisa aquí cuando un pago se cobra y cuando se devuelve. Es el
 * respaldo de `polar-confirma`: concede aunque el usuario cierre la pestaña
 * antes de volver a la app, y es el único camino por el que un reembolso le
 * quita el acceso.
 *
 *   order.paid       → concede el plan de esa compra
 *   order.refunded   → si se devolvió entero, quita lo que dio esa compra
 *
 * Se despliega con --no-verify-jwt porque quien llama es Polar, no un usuario
 * con sesión; la autenticidad se comprueba con la firma (`firmaValida`).
 *
 * Responde 202 a todo lo que ya está atendido o no le toca, para que Polar no
 * lo reintente. Solo devuelve un error cuando algo nuestro falló y conviene
 * que Polar lo vuelva a mandar.
 */

import { compraDe, concede, firmaValida, referenciaPolar, retira } from '../_compartido/polar.ts';

const vale = () => new Response(null, { status: 202 });

Deno.serve(async (peticion) => {
  if (peticion.method !== 'POST') return new Response(null, { status: 405 });

  try {
    // El cuerpo tal cual llega: la firma es sobre estos bytes, no sobre el JSON.
    const cuerpo = await peticion.text();
    if (!(await firmaValida(cuerpo, peticion.headers))) {
      console.log('RECHAZADO: aviso sin firma válida de Polar');
      return new Response(null, { status: 403 });
    }

    const aviso = JSON.parse(cuerpo);
    const orden = aviso?.data ?? {};
    if (aviso?.type !== 'order.paid' && aviso?.type !== 'order.refunded') return vale();

    /*
     * La compra se encuentra por la sesión de pago que la creó. Un pedido sin
     * sesión, o con una que no apuntamos, no salió de la app (un enlace de
     * pago hecho a mano en el panel de Polar, por ejemplo): no hay a quién
     * dárselo, y se deja escrito para poder resolverlo a mano.
     */
    const compra = orden.checkout_id ? await compraDe(referenciaPolar(String(orden.checkout_id))) : null;
    if (!compra) {
      console.log(aviso.type, 'sin compra en la app | pedido:', orden.id, '| sesión:', orden.checkout_id);
      return vale();
    }

    // Que Polar se lo cobrara a quien apuntamos al crear el pago.
    const cliente = orden.customer?.external_id;
    if (cliente && cliente !== compra.usuario_id) {
      console.log('RECHAZADO: el cliente de Polar no es el de la compra | pedido:', orden.id);
      return vale();
    }

    if (aviso.type === 'order.paid') {
      if (compra.estado !== 'pendiente') return vale();
      if (orden.paid === false) return vale();
      // Si no se pudo escribir, que Polar lo reintente.
      if (!(await concede(compra))) return new Response(null, { status: 500 });
      console.log('concedido por aviso de Polar:', compra.plan, '| pedido:', orden.id);
      return vale();
    }

    // order.refunded. Un reembolso parcial (una compensación) no quita el plan.
    if (orden.status !== 'refunded') {
      console.log('reembolso parcial, se mantiene el acceso | pedido:', orden.id);
      return vale();
    }
    if (compra.estado === 'devuelta') return vale();
    await retira(compra);
    console.log('acceso retirado por reembolso | pedido:', orden.id);
    return vale();
  } catch (e) {
    console.log('error inesperado en el aviso de Polar:', e);
    return new Response(null, { status: 500 });
  }
});
