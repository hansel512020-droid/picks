'use strict';
/**
 * ESPN. Es la fuente publica que cubre lo que a Football-Data le falta: las
 * copas, las competiciones continentales, el calendario completo de lo que
 * viene, el estado en vivo y las estadisticas de cada partido y de cada
 * jugador. No pide clave.
 *
 * Lo que trae:
 *   · calendario por rango de fechas, con estado (programado, en juego, final)
 *   · marcador y minuto de los partidos en curso
 *   · tiros, tiros a puerta, corners, faltas, tarjetas, fuera de juego,
 *     posesion y paradas por equipo
 *   · alineaciones con dorsal, puesto y titularidad
 *   · por jugador: goles, asistencias, remates, remates a puerta, faltas
 *     cometidas y recibidas, tarjetas, paradas y goles encajados
 *
 * Lo que NO trae: pases clave, regates, entradas, intercepciones ni duelos.
 * Esas metricas se quedan sin datos y la app no ofrece esos mercados.
 */

const { bajaJSON } = require('./http');

const RAIZ = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

/** Competicion de la app -> identificador de ESPN. */
const LIGAS = {
  premier: 'eng.1',
  championship: 'eng.2',
  laliga: 'esp.1',
  seriea: 'ita.1',
  bundesliga: 'ger.1',
  ligue1: 'fra.1',
  eredivisie: 'ned.1',
  portugal: 'por.1',
  belgica: 'bel.1',
  turquia: 'tur.1',
  grecia: 'gre.1',
  escocia: 'sco.1',
  suiza: 'sui.1',
  austria: 'aut.1',
  dinamarca: 'den.1',
  noruega: 'nor.1',
  suecia: 'swe.1',
  polonia: 'pol.1',
  rumania: 'rou.1',
  chequia: 'cze.1',
  croacia: 'cro.1',
  serbia: 'srb.1',
  ucrania: 'ukr.1',
  rusia: 'rus.1',

  // Continentales y copas: aqui es donde ESPN se vuelve imprescindible.
  champions: 'uefa.champions',
  europaleague: 'uefa.europa',
  conference: 'uefa.europa.conf',
  libertadores: 'conmebol.libertadores',
  sudamericana: 'conmebol.sudamericana',
  concachampions: 'concacaf.champions',
  copadelrey: 'esp.copa_del_rey',
  facup: 'eng.fa',
  carabao: 'eng.league_cup',
  coppa: 'ita.coppa_italia',
  dfbpokal: 'ger.dfb_pokal',
  coupefrance: 'fra.coupe_de_france',
  mundial: 'fifa.world',
  euro: 'uefa.euro',
  copaamerica: 'conmebol.america',
  nationsleague: 'uefa.nations',
  eliminatoriassud: 'fifa.worldq.conmebol',

  // America y Asia.
  ligamx: 'mex.1',
  brasileirao: 'bra.1',
  argentina: 'arg.1',
  mls: 'usa.1',
  colombia: 'col.1',
  chile: 'chi.1',
  peru: 'per.1',
  bolivia: 'bol.1',
  ecuador: 'ecu.1',
  uruguay: 'uru.1',
  paraguay: 'par.1',
  venezuela: 'ven.1',
  japon: 'jpn.1',
  corea: 'kor.1',
  australia: 'aus.1',
  china: 'chn.1',
  saudi: 'ksa.1',
  egipto: 'egy.1',
  sudafrica: 'rsa.1',
  marruecos: 'mar.1',
};

const IMPORTABLES = Object.keys(LIGAS);

const aFecha = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Estados de ESPN traducidos a los de la app.
 *
 * Manda `type.state`, que es el campo normalizado de ESPN ('pre', 'in',
 * 'post'), no el nombre del estado. En futbol ESPN usa STATUS_FULL_TIME en vez
 * de STATUS_FINAL, y mirar solo los nombres dejaba los partidos ya jugados
 * marcados como "previa" y con el marcador a cero.
 */
function estadoDe(estado) {
  const nombre = estado?.type?.name ?? '';
  const fase = estado?.type?.state ?? '';

  if (fase === 'post' || estado?.type?.completed) return 'finalizado';
  if (nombre === 'STATUS_HALFTIME') return 'descanso';
  if (fase === 'in') return 'en_curso';

  // Respaldo por nombre, por si algun dia falta `state`.
  if (/FULL_TIME|FINAL|ABANDONED|POSTPONED|CANCELED/.test(nombre)) return 'finalizado';
  if (/FIRST_HALF|SECOND_HALF|IN_PROGRESS|EXTRA|SHOOTOUT/.test(nombre)) return 'en_curso';
  return 'previa';
}

/**
 * Calendario de una competicion entre dos fechas. ESPN acepta rangos, asi que
 * una temporada entera son tres o cuatro peticiones en vez de trescientas.
 */
