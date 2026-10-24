/**
 * Lo que comparten las funciones de Polar.
 *
 * Polar cobra con tarjeta desde cualquier país; Payphone se queda para
 * Ecuador. Los dos venden lo mismo y de la misma forma: **un pago único** por
 * el periodo elegido, sin renovación automática. Así el texto de la pantalla
 * de Pro ("no se renueva solo, no hay nada que cancelar") es verdad pague
 * por donde pague, y no hace falta gestionar bajas.
 *
 * ── Cómo va un cobro ────────────────────────────────────────────────────────
 *
 *   1. `polar-crea` abre una sesión de pago en Polar con el producto del plan
 *      y apunta la compra en `compras` ANTES de mandar a nadie a pagar.
 *   2. El usuario paga en Polar y vuelve a `/pro?pago=polar&checkout_id=…`.
 *   3. `polar-confirma` le pregunta a Polar por esa sesión y, si está pagada y
 *      es de quien llama, concede.
 *   4. `polar-webhook` recibe el aviso de Polar (firmado) y hace lo mismo. Es
 *      el respaldo para quien cierra la pestaña antes de volver, y el único
 *      camino por el que llega un reembolso.
 *
 * Los dos caminos de concesión miran la misma fila de `compras`: el primero
 * que llega la marca como pagada y el segundo ya no hace nada. Volver a la
 * misma dirección, o que Polar repita un aviso, no regala un periodo extra.
 *
 * ── Secretos (Supabase → Edge Functions → Secrets) ──────────────────────────
 *   POLAR_ACCESS_TOKEN     token de organización (polar_oat_…), con permisos
 *                          checkouts:read, checkouts:write y products:read
 *   POLAR_WEBHOOK_SECRET   el secreto del webhook que se crea en Polar
 *   POLAR_ENTORNO          "sandbox" para probar; sin poner, producción
 *
 * ── Versión de la API ───────────────────────────────────────────────────────
 *
 * No se fija la cabecera `Polar-Version`. Cada versión de Polar se retira a
 * los nueve meses y, fijada, esto dejaría de funcionar sin tocar nada el día
 * que la quiten. Sin fijar se usa la vigente, y aquí solo se leen campos
 * básicos (id, url, status, product_id, checkout_id, customer.external_id)
 * que no han cambiado entre versiones.
 */

import { PLANES_PAYPHONE } from './payphone.ts';
import { caducaEn, derechosDe, borraDerecho, escribeDerecho, retiraPlanAnterior } from './derechos.ts';

/** Los planes y su precio en centavos: el mismo catálogo que Payphone. */
export const PLANES = PLANES_PAYPHONE;

const RAICES = {
  sandbox: 'https://sandbox-api.polar.sh',
  produccion: 'https://api.polar.sh',
} as const;

export const POLAR =
  Deno.env.get('POLAR_ENTORNO')?.trim() === 'sandbox' ? RAICES.sandbox : RAICES.produccion;

