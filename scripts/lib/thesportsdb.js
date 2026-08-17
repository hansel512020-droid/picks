'use strict';
/**
 * TheSportsDB: base comunitaria y gratuita de escudos y fotos.
 *
 * El problema de siempre con esta fuente es que la busqueda por nombre acierta
 * casi pero no del todo, y colgarle a un equipo el escudo de otro es peor que
 * no poner ninguno. Por eso todo resultado se valida (deporte, pais y parecido
 * del nombre) y lo que no pasa el corte se descarta.
 */

const fs = require('node:fs');
const path = require('node:path');

const API = 'https://www.thesportsdb.com/api/v1/json/3';

/**
 * Clave con la que se guarda cada escudo: el nombre completo, sin quitarle
 * nada. Si se le quitan las siglas, "FC Barcelona" y "Barcelona SC" caen en la
 * misma clave y uno se queda con el escudo del otro.
 */
const claveEstricta = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

/**
 * Version suelta, solo para comparar dos nombres entre si. Aqui si conviene
 * ignorar las siglas, porque la fuente escribe "Barcelona" donde nosotros
 * ponemos "FC Barcelona".
 */
const normaliza = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(fc|cf|afc|ac|sc|cd|ud|rc|sk|as|ss|club|de|the|futbol|football)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Parecido 0-1 entre dos nombres ya normalizados. */
function parecido(a, b) {
  const x = normaliza(a);
  const y = normaliza(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.88;
  const largo = Math.max(x.length, y.length);
  let iguales = 0;
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] === y[i]) iguales++;
  return iguales / largo;
}

class Buscador {
  constructor(dirCache, { pausaMs = 340 } = {}) {
    this.archivo = path.join(dirCache, 'thesportsdb.json');
    fs.mkdirSync(dirCache, { recursive: true });
    this.cache = {};
    if (fs.existsSync(this.archivo)) {
      try {
        this.cache = JSON.parse(fs.readFileSync(this.archivo, 'utf8'));
      } catch {
        this.cache = {};
      }
    }
    this.pausaMs = pausaMs;
    this.peticiones = 0;
    this.ultima = 0;
  }

  guarda() {
    fs.writeFileSync(this.archivo, JSON.stringify(this.cache));
  }

  async pide(url) {
    if (this.cache[url] !== undefined) return this.cache[url];

    // Hasta tres intentos, esperando cada vez mas. La API comunitaria corta
    // cuando se le pide rapido, y un fallo NO se cachea: si se guardara, el
    // equipo se quedaria sin escudo para siempre por un corte pasajero.
    for (let intento = 0; intento < 3; intento++) {
      const espera = this.pausaMs * (intento + 1) - (Date.now() - this.ultima);
      if (espera > 0) await new Promise((r) => setTimeout(r, espera));
      this.ultima = Date.now();
      this.peticiones++;

      try {
        const r = await fetch(url, { headers: { 'user-agent': 'scout-picks/1.0' } });
        if (r.ok) {
          const datos = await r.json();
          this.cache[url] = datos;
          return datos;
        }
        // 429 y demas: se espera mas antes de reintentar.
        this.pausaMs = Math.min(2500, Math.round(this.pausaMs * 1.6));
      } catch {
        this.pausaMs = Math.min(2500, Math.round(this.pausaMs * 1.6));
      }
    }
    return null;
  }

  /** Todos los equipos de una liga de un tirón: 1 petición en vez de 20. */
  async equiposDeLiga(idLiga) {
    const datos = await this.pide(`${API}/lookup_all_teams.php?id=${idLiga}`);
    return (datos?.teams ?? []).filter((e) => e.strSport === 'Soccer');
  }

  /** Catálogo completo de ligas de TheSportsDB. */
  async ligas() {
    const datos = await this.pide(`${API}/all_leagues.php`);
    return (datos?.leagues ?? []).filter((l) => l.strSport === 'Soccer');
  }

  /**
   * Escudo de un club o de una seleccion.
   * @param {string} nombre nombre tal como lo tiene la app
   * @param {string[]} alias otros nombres con los que intentarlo
   * @param {string} pais para validar que no es un homonimo de otro pais
   */
  async escudo(nombre, alias = [], pais = null) {
    // Se busca siempre por el nombre completo primero; los alias solo entran
    // si el nombre entero no resuelve.
    for (const consulta of [nombre, ...alias]) {
      const datos = await this.pide(`${API}/searchteams.php?t=${encodeURIComponent(consulta)}`);
      const equipos = datos?.teams ?? [];

      // Se puntuan todos los candidatos y se elige el mejor, no el primero:
      // buscando "Barcelona" la fuente devuelve el de Ecuador y el de España.
      let mejor = null;
      let mejorPuntos = 0;
      for (const e of equipos) {
        if (e.strSport !== 'Soccer') continue;

        const nombreExacto = claveEstricta(nombre) === claveEstricta(e.strTeam);
        let puntos = Math.max(
          parecido(consulta, e.strTeam),
          parecido(nombre, e.strTeam),
          parecido(nombre, e.strTeamAlternate ?? ''),
        );
        if (nombreExacto) puntos = 1.2;
        if (puntos < 0.72) continue;

        // El pais es lo que separa al Barcelona de España del de Ecuador.
        if (pais && e.strCountry) {
          const mismoPais = parecido(pais, e.strCountry) >= 0.6;
          if (!mismoPais && !nombreExacto) continue;
          if (mismoPais) puntos += 0.5;
        }

        if (puntos > mejorPuntos) {
          mejorPuntos = puntos;
          mejor = e;
        }
      }

      const badge = mejor && (mejor.strBadge || mejor.strTeamBadge);
      if (badge) {
        return {
          url: badge,
          fuente: mejor.strTeam,
          pais: mejor.strCountry,
          idApiFootball: mejor.idAPIfootball || null,
        };
      }
    }
    return null;
  }

  /** Foto de un jugador, preferiendo el recorte con fondo transparente. */
  async cara(nombre, equipo = null) {
    const datos = await this.pide(`${API}/searchplayers.php?p=${encodeURIComponent(nombre)}`);
    const jugadores = datos?.player ?? [];
    for (const j of jugadores) {
      if (j.strSport !== 'Soccer') continue;
      if (parecido(nombre, j.strPlayer) < 0.8) continue;
      // Con muchos homonimos, el equipo desempata.
      if (equipo && j.strTeam && parecido(equipo, j.strTeam) < 0.5 && jugadores.length > 1) continue;
      const foto = j.strCutout || j.strThumb || j.strRender;
      if (foto) return { url: foto, fuente: j.strPlayer, equipo: j.strTeam };
    }
    return null;
  }
}

module.exports = { Buscador, normaliza, claveEstricta, parecido };
