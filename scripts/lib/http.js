'use strict';
/**
 * Descargas con cache en disco. Football-Data republica sus CSV al terminar
 * cada jornada, asi que se guarda el ETag y en la siguiente importacion solo
 * baja lo que ha cambiado.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function aseguraDirectorio(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function nombreCache(url) {
  return crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
}

/**
 * Descarga texto con cache condicional.
 * @returns {Promise<{texto: string, delCache: boolean}>}
 */
async function bajaTexto(url, dirCache, { forzar = false, cabeceras = {} } = {}) {
  aseguraDirectorio(dirCache);
  const base = path.join(dirCache, nombreCache(url));
  const rutaCuerpo = `${base}.txt`;
  const rutaMeta = `${base}.json`;

  let meta = {};
  if (!forzar && fs.existsSync(rutaMeta)) {
    try {
      meta = JSON.parse(fs.readFileSync(rutaMeta, 'utf8'));
    } catch {
      meta = {};
    }
  }

  const cabecerasFinales = { 'user-agent': 'scout-picks/1.0 (importador)', ...cabeceras };
  if (meta.etag) cabecerasFinales['if-none-match'] = meta.etag;
  if (meta.modificado) cabecerasFinales['if-modified-since'] = meta.modificado;

  let respuesta;
  try {
    respuesta = await fetch(url, { headers: cabecerasFinales });
  } catch (e) {
    // Sin conexion: si hay copia en disco se sigue con ella.
    if (fs.existsSync(rutaCuerpo)) {
      return { texto: fs.readFileSync(rutaCuerpo, 'utf8'), delCache: true };
    }
    throw new Error(`No se pudo descargar ${url}: ${e.message}`);
  }

  if (respuesta.status === 304 && fs.existsSync(rutaCuerpo)) {
    return { texto: fs.readFileSync(rutaCuerpo, 'utf8'), delCache: true };
  }
  if (!respuesta.ok) {
    if (fs.existsSync(rutaCuerpo)) {
      return { texto: fs.readFileSync(rutaCuerpo, 'utf8'), delCache: true };
    }
    throw new Error(`${respuesta.status} ${respuesta.statusText} en ${url}`);
  }

  const texto = await respuesta.text();
  fs.writeFileSync(rutaCuerpo, texto);
  fs.writeFileSync(
    rutaMeta,
    JSON.stringify({
      url,
      etag: respuesta.headers.get('etag') ?? undefined,
      modificado: respuesta.headers.get('last-modified') ?? undefined,
      bajadoEn: new Date().toISOString(),
    }),
  );
  return { texto, delCache: false };
}

/** Igual pero devolviendo JSON ya parseado. */
async function bajaJSON(url, dirCache, opciones) {
  const { texto, delCache } = await bajaTexto(url, dirCache, opciones);
  return { datos: JSON.parse(texto), delCache };
}

/** Parser de CSV suficiente para lo que publica Football-Data. */
function leeCSV(texto) {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lineas.length) return [];
  const partir = (linea) => {
    const campos = [];
    let actual = '';
    let entrecomillado = false;
    for (let i = 0; i < linea.length; i++) {
      const c = linea[i];
      if (c === '"') {
        if (entrecomillado && linea[i + 1] === '"') {
          actual += '"';
          i++;
        } else entrecomillado = !entrecomillado;
      } else if (c === ',' && !entrecomillado) {
        campos.push(actual);
        actual = '';
      } else actual += c;
    }
    campos.push(actual);
    return campos;
  };
  const cabeceras = partir(lineas[0]).map((h) => h.trim());
  return lineas.slice(1).map((linea) => {
    const campos = partir(linea);
    const fila = {};
    cabeceras.forEach((h, i) => {
      if (h) fila[h] = (campos[i] ?? '').trim();
    });
    return fila;
  });
}

module.exports = { bajaTexto, bajaJSON, leeCSV, aseguraDirectorio };