/** Cabeceras para hablar con Polar. El token nunca sale del servidor. */
export function cabecerasPolar(): Record<string, string> | null {
  // .trim(): un salto de línea arrastrado al copiar el token lo invalida.
  const token = Deno.env.get('POLAR_ACCESS_TOKEN')?.trim();
  if (!token) {
    console.log('Falta POLAR_ACCESS_TOKEN en los secretos');
    return null;
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

/** La referencia con la que se apunta en `compras` una sesión de pago de Polar. */
export const referenciaPolar = (checkoutId: string) => `polar_${checkoutId}`;

/**
 * Qué producto de Polar corresponde a cada plan.
 *
 * Se busca por precio y no con una lista de identificadores pegada en un
 * secreto: así, para configurarlo, basta con crear en Polar los productos con
 * su precio, sin copiar cinco códigos largos a mano (y sin que un código mal
 * pegado venda el plan anual al precio del semanal). Los cinco precios son
 * distintos, así que cada uno señala un solo plan.
 *
 * Solo cuentan productos de pago único, en dólares y no archivados. Si dos
 * productos tienen el mismo precio no se elige ninguno: no hay forma de saber
 * cuál es el bueno, y vender el equivocado es peor que no vender.
 *
 * Se guarda cinco minutos para no preguntar en cada pago.
 */
let catalogo: { mapa: Record<string, string>; cuando: number } | null = null;

export async function productosPorPlan(): Promise<Record<string, string>> {
  if (catalogo && Date.now() - catalogo.cuando < 5 * 60_000) return catalogo.mapa;

  const cabeceras = cabecerasPolar();
  if (!cabeceras) return {};

  const r = await fetch(`${POLAR}/v1/products/?is_archived=false&is_recurring=false&limit=100`, {
    headers: cabeceras,
  });
  if (!r.ok) {
    console.log('Polar no dio los productos:', r.status, await r.text());
    return {};
  }

  const productos: {
    id: string;
    name?: string;
    is_archived?: boolean;
    prices?: { amount_type?: string; price_amount?: number; price_currency?: string; is_archived?: boolean }[];
  }[] = (await r.json())?.items ?? [];

  const candidatos: Record<string, string[]> = {};
  for (const p of productos) {
    if (p.is_archived) continue;
    for (const precio of p.prices ?? []) {
      if (precio.is_archived || precio.amount_type !== 'fixed') continue;
      if ((precio.price_currency ?? 'usd').toLowerCase() !== 'usd') continue;
      for (const [plan, datos] of Object.entries(PLANES)) {
        if (precio.price_amount === datos.centavos) (candidatos[plan] ??= []).push(p.id);
      }
    }
  }

  const mapa: Record<string, string> = {};
  for (const plan of Object.keys(PLANES)) {
    const ids = [...new Set(candidatos[plan] ?? [])];
    if (ids.length === 1) mapa[plan] = ids[0];
    else if (ids.length > 1) console.log(`Polar: ${ids.length} productos cuestan lo mismo que "${plan}"; no se vende hasta que quede uno`);
    else console.log(`Polar: no hay producto de pago único a ${PLANES[plan].centavos / 100} USD para "${plan}"`);
  }

  catalogo = { mapa, cuando: Date.now() };
  return mapa;
}

/** Quién llama de verdad, según su sesión. Nunca según lo que mande el cuerpo. */
export async function usuarioDeLaSesion(
  peticion: Request,
): Promise<{ id: string; email: string | null } | null> {
  const token = (peticion.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !token) return null;

  const r = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anon ?? '' },
  });
  if (!r.ok) return null;
  const usuario = await r.json();
  return usuario?.id ? { id: usuario.id, email: usuario.email ?? null } : null;
}

function claveServicio(): { url: string; clave: string } | null {
  const url = Deno.env.get('SUPABASE_URL');
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return url && clave ? { url, clave } : null;
}

/** Apunta la compra. Escribir en `compras` solo puede el servidor. */
export async function guardaCompra(fila: Record<string, unknown>): Promise<boolean> {
  const s = claveServicio();
  if (!s) return false;
  const r = await fetch(`${s.url}/rest/v1/compras`, {
    method: 'POST',
    headers: {
      apikey: s.clave,
      Authorization: `Bearer ${s.clave}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(fila),
  });
  if (!r.ok) console.log('no se pudo guardar la compra:', r.status, await r.text());
  return r.ok;
}

export async function compraDe(referencia: string): Promise<Record<string, unknown> | null> {
  const s = claveServicio();
  if (!s) return null;
  const r = await fetch(
    `${s.url}/rest/v1/compras?referencia=eq.${encodeURIComponent(referencia)}&select=*`,
    { headers: { apikey: s.clave, Authorization: `Bearer ${s.clave}` } },
  );
  if (!r.ok) return null;
  return (await r.json())?.[0] ?? null;
}

export async function cierraCompra(referencia: string, cambios: Record<string, unknown>): Promise<void> {
  const s = claveServicio();
  if (!s) return;
  await fetch(`${s.url}/rest/v1/compras?referencia=eq.${encodeURIComponent(referencia)}`, {
    method: 'PATCH',
    headers: {
      apikey: s.clave,
      Authorization: `Bearer ${s.clave}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ ...cambios, cerrado: new Date().toISOString() }),
  });
}

/**
 * Concede una compra ya verificada con Polar. Devuelve si quedó escrita.
 *
 * El plan sale de la fila de `compras`, que apuntó el servidor al crear el
 * cobro con el producto de ese plan; nunca de lo que diga el navegador.
 */
