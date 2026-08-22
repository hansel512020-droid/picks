'use strict';
/**
 * Puente entre las competiciones de la app y las dos fuentes reales.
 *
 *  - `fd`   codigo de Football-Data.co.uk (historial, estadisticas y cuotas)
 *  - `fdNueva` true cuando la liga vive en /new/CODIGO.csv en vez de en los
 *              archivos por temporada de /mmz4281
 *  - `af`   id de liga en API-Football (jugadores, alineaciones y lesiones)
 */

const MAPA = {
  premier: { fd: 'E0', af: 39 },
  championship: { fd: 'E1', af: 40 },
  laliga: { fd: 'SP1', af: 140 },
  seriea: { fd: 'I1', af: 135 },
  bundesliga: { fd: 'D1', af: 78 },
  ligue1: { fd: 'F1', af: 61 },
  eredivisie: { fd: 'N1', af: 88 },
  portugal: { fd: 'P1', af: 94 },
  belgica: { fd: 'B1', af: 144 },
  turquia: { fd: 'T1', af: 203 },
  grecia: { fd: 'G1', af: 197 },
  escocia: { fd: 'SC0', af: 179 },

  /*
   * Segundas divisiones. Estaban dadas de alta en la app y en el catalogo de
   * ESPN, pero faltaban aqui —que es de donde el importador saca las fuentes—,
   * asi que fallaban con "no se puede importar" y en la app salian vacias.
   *
   * Las dos estan en Football-Data con el formato por temporadas, igual que su
   * primera division: SP2 es LaLiga Hypermotion e I2 la Serie B italiana. Eso
   * les da historial y cuotas de casas reales, no solo el calendario de ESPN.
   */
  laliga2: { fd: 'SP2', af: 141 },
  serieb: { fd: 'I2', af: 136 },

  // Estas viven en el formato "nuevo" de Football-Data: un CSV por liga con
  // todas las temporadas dentro y menos columnas de estadisticas.
  argentina: { fd: 'ARG', fdNueva: true, af: 128 },
  brasileirao: { fd: 'BRA', fdNueva: true, af: 71 },
  ligamx: { fd: 'MEX', fdNueva: true, af: 262 },
  mls: { fd: 'USA', fdNueva: true, af: 253 },
  japon: { fd: 'JPN', fdNueva: true, af: 98 },
  china: { fd: 'CHN', fdNueva: true, af: 169 },
  suiza: { fd: 'SWZ', fdNueva: true, af: 207 },
  austria: { fd: 'AUT', fdNueva: true, af: 218 },
  dinamarca: { fd: 'DNK', fdNueva: true, af: 119 },
  noruega: { fd: 'NOR', fdNueva: true, af: 103 },
  suecia: { fd: 'SWE', fdNueva: true, af: 113 },
  polonia: { fd: 'POL', fdNueva: true, af: 106 },
  rumania: { fd: 'ROU', fdNueva: true, af: 283 },

  // Sin equivalente en Football-Data: solo API-Football.
  champions: { af: 2 },
  europaleague: { af: 3 },
  conference: { af: 848 },
  mundial: { af: 1 },
  euro: { af: 4 },
  copaamerica: { af: 9 },
  libertadores: { af: 13 },
  sudamericana: { af: 11 },
  colombia: { af: 239 },
  chile: { af: 265 },
  peru: { af: 281 },
  bolivia: { af: 344 },
  ecuador: { af: 242 },
  uruguay: { af: 268 },
  paraguay: { af: 250 },
  venezuela: { af: 299 },
  saudi: { af: 307 },
  corea: { af: 292 },
  australia: { af: 188 },
  egipto: { af: 233 },
  sudafrica: { af: 288 },
  marruecos: { af: 200 },
  croacia: { af: 210 },
  serbia: { af: 286 },
  chequia: { af: 345 },
  ucrania: { af: 333 },
  copadelrey: { af: 143 },
  facup: { af: 45 },
  carabao: { af: 48 },
  coppa: { af: 137 },
  dfbpokal: { af: 81 },
  coupefrance: { af: 66 },
  nationsleague: { af: 5 },
  concachampions: { af: 16 },
  eliminatoriassud: { af: 34 },
};

/** Competiciones que se pueden importar. */
const IMPORTABLES = Object.keys(MAPA);

/** Las que traen historial completo y cuotas reales sin necesitar clave. */
const SIN_CLAVE = IMPORTABLES.filter((id) => MAPA[id].fd);

function fuentesDe(competicionId) {
  return MAPA[competicionId] ?? null;
}

/** "2025-26" -> "2526", que es como nombra los archivos Football-Data. */
function codigoTemporada(temporada) {
  const [a, b] = temporada.split('-');
  return `${a.slice(2)}${b.padStart(2, '0')}`;
}

/** Temporada en curso segun la fecha: el corte es julio. */
function temporadaActual(fecha = new Date()) {
  const anio = fecha.getMonth() >= 6 ? fecha.getFullYear() : fecha.getFullYear() - 1;
  return `${anio}-${String((anio + 1) % 100).padStart(2, '0')}`;
}

module.exports = { MAPA, IMPORTABLES, SIN_CLAVE, fuentesDe, codigoTemporada, temporadaActual };
