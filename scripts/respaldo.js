#!/usr/bin/env node
'use strict';
/**
 * Copia de seguridad de lo que no se puede volver a generar.
 *
 * ── Qué se guarda y qué no ──────────────────────────────────────────────────
 *
 * Los picks, los partidos y las estadísticas NO se copian: se vuelven a bajar
 * de ESPN cuando haga falta. Lo que no se puede recuperar de ningún sitio es lo
 * que han hecho las personas —quién ha pagado, hasta cuándo tiene acceso, qué
 * compró y qué guardó—, y eso es lo que hay aquí.
 *
 * Son pocos datos, así que la copia pesa muy poco y se puede hacer a diario.
 *
 * ── Por qué hace falta ──────────────────────────────────────────────────────
 *
 * El plan gratuito de Supabase no hace copias. Si una fila se borra por error
 * —o alguien la borra— no hay a dónde volver, y estaríamos hablando de accesos
 * que la gente ha pagado. Con esto, en el peor caso se restaura a mano.
 *
 * Uso:
 *   node scripts/respaldo.js
 *
 * Necesita una clave con permiso de lectura completa, en el entorno o en
 * .env.local (que está fuera del repositorio):
 *   SUPABASE_SECRET_KEY=sb_secret_...
 *
 * Sin clave no falla: avisa y sale bien, para no romper el refresco automático.
 */

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const DESTINO = path.join(RAIZ, 'respaldos');
/** Cuántas copias se conservan. Una al día durante un mes largo. */
const CUANTAS = 40;

/*
 * Las tablas con datos de personas. `guardados` va aunque sea reconstruible en
 * parte: es el contador de la comunidad y perderlo se vería en toda la app.
 */
const TABLAS = ['derechos', 'compras', 'picks_usuario', 'guardados'];

function deEnv(clave) {
  if (process.env[clave]) return process.env[clave];
  for (const archivo of ['.env.local', '.env']) {
    const ruta = path.join(RAIZ, archivo);
    if (!fs.existsSync(ruta)) continue;
    const linea = fs
      .readFileSync(ruta, 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${clave}=`));
    if (linea) return linea.split('=').slice(1).join('=').trim();
  }
  return null;
}

async function bajaTabla(url, clave, tabla) {
  /*
   * De mil en mil. PostgREST corta a mil filas por defecto y devolvería una
   * copia incompleta sin decir nada: el peor tipo de fallo en un respaldo.
   */
  const filas = [];
  const TAMANO = 1000;
  for (let desde = 0; ; desde += TAMANO) {
    const r = await fetch(`${url}/rest/v1/${tabla}?select=*`, {
      headers: {
        apikey: clave,
        Authorization: `Bearer ${clave}`,
        Range: `${desde}-${desde + TAMANO - 1}`,
      },
    });
    if (!r.ok) throw new Error(`${tabla}: ${r.status} ${(await r.text()).slice(0, 120)}`);
    const trozo = await r.json();
    filas.push(...trozo);
    if (trozo.length < TAMANO) break;
  }
  return filas;
}

/** Borra las copias más viejas para que la carpeta no crezca sin fin. */
function limpiaViejas() {
  const copias = fs
    .readdirSync(DESTINO)
    .filter((n) => /^respaldo-.*\.json$/.test(n))
    .sort();
  for (const vieja of copias.slice(0, Math.max(0, copias.length - CUANTAS))) {
    fs.unlinkSync(path.join(DESTINO, vieja));
  }
}

async function main() {
  const url = deEnv('EXPO_PUBLIC_SUPABASE_URL')?.replace(/\/+$/, '');
  const clave = deEnv('SUPABASE_SECRET_KEY') ?? deEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!url) {
    console.log('Respaldo: falta EXPO_PUBLIC_SUPABASE_URL. No se hace copia.');
    return;
  }
  if (!clave) {
    console.log(
      'Respaldo: sin SUPABASE_SECRET_KEY no se puede leer todo. No se hace copia.\n' +
      '  Ponla en .env.local (la clave sb_secret_ del panel de Supabase).',
    );
    return;
  }

  const copia = { fecha: new Date().toISOString(), tablas: {} };
  for (const tabla of TABLAS) {
    try {
      copia.tablas[tabla] = await bajaTabla(url, clave, tabla);
      console.log(`  ${tabla}: ${copia.tablas[tabla].length} filas`);
    } catch (e) {
      /*
       * Una tabla que falla no tira la copia entera: se apunta el fallo dentro
       * del archivo. Una copia con tres tablas de cuatro sigue valiendo, y el
       * hueco queda a la vista en vez de pasar por una tabla vacía.
       */
      copia.tablas[tabla] = { error: e.message };
      console.log(`  ${tabla}: FALLÓ (${e.message})`);
    }
  }

  fs.mkdirSync(DESTINO, { recursive: true });
  const nombre = `respaldo-${copia.fecha.slice(0, 10)}.json`;
  fs.writeFileSync(path.join(DESTINO, nombre), JSON.stringify(copia, null, 1));
  limpiaViejas();

  const peso = (fs.statSync(path.join(DESTINO, nombre)).size / 1024).toFixed(1);
  console.log(`Respaldo guardado en respaldos/${nombre} · ${peso} kB`);
}

main()
  .then(() => process.stdout.write('', () => process.exit(0)))
  .catch((e) => {
    console.error(`Respaldo: error inesperado: ${e.message}`);
    // Sale bien a propósito: que falle la copia no debe marcar como rota la
    // pasada del refresco, que es lo que de verdad mantiene la app viva.
    process.stdout.write('', () => process.exit(0));
  });