async function calendario(slug, desde, hasta, dirCache, forzar) {
  const partidos = [];
  const TRAMO = 90 * 86400000;

  for (let ini = desde.getTime(); ini <= hasta.getTime(); ini += TRAMO + 86400000) {
    const fin = new Date(Math.min(ini + TRAMO, hasta.getTime()));
    const rango = `${aFecha(new Date(ini))}-${aFecha(fin)}`;
    let datos;
    try {
      ({ datos } = await bajaJSON(
        `${RAIZ}/${slug}/scoreboard?dates=${rango}&limit=400`,
        dirCache,
        { forzar },
      ));
    } catch {
      continue;
    }

    for (const evento of datos?.events ?? []) {
      const c = evento.competitions?.[0];
      if (!c) continue;
      const local = c.competitors?.find((x) => x.homeAway === 'home');
      const visitante = c.competitors?.find((x) => x.homeAway === 'away');
      if (!local || !visitante) continue;

      partidos.push({
        idEspn: evento.id,
        fecha: evento.date,
        local: local.team?.displayName ?? local.team?.name,
        visitante: visitante.team?.displayName ?? visitante.team?.name,
        // El escudo viene en la misma respuesta: asi cada equipo importado
        // trae el suyo sin tener que buscarlo por nombre en otra fuente.
        escudoLocal: local.team?.logo,
        escudoVisitante: visitante.team?.logo,
        golesLocal: num(local.score),
        golesVisitante: num(visitante.score),
        estado: estadoDe(c.status),
        minuto: c.status?.displayClock ? parseInt(c.status.displayClock, 10) || undefined : undefined,
        ronda: evento.season?.slug ?? c.notes?.[0]?.headline,
        estadio: c.venue?.fullName,
        arbitro: c.details?.find((d) => d.type === 'referee')?.athletesInvolved?.[0]?.displayName,
      });
    }
  }
  return partidos;
}

/** Traduce las estadisticas de un equipo en un partido. */
function estadisticasDe(bloque) {
  const v = (nombre) => num(bloque?.statistics?.find((s) => s.name === nombre)?.displayValue);
  return {
    remates: v('totalShots'),
    rematesPuerta: v('shotsOnTarget'),
    corners: v('wonCorners'),
    faltas: v('foulsCommitted'),
    amarillas: v('yellowCards'),
    rojas: v('redCards'),
    fueraJuego: v('offsides'),
    posesion: v('possessionPct'),
    paradas: v('saves'),
  };
}

/** Traduce la linea de un jugador en un partido. */
function jugadorDe(entrada) {
  const s = (nombre) => num(entrada.stats?.find((x) => x.name === nombre)?.displayValue);
  return {
    idEspn: entrada.athlete?.id,
    nombre: entrada.athlete?.displayName,
    dorsal: num(entrada.jersey),
    posicion: entrada.position?.abbreviation,
    titular: !!entrada.starter,
    minutos: entrada.starter ? 90 : 25,
    goles: s('totalGoals'),
    asistencias: s('goalAssists'),
    remates: s('totalShots'),
    rematesPuerta: s('shotsOnTarget'),
    faltasCometidas: s('foulsCommitted'),
    faltasRecibidas: s('foulsSuffered'),
    amarillas: s('yellowCards'),
    rojas: s('redCards'),
    paradas: s('saves'),
    golesEncajados: s('goalsConceded'),
  };
}

/**
 * Las casas publican en formato americano: +250 significa que 100 ganan 250,
 * y -150 que hay que poner 150 para ganar 100. La app trabaja en decimal.
 */
function aDecimal(americana) {
  const n = Number(americana);
  if (!Number.isFinite(n) || n === 0) return undefined;
  const cuota = n > 0 ? 1 + n / 100 : 1 + 100 / Math.abs(n);
  return Number(cuota.toFixed(2));
}

/**
 * Cuotas reales de un partido: 1X2 y mas/menos de 2.5. Vienen de las casas con
 * las que trabaja ESPN, asi que son precios de verdad, no estimaciones.
 */
async function cuotas(slug, idEspn, dirCache, forzar) {
  let datos;
  try {
    ({ datos } = await bajaJSON(`${RAIZ}/${slug}/summary?event=${idEspn}`, dirCache, { forzar }));
  } catch {
    return null;
  }

  const salida = { porCasa: {}, mas25: undefined, menos25: undefined };
  for (const bloque of datos?.pickcenter ?? []) {
    const casa = (bloque.provider?.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const local = aDecimal(bloque.homeTeamOdds?.moneyLine);
    const empate = aDecimal(bloque.drawOdds?.moneyLine);
    const visitante = aDecimal(bloque.awayTeamOdds?.moneyLine);
    if (casa && local && empate && visitante) salida.porCasa[casa] = { local, empate, visitante };

    // Solo sirve la linea de 2.5, que es la que enseña la app.
    if (Number(bloque.overUnder) === 2.5) {
      salida.mas25 = salida.mas25 ?? aDecimal(bloque.overOdds);
      salida.menos25 = salida.menos25 ?? aDecimal(bloque.underOdds);
    }
  }
  return Object.keys(salida.porCasa).length || salida.mas25 ? salida : null;
}

/**
 * Detalle de un partido: estadisticas por equipo y linea de cada jugador.
 * Cuesta una peticion por partido, asi que quien llame decide cuantos pide.
 */
async function detalle(slug, idEspn, dirCache, forzar) {
  let datos;
  try {
    ({ datos } = await bajaJSON(`${RAIZ}/${slug}/summary?event=${idEspn}`, dirCache, { forzar }));
  } catch {
    return null;
  }

  const equipos = (datos?.boxscore?.teams ?? []).map((t) => ({
    nombre: t.team?.displayName ?? t.team?.name,
    estadisticas: estadisticasDe(t),
  }));

  const plantillas = (datos?.rosters ?? []).map((r) => ({
    nombre: r.team?.displayName ?? r.team?.name,
    jugadores: (r.roster ?? []).map(jugadorDe).filter((j) => j.nombre),
  }));

  return { equipos, plantillas };
}

module.exports = { LIGAS, IMPORTABLES, calendario, detalle, cuotas, aDecimal, aFecha };
