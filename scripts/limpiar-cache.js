#!/usr/bin/env node
'use strict';
/**
 * Poda la cache de descargas (.cache-datos) para que no crezca sin fin.
 *
 * Uso:
 *   node scripts/limpiar-cache.js            (como mucho una vez por semana)
 *   node scripts/limpiar-cache.js --ya       (ahora, aunque no toque)
 *   node scripts/limpiar-cache.js --simular  (dice lo que borraria, sin borrar)
 *
 * ── Por qué ────────────────────────────────────────────────────────────────
 *
 * En septiembre de 2026 la cache llego a pesar 8 GB en el PC. La mayor parte
 * eran calendarios de ESPN pedidos por rango de fechas: el rango empezaba
 * "hace 1150 dias", asi que la direccion cambiaba cada dia, cada pasada
 * guardaba un archivo nuevo de medio mega por tramo y liga, y los de dias
 * anteriores no se volvian a leer nunca. ESPN ya se pide por años (espn.js) y
 * eso no se repite, pero los que quedaron hay que quitarlos.
 *
 * ── Qué borra ──────────────────────────────────────────────────────────────
 *
 *  · Los calendarios por rango de ESPN: ya no se piden de esa forma.
 *  · Cualquier descarga de hace mas de 180 dias. Un acta que el importador
 *    todavia necesite se vuelve a bajar sola; con medio año de margen eso casi
 *    no pasa, porque solo se piden los ultimos 90 partidos de cada liga.
 *
 * Todo lo que hay aqui se puede volver a descargar: es cache, no datos.
 */

const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.resolve(__dirname, '..');
const CACHE = path.join(RAIZ, '.cache-datos');
const MARCA = path.join(CACHE, 'ultima-limpieza.txt');
const DIAS = 180;
const SEMANA = 7 * 86400000;
const OBSOLETA = /scoreboard\?dates=\d{8}-\d{8}/;

const simular = process.argv.includes('--simular');
const ya = simular || process.argv.includes('--ya');

function main() {
  if (!fs.existsSync(CACHE)) return;
  if (!ya && fs.existsSync(MARCA) && Date.now() - fs.statSync(MARCA).mtimeMs < SEMANA) {
    console.log('Limpieza de cache: ya se hizo esta semana.');
    return;
  }

  const limite = Date.now() - DIAS * 86400000;
  let archivos = 0;
  let bytes = 0;
  const borra = (ruta) => {
    try {
      const tam = fs.statSync(ruta).size;
      if (!simular) fs.unlinkSync(ruta);
      archivos++;
      bytes += tam;
    } catch {
      /* ya no estaba */
    }
  };

  const recorre = (dir) => {
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const ruta = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        recorre(ruta);
        continue;
      }

      // SofaScore guarda la respuesta tal cual, sin metadatos: vale la fecha del archivo.
      if (path.basename(dir) === 'sofascore') {
        if (entrada.name.endsWith('.json') && fs.statSync(ruta).mtimeMs < limite) borra(ruta);
        continue;
      }

      // http.js guarda cada descarga en dos: el cuerpo (.txt) y sus datos (.json).
      if (!entrada.name.endsWith('.txt')) continue;
      const rutaMeta = ruta.replace(/\.txt$/, '.json');
      if (!fs.existsSync(rutaMeta)) continue;
      let meta = {};
      try {
        meta = JSON.parse(fs.readFileSync(rutaMeta, 'utf8'));
      } catch {
        /* metadatos rotos: se juzga por la fecha del archivo */
      }
      const bajado = Date.parse(meta.bajadoEn) || fs.statSync(ruta).mtimeMs;
      if (OBSOLETA.test(meta.url ?? '') || bajado < limite) {
        borra(ruta);
        borra(rutaMeta);
      }
    }
  };

  recorre(CACHE);
  if (!simular) fs.writeFileSync(MARCA, new Date().toISOString());

  const gb = (bytes / 1024 ** 3).toFixed(2);
  console.log(
    simular
      ? `Limpieza de cache (simulada): se borrarian ${archivos} archivos · ${gb} GB`
      : `Limpieza de cache: ${archivos} archivos borrados · ${gb} GB liberados`,
  );
}

try {
  main();
} catch (e) {
  // Que falle la limpieza no debe marcar como rota la pasada del refresco.
  console.error(`Limpieza de cache: error inesperado: ${e.message}`);
}
