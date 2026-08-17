/**
 * Crea en PayPal el producto y los planes de suscripción de Golden Picks.
 *
 * Lo hace por API porque el panel de PayPal es un laberinto y aquí queda
 * escrito qué se creó exactamente: si mañana hay que rehacerlo en producción,
 * es el mismo comando con otras credenciales.
 *
 * ── Cómo se usa ──────────────────────────────────────────────────────────
 * Las credenciales se pasan por el entorno, NO se escriben en este archivo:
 * un secreto dentro del repositorio acaba subido a algún sitio tarde o
 * temprano.
 *
 *   Windows (PowerShell):
 *     $env:PAYPAL_CLIENT_ID="..."; $env:PAYPAL_SECRET="..."
 *     node scripts/planes-paypal.mjs
 *
 *   Para producción, añade:  $env:PAYPAL_ENTORNO="live"
 *
 * Al terminar imprime los `plan_id` de cada plan. Esos NO son secretos: son
 * los que hay que poner en la app para el botón de compra.
 */

const ENTORNO = process.env.PAYPAL_ENTORNO ?? 'sandbox';
const RAIZ =
  ENTORNO === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

const ID = process.env.PAYPAL_CLIENT_ID;
const SECRETO = process.env.PAYPAL_SECRET;

if (!ID || !SECRETO) {
  console.error('Faltan PAYPAL_CLIENT_ID y PAYPAL_SECRET en el entorno.');
  process.exit(1);
}

/** Los mismos nombres y precios que enseña la pantalla de Pro. */
const PLANES = [
  { nombre: 'Todas las ligas · Anual',   precio: '99.99', unidad: 'YEAR',  cada: 1 },
  { nombre: 'Todas las ligas · Mensual', precio: '22.99', unidad: 'MONTH', cada: 1 },
  { nombre: 'Todas las ligas · Semanal', precio: '7.99',  unidad: 'WEEK',  cada: 1 },
];

// Euros, como en la app. Cambia a 'USD' si decides cobrar en dólares.
const MONEDA = 'EUR';

async function token() {
  const r = await fetch(`${RAIZ}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${ID}:${SECRETO}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error(`No se pudo autenticar con PayPal (${r.status})`);
  return (await r.json()).access_token;
}

const cabeceras = (t) => ({
  Authorization: `Bearer ${t}`,
  'Content-Type': 'application/json',
});

async function creaProducto(t) {
  const r = await fetch(`${RAIZ}/v1/catalogs/products`, {
    method: 'POST',
    headers: cabeceras(t),
    body: JSON.stringify({
      name: 'Golden Picks',
      description: 'Análisis estadístico de fútbol: picks con ventaja, alineaciones y datos en vivo.',
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Producto: ${j.message ?? r.status}`);
  return j.id;
}

async function creaPlan(t, productoId, plan) {
  const r = await fetch(`${RAIZ}/v1/billing/plans`, {
    method: 'POST',
    headers: cabeceras(t),
    body: JSON.stringify({
      product_id: productoId,
      name: plan.nombre,
      status: 'ACTIVE',
      billing_cycles: [
        {
          frequency: { interval_unit: plan.unidad, interval_count: plan.cada },
          tenure_type: 'REGULAR',
          sequence: 1,
          // 0 = se renueva indefinidamente hasta que el usuario cancele.
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: plan.precio, currency_code: MONEDA },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        // Tres intentos antes de suspender: una tarjeta puede fallar un día
        // y no hay que echar al usuario por eso.
        payment_failure_threshold: 3,
      },
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Plan "${plan.nombre}": ${j.message ?? r.status}`);
  return j.id;
}

const t = await token();
console.log(`Entorno: ${ENTORNO}\n`);

const productoId = await creaProducto(t);
console.log(`Producto creado: ${productoId}\n`);

console.log('Planes creados — estos son los ids que hacen falta en la app:\n');
for (const plan of PLANES) {
  const id = await creaPlan(t, productoId, plan);
  console.log(`  ${plan.nombre.padEnd(30)} ${plan.precio} ${MONEDA}   ${id}`);
}
