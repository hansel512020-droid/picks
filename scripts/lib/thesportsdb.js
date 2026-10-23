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

/*
 * La clave de la API.
 *
 * La gratuita de pruebas era "3" y TheSportsDB la cambió por "123". Con la
 * vieja todas las peticiones fallaban, y como el bot servía casi todo de su
 * caché, no se notó en semanas: lo nuevo —caras, escudos de los equipos
 * importados— simplemente no llegaba. Se puede pasar otra, una de pago, en
 * THESPORTSDB_KEY.
 */
const CLAVE_API = process.env.THESPORTSDB_KEY || '123';
const API = `https://www.thesportsdb.com/api/v1/json/${CLAVE_API}`;

/** La caché va sin la clave: la respuesta es la misma con cualquiera. */
const sinClave = (url) => url.replace(/\/api\/v1\/json\/[^/]+\//, '/api/v1/json/');

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
  /*
   * Una petición cada 4 segundos. El plan gratuito corta con 429 en cuanto se
   * le pide deprisa —con 2,1 s, a la séptima búsqueda—, y desde GitHub la IP
   * se comparte con otros: mejor ir despacio y no perder peticiones.
   *
   * `esperaLimiteMs` es lo que se espera tras un 429 si la fuente no dice
   * cuánto (Retry-After).
   */
  constructor(dirCache, { pausaMs = 4000, esperaLimiteMs = 60_000 } = {}) {
    this.archivo = path.join(dirCache, 'thesportsdb.json');
    fs.mkdirSync(dirCache, { recursive: true });
    this.cache = {};
    if (fs.existsSync(this.archivo)) {
      try {
        // Lo guardado con la clave vieja vale igual: se guarda sin ella.
        const guardada = JSON.parse(fs.readFileSync(this.archivo, 'utf8'));
        this.cache = Object.fromEntries(
          Object.entries(guardada).map(([url, datos]) => [sinClave(url), datos]),
        );
      } catch {
        this.cache = {};
      }
    }
    this.pausaMs = pausaMs;
    this.esperaLimiteMs = esperaLimiteMs;
    this.peticiones = 0;
    this.ultima = 0;
    /** Peticiones que agotaron sus intentos, y por qué falló la última. */
    this.fallos = 0;
    this.ultimoFallo = null;
  }

  guarda() {
    fs.writeFileSync(this.archivo, JSON.stringify(this.cache));
  }

  async pide(url) {
    const clave = sinClave(url);
    if (this.cache[clave] !== undefined) return this.cache[clave];

    // Hasta tres intentos, esperando cada vez mas. La API comunitaria corta
    // cuando se le pide rapido, y un fallo NO se cachea: si se guardara, el
    // equipo se quedaria sin escudo para siempre por un corte pasajero.
    for (let intento = 0; intento < 3; intento++) {
      const espera = this.pausaMs * (intento + 1) - (Date.now() - this.ultima);
      if (espera > 0) await new Promise((r) => setTimeout(r, espera));
      this.ultima = Date.now();
      this.peticiones++;

      try {
        // Con reloj: sin el, una respuesta que no llega cuelga la importacion
        // entera (ver el comentario de scripts/lib/http.js).
        const r = await fetch(url, {
          headers: { 'user-agent': 'scout-picks/1.0' },
          signal: AbortSignal.timeout(45_000),
        });
        if (r.ok) {
          const datos = await r.json();
          this.cache[clave] = datos;
          return datos;
        }
        this.ultimoFallo = `HTTP ${r.status}`;
        /*
         * 429 es "más despacio", no "caído": se espera lo que pida la fuente
         * (un minuto si no lo dice) y el resto de la pasada va más lenta.
         */
        if (r.status === 429) {
          const segundos = Number(r.headers?.get?.('retry-after'));
          const espera = segundos > 0 ? Math.min(segundos * 1000, 120_000) : this.esperaLimiteMs;
          // Tras el último intento no se espera: ya no hay a qué.
          if (intento < 2) await new Promise((ok) => setTimeout(ok, espera));
          this.pausaMs = Math.min(10_000, Math.round(this.pausaMs * 1.5));
          continue;
        }
        // Lo demás: se espera más antes de reintentar.
        this.pausaMs = Math.min(10_000, Math.round(this.pausaMs * 1.6));
      } catch (error) {
        this.ultimoFallo = error?.message ?? String(error);
        this.pausaMs = Math.min(10_000, Math.round(this.pausaMs * 1.6));
      }
    }
    this.fallos++;
    return null;
  }

  /** Todos los equipos de una liga de un tirón: 1 petición en vez de 20. */
  async equiposDeLiga(idLiga) {
    const datos = await this.pide(`${API}/lookup_all_teams.php?id=${idLiga}`);
    return (datos?.teams ?? []).filter((e) => e.strSport === 'Soccer');
  }

  /** Los equipos de fútbol que devuelve la búsqueda por nombre, sin elegir entre ellos. */
  async equiposPorNombre(nombre) {
    const datos = await this.pide(`${API}/searchteams.php?t=${encodeURIComponent(nombre)}`);
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
