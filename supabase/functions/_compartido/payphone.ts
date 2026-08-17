/**
 * Lo que comparten las dos funciones de Payphone.
 *
 * ── Cómo funciona un cobro aquí ─────────────────────────────────────────────
 *
 * 1. La app pide un enlace de pago. Lo crea el servidor, nunca el navegador:
 *    el token es secreto y quien decide el precio no puede ser el cliente.
 * 2. El usuario paga en Payphone y vuelve a la app con dos identificadores.
 * 3. El servidor le pregunta a Payphone si ese pago existe y está aprobado.
 * 4. Solo entonces se escribe el derecho.
 *
 * El paso 3 es el que sostiene todo. Sin él, cualquiera podría llamar a la
 * función de confirmación con un identificador inventado y quedarse el Pro
 * gratis. No nos fiamos de lo que diga el navegador: preguntamos a Payphone.
 *
 * Y no es opcional: si un pago no se confirma, Payphone lo cancela por su
 * cuenta. Confirmar es parte de cobrar.
 */

export const PAYPHONE = 'https://pay.payphonetodoesposible.com/api';

/**
 * Los planes que se pueden comprar, con su precio.
 *
 * El precio vive aquí, en el servidor, y no en la pantalla de la app. Si lo
 * mandara el navegador, cualquiera podría pedir el plan anual por un centavo
 * cambiando un número en la consola.
 *
 * En centavos porque es lo que pide Payphone: 1799 son 17,99 dólares.
 */
export const PLANES_PAYPHONE: Record<
  string,
  { centavos: number; competicion: string; periodo: string; cuantas?: number; nombre: string }
> = {
  semanal: { centavos: 599, competicion: 'todas', periodo: 'semanal', nombre: 'Golden Pro · Semanal' },
  mensual: { centavos: 1799, competicion: 'todas', periodo: 'mensual', nombre: 'Golden Pro · Mensual' },
  anual: { centavos: 9999, competicion: 'todas', periodo: 'anual', nombre: 'Golden Pro · Anual' },
  dosligas: { centavos: 199, competicion: 'elegidas', periodo: 'mensual', cuantas: 2, nombre: 'Golden Pro · 2 ligas' },
  tresligas: { centavos: 299, competicion: 'elegidas', periodo: 'mensual', cuantas: 3, nombre: 'Golden Pro · 3 ligas' },
};

/**
 * Referencia corta y única de la compra.
 *
 * Payphone solo admite quince caracteres, así que no cabe el identificador del
 * usuario. Se genera una referencia corta y la relación con quién compró qué
 * se guarda en nuestra tabla: Payphone solo necesita saber que es única.
 *
 * Sin guiones ni letras confusas: esta referencia acaba en el concepto de un
 * cobro y alguien puede tener que leerla por teléfono.
 */
export function referenciaNueva(): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let salida = 'GP';
  for (let i = 0; i < 10; i++) {
    salida += letras[Math.floor(Math.random() * letras.length)];
  }
  return salida;
}

/** Cabeceras para hablar con Payphone. El token nunca sale del servidor. */
export function cabecerasPayphone(): Record<string, string> | null {
  const token = Deno.env.get('PAYPHONE_TOKEN');
  if (!token) {
    console.log('Falta PAYPHONE_TOKEN en los secretos');
    return null;
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Le pregunta a Payphone por un pago concreto.
 *
 * Devuelve el estado tal cual lo cuenta Payphone, sin interpretarlo: quien
 * llame decide qué hacer. Un `null` significa que no se pudo preguntar, que no
 * es lo mismo que "el pago no vale" y no debe tratarse igual.
 */
export async function confirmaEnPayphone(
  id: string | number,
  clientTxId: string,
): Promise<{ estado: string; centavos: number; referencia: string } | null> {
  const cabeceras = cabecerasPayphone();
  if (!cabeceras) return null;

  const r = await fetch(`${PAYPHONE}/button/V2/Confirm`, {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify({ id: Number(id), clientTxId }),
  });

  if (!r.ok) {
    console.log('Payphone rechazó la confirmación:', r.status, await r.text());
    return null;
  }

  const datos = await r.json();
  return {
    // Payphone devuelve "Approved" cuando el cobro salió bien.
    estado: String(datos?.transactionStatus ?? datos?.statusCode ?? ''),
    centavos: Number(datos?.amount ?? 0),
    referencia: String(datos?.clientTransactionId ?? clientTxId),
  };
}