export async function concede(compra: Record<string, unknown>): Promise<boolean> {
  const plan = PLANES[String(compra.plan)];
  if (!plan) return false;

  const usuarioId = String(compra.usuario_id);
  const referencia = String(compra.referencia);
  const escrito = await escribeDerecho({
    usuario_id: usuarioId,
    competicion: plan.competicion,
    periodo: plan.periodo,
    caduca: caducaEn(plan.periodo),
    compra_id: referencia,
    // Cuántas ligas puede elegir, en los planes parciales. Lo pone el plan
    // que se cobró, nunca lo que pida el navegador.
    ...(plan.cuantas ? { huecos: plan.cuantas } : {}),
  });
  if (!escrito) return false;

  // Si venía de otro plan, se retira el anterior para que no acumule.
  await retiraPlanAnterior(usuarioId, referencia);
  await cierraCompra(referencia, { estado: 'pagada' });
  return true;
}

/**
 * Quita el acceso de una compra devuelta.
 *
 * Solo las filas que salieron de esa compra: si el usuario ya se había pasado
 * a otro plan, ese no se toca. En los planes parciales son varias filas, una
 * por liga elegida, y todas llevan el mismo `compra_id`.
 */
export async function retira(compra: Record<string, unknown>): Promise<void> {
  const usuarioId = String(compra.usuario_id);
  const referencia = String(compra.referencia);
  for (const f of await derechosDe(usuarioId)) {
    if (f.compra_id !== referencia) continue;
    const quitado = await borraDerecho(usuarioId, f.competicion);
    console.log(quitado ? 'retirado por reembolso:' : 'FALLO al retirar por reembolso:', f.competicion);
  }
  await cierraCompra(referencia, { estado: 'devuelta' });
}

// ── Firma de los avisos ─────────────────────────────────────────────────────

const texto = new TextEncoder();

function deBase64(b64: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function aBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** Comparación en tiempo constante: no deja adivinar la firma por lo que tarda. */
function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let distinto = 0;
  for (let i = 0; i < a.length; i++) distinto |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return distinto === 0;
}

async function hmac(clave: Uint8Array, contenido: string): Promise<string> {
  // Copia en un ArrayBuffer propio: es lo que WebCrypto acepta como clave.
  const k = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(clave),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return aBase64(new Uint8Array(await crypto.subtle.sign('HMAC', k, texto.encode(contenido))));
}

/**
 * Que el aviso lo mande Polar y no cualquiera que conozca la dirección.
 *
 * Sin esto, bastaría con mandar a esta función un "order.paid" inventado para
 * darse el Pro. Polar firma cada aviso según el estándar Standard Webhooks:
 * HMAC-SHA256 de `id.timestamp.cuerpo`, en la cabecera `webhook-signature`
 * como "v1,<firma en base64>".
 *
 * La clave depende de cuándo se creó el secreto, y se prueban las dos, igual
 * que hacen las librerías de Polar:
 *   · los creados desde septiembre de 2026 son `whsec_<base64>`: la clave son
 *     los bytes de ese base64;
 *   · los anteriores se usaban tal cual: la clave es el texto entero.
 *
 * Y se rechaza un aviso de hace más de cinco minutos, para que uno auténtico
 * capturado por el camino no se pueda volver a mandar más tarde.
 */
export async function firmaValida(cuerpo: string, cabeceras: Headers): Promise<boolean> {
  const secreto = Deno.env.get('POLAR_WEBHOOK_SECRET')?.trim();
  const id = cabeceras.get('webhook-id');
  const momento = cabeceras.get('webhook-timestamp');
  const firma = cabeceras.get('webhook-signature');
  if (!secreto) {
    console.log('Falta POLAR_WEBHOOK_SECRET en los secretos');
    return false;
  }
  if (!id || !momento || !firma) return false;

  const segundos = Number(momento);
  if (!Number.isFinite(segundos) || Math.abs(Date.now() / 1000 - segundos) > 5 * 60) return false;

  const claves: Uint8Array[] = [];
  if (secreto.startsWith('whsec_')) {
    const k = deBase64(secreto.slice('whsec_'.length));
    if (k?.length) claves.push(k);
  }
  claves.push(texto.encode(secreto));

  const recibidas = firma
    .split(' ')
    .map((parte) => parte.split(','))
    .filter(([version, valor]) => version === 'v1' && !!valor)
    .map(([, valor]) => valor);

  const contenido = `${id}.${momento}.${cuerpo}`;
  for (const clave of claves) {
    const esperada = await hmac(clave, contenido);
    if (recibidas.some((r) => iguales(r, esperada))) return true;
  }
  return false;
}
