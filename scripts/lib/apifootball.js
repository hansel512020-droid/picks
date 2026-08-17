'use strict';
/**
 * API-Football (api-sports.io). Es la capa que Football-Data no cubre:
 * jugadores, estadisticas de cada jugador en cada partido, alineaciones y
 * lesiones.
 *
 * El plan gratuito da 100 peticiones al dia, asi que aqui todo esta pensado
 * para gastar lo minimo: cada respuesta se guarda en disco para siempre (un
 * partido terminado no cambia nunca) y hay un presupuesto de peticiones que
 * corta la importacion antes de agotar la cuota.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const RAIZ = 'https://v3.football.api-sports.io';

class Cliente {
  /**
   * @param {string} clave
   * @param {string} dirCache
   * @param {number} presupuesto peticiones nuevas como maximo
   */
  constructor(clave, dirCache, presupuesto) {
    this.clave = clave;
    this.dirCache = dirCache;
    this.presupuesto = presupuesto;
    this.gastadas = 0;
    this.delCache = 0;
    this.agotado = false;
    fs.mkdirSync(dirCache, { recursive: true });
  }

  ruta(url) {
    const nombre = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
    return path.join(this.dirCache, `${nombre}.json`);
  }

  /**
   * Pide un endpoint. Devuelve `null` si no queda presupuesto y no estaba en
   * cache, para que quien llame decida si sigue sin ese dato.
   */
  async pide(endpoint, parametros = {}) {
    const consulta = new URLSearchParams(parametros).toString();
    const url = `${RAIZ}${endpoint}?${consulta}`;
    const archivo = this.ruta(url);

    if (fs.existsSync(archivo)) {
      this.delCache++;
      try {
        return JSON.parse(fs.readFileSync(archivo, 'utf8'));
      } catch {
        // Cache corrupta: se vuelve a pedir.
      }
    }

    if (this.gastadas >= this.presupuesto) {
      this.agotado = true;
      return null;
    }

    const respuesta = await fetch(url, { headers: { 'x-apisports-key': this.clave } });
    this.gastadas++;

    if (respuesta.status === 429) {
      this.agotado = true;
      this.presupuesto = this.gastadas;
      return null;
    }
    if (!respuesta.ok) {
      throw new Error(`API-Football ${respuesta.status} en ${endpoint}`);
    }

    const cuerpo = await respuesta.json();
    if (Array.isArray(cuerpo.errors) === false && cuerpo.errors && Object.keys(cuerpo.errors).length) {
      const detalle = Object.values(cuerpo.errors).join(' · ');
      // El plan gratuito solo abre las temporadas 2022-2024. No es motivo para
      // tumbar la importacion: se apunta el motivo y se sigue con lo que haya.
      this.ultimoRechazo = detalle;
      this.agotado = true;
      return null;
    }
    this.ultimoRechazo = null;

    fs.writeFileSync(archivo, JSON.stringify(cuerpo));
    return cuerpo;
  }

  /** Partidos de una liga y temporada. */
  async fixtures(liga, temporada) {
    const r = await this.pide('/fixtures', { league: liga, season: temporada });
    return r?.response ?? [];
  }

  /** Estadisticas de todos los jugadores de un partido. */
  async jugadoresDePartido(fixtureId) {
    const r = await this.pide('/fixtures/players', { fixture: fixtureId });
    return r?.response ?? [];
  }

  /** Onces de un partido. */
  async alineaciones(fixtureId) {
    const r = await this.pide('/fixtures/lineups', { fixture: fixtureId });
    return r?.response ?? [];
  }

  /** Lesionados y sancionados de la liga. */
  async lesiones(liga, temporada) {
    const r = await this.pide('/injuries', { league: liga, season: temporada });
    return r?.response ?? [];
  }

  /** Tiros, corners, faltas, tarjetas y posesion de un partido. */
  async estadisticas(fixtureId) {
    const r = await this.pide('/fixtures/statistics', { fixture: fixtureId });
    return r?.response ?? [];
  }

  /**
   * Cuotas de todos los partidos de una fecha. Una peticion por dia en vez de
   * una por partido, que con el plan gratuito seria inviable.
   */
  async cuotasDelDia(liga, temporada, fecha) {
    const salida = [];
    for (let pagina = 1; pagina <= 6; pagina++) {
      const r = await this.pide('/odds', {
        league: liga,
        season: temporada,
        date: fecha,
        page: pagina,
      });
      if (!r?.response?.length) break;
      salida.push(...r.response);
      const total = r.paging?.total ?? 1;
      if (pagina >= total) break;
    }
    return salida;
  }

  /** Partidos que se estan jugando ahora mismo en esa liga. */
  async enVivo(liga) {
    const r = await this.pide('/fixtures', { league: liga, live: 'all' });
    return r?.response ?? [];
  }

  resumen() {
    return {
      nuevas: this.gastadas,
      cache: this.delCache,
      agotado: this.agotado,
      presupuesto: this.presupuesto,
    };
  }
}

/** Lee la clave de un .env sencillo sin dependencias. */
function claveDelEntorno(rutaEnv) {
  if (process.env.APIFOOTBALL_KEY) return process.env.APIFOOTBALL_KEY.trim();
  if (!fs.existsSync(rutaEnv)) return null;
  for (const linea of fs.readFileSync(rutaEnv, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*APIFOOTBALL_KEY\s*=\s*(.*)$/);
    if (!m) continue;
    const valor = m[1].trim().replace(/^["']|["']$/g, '');
    if (valor && valor !== 'tu_clave_aqui') return valor;
  }
  return null;
}

module.exports = { Cliente, claveDelEntorno };
