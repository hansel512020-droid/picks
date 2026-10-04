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

/*
 * Reloj en cada descarga.
 *
 * `fetch` a secas no tiene ninguno: si el otro extremo acepta la conexion y
 * luego se calla, la promesa no se resuelve NUNCA. Eso colgó el bot catorce
 * horas el 2 de octubre —el proceso seguia vivo, la tarea de Windows seguia
 * marcada como "en marcha" y, por `IgnoreNew`, rechazó todas las pasadas
 * siguientes hasta que se mató a mano.
 *
 * Cuarenta y cinco segundos es de sobra: ESPN responde en menos de dos. Si se
 * pasa, se corta y se reintenta; lo que no se hace jamas es esperar sin fin.
 */
const ESPERA_MAX = 45_000;
const INTENTOS = 3;

const duerme = (ms) => new Promise((r) => setTimeout(r, ms));

/*
 * El latido.
 *
 * Quien vigila que la importacion no se cuelgue necesita saber si sigue
 * avanzando, y el unico sitio que lo sabe de verdad es este: por aqui pasa
 * cada descarga y cada lectura de cache. Medirlo por competicion no vale —se
 * intentó el 3 de octubre y mató tres pasadas sanas, porque la primera bajada
 * de una liga grande pasa de veinte minutos sin que nada vaya mal—.
 */
let alLatir = null;

/** Registra a quien quiera enterarse de que una descarga acaba de completarse. */
function avisaDeCadaDescarga(fn) {
  alLatir = fn;
}

const late = () => {
  if (alLatir) alLatir();
};

async function pideConReloj(url, cabeceras) {
  let ultimo;
  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      return await fetch(url, { headers: cabeceras, signal: AbortSignal.timeout(ESPERA_MAX) });
    } catch (e) {
      ultimo = e;
      // Un 4xx no viene por aqui (eso es una respuesta, no un fallo): esto es
      // red caida, DNS o el reloj. Las tres mejoran esperando un poco.
      if (intento < INTENTOS) await duerme(intento * 2000);
    }
  }
  const porReloj = ultimo && (ultimo.name === 'TimeoutError' || ultimo.name === 'AbortError');
  throw new Error(porReloj ? `sin respuesta en ${ESPERA_MAX / 1000}s` : ultimo?.message ?? 'fallo de red');
}

function nombreCache(url) {
  /*
   * ESPN se pide ahora por site.web.api (ver espn.js), pero las actas ya
   * guardadas se bajaron de site.api y son el mismo contenido. El nombre se
   * calcula con el dominio viejo para que esas copias sigan valiendo y no haya
   * que volver a bajar miles de partidos.
   */
  const clave = url.replace('://site.web.api.espn.com/', '://site.api.espn.com/');
  return crypto.createHash('sha1').update(clave).digest('hex').slice(0, 16);
}

/**
 * Descarga texto con cache condicional.
 * @returns {Promise<{texto: string, delCache: boolean}>}
 */
async function bajaTexto(url, dirCache, { forzar = false, cabeceras = {}, soloCacheSiExiste = false } = {}) {
  aseguraDirectorio(dirCache);
  const base = path.join(dirCache, nombreCache(url));
  const rutaCuerpo = `${base}.txt`;
  const rutaMeta = `${base}.json`;

  /*
   * Un partido ya terminado no vuelve a cambiar: si su acta está en cache, se
   * usa tal cual, SIN tocar la red. Con el cache persistido entre ejecuciones,
   * eso significa que una temporada ya cerrada se descarga una sola vez y nunca
   * más; el bot solo pide de red lo nuevo (la temporada en curso y lo que
   * viene). Sin conexión ni petición condicional: cero red.
   */
  if (soloCacheSiExiste && !forzar && fs.existsSync(rutaCuerpo)) {
    late();
    return { texto: fs.readFileSync(rutaCuerpo, 'utf8'), delCache: true };
  }

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
    respuesta = await pideConReloj(url, cabecerasFinales);
  } catch (e) {
    // Sin conexion: si hay copia en disco se sigue con ella.
    if (fs.existsSync(rutaCuerpo)) {
      return { texto: fs.readFileSync(rutaCuerpo, 'utf8'), delCache: true };
    }
    throw new Error(`No se pudo descargar ${url}: ${e.message}`);
  }

  if (respuesta.status === 304 && fs.existsSync(rutaCuerpo)) {
    late();
    return { texto: fs.readFileSync(rutaCuerpo, 'utf8'), delCache: true };
  }
  if (!respuesta.ok) {
    if (fs.existsSync(rutaCuerpo)) {
      late();
      return { texto: fs.readFileSync(rutaCuerpo, 'utf8'), delCache: true };
    }
    throw new Error(`${respuesta.status} ${respuesta.statusText} en ${url}`);
  }

  late();
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

module.exports = { bajaTexto, bajaJSON, leeCSV, aseguraDirectorio, avisaDeCadaDescarga };
