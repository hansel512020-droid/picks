'use strict';
/**
 * Football-Data.co.uk: resultados, estadisticas de partido y cuotas reales de
 * las principales casas. Descarga publica y gratuita, sin clave.
 *
 * Lo que trae de verdad: goles finales y al descanso, tiros, tiros a puerta,
 * corners, faltas, tarjetas, arbitro y las cuotas de Bet365, Pinnacle, William
 * Hill, Betfair, Bwin, BetVictor, Paddy Power y 1xBet.
 *
 * Lo que NO trae: alineaciones, posesion, xG y estadisticas por jugador. Eso
 * lo pone API-Football si hay clave.
 */

const { bajaTexto, leeCSV } = require('./http');
const { codigoTemporada } = require('./mapa-ligas');

const RAIZ = 'https://www.football-data.co.uk';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** dd/mm/yyyy o dd/mm/yy + hh:mm -> ISO. */
function fechaISO(dia, hora) {
  if (!dia) return undefined;
  const [d, m, a] = dia.split('/');
  if (!d || !m || !a) return undefined;
  const anio = a.length === 2 ? Number(a) + 2000 : Number(a);
  const [hh = '15', mm = '00'] = (hora || '').split(':');
  const fecha = new Date(anio, Number(m) - 1, Number(d), Number(hh), Number(mm));
  return Number.isNaN(fecha.getTime()) ? undefined : fecha.toISOString();
}

/** Casas de Football-Data mapeadas a las de la app. */
const CASAS = {
  B365: 'bet365',
  PS: 'pinnacle',
  P: 'pinnacle',
  WH: 'williamhill',
  BF: 'betfair',
  BW: 'bwin',
  VC: 'betvictor',
  PP: 'paddypower',
  '1XB': '1xbet',
  Max: 'mejor',
  Avg: 'media',
};

function cuotasDeFila(fila) {
  const porCasa = {};
  for (const [prefijo, id] of Object.entries(CASAS)) {
    const local = num(fila[`${prefijo}H`]);
    const empate = num(fila[`${prefijo}D`]);
    const visitante = num(fila[`${prefijo}A`]);
    if (local && empate && visitante) porCasa[id] = { local, empate, visitante };
  }
  return {
    porCasa,
    mas25: num(fila['B365>2.5']) ?? num(fila['P>2.5']) ?? num(fila['Max>2.5']) ?? num(fila['Avg>2.5']),
    menos25: num(fila['B365<2.5']) ?? num(fila['P<2.5']) ?? num(fila['Max<2.5']) ?? num(fila['Avg<2.5']),
  };
}

/** Normaliza una fila de resultado a la forma que entiende el constructor. */
function partidoDeFila(fila) {
  const fecha = fechaISO(fila.Date, fila.Time);
  if (!fecha || !fila.HomeTeam || !fila.AwayTeam) return null;
  const golesLocal = num(fila.FTHG);
  const golesVisitante = num(fila.FTAG);
  if (golesLocal === undefined || golesVisitante === undefined) return null;

  return {
    fecha,
    local: fila.HomeTeam,
    visitante: fila.AwayTeam,
    golesLocal,
    golesVisitante,
    golesLocalDescanso: num(fila.HTHG) ?? 0,
    golesVisitanteDescanso: num(fila.HTAG) ?? 0,
    arbitro: fila.Referee || undefined,
    estadisticas: {
      local: {
        remates: num(fila.HS),
        rematesPuerta: num(fila.HST),
        corners: num(fila.HC),
        faltas: num(fila.HF),
        amarillas: num(fila.HY),
        rojas: num(fila.HR),
      },
      visitante: {
        remates: num(fila.AS),
        rematesPuerta: num(fila.AST),
        corners: num(fila.AC),
        faltas: num(fila.AF),
        amarillas: num(fila.AY),
        rojas: num(fila.AR),
      },
    },
    cuotas: cuotasDeFila(fila),
  };
}

/**
 * Historial de una liga. Para las ligas del formato clasico se baja un CSV por
 * temporada; para las del formato nuevo, uno solo con todo dentro.
 */
async function historial(fuentes, temporadas, dirCache, forzar) {
  const partidos = [];

  if (fuentes.fdNueva) {
    const { texto } = await bajaTexto(`${RAIZ}/new/${fuentes.fd}.csv`, dirCache, { forzar });
    for (const fila of leeCSV(texto)) {
      // El formato nuevo usa Home/Away y una columna Season.
      const normalizada = {
        ...fila,
        HomeTeam: fila.HomeTeam || fila.Home,
        AwayTeam: fila.AwayTeam || fila.Away,
        FTHG: fila.FTHG ?? fila.HG,
        FTAG: fila.FTAG ?? fila.AG,
      };
      const p = partidoDeFila(normalizada);
      if (p) partidos.push({ ...p, temporada: fila.Season });
    }
    return partidos;
  }

  for (const temporada of temporadas) {
    const url = `${RAIZ}/mmz4281/${codigoTemporada(temporada)}/${fuentes.fd}.csv`;
    let texto;
    try {
      ({ texto } = await bajaTexto(url, dirCache, { forzar }));
    } catch {
      // Una temporada que aun no existe no debe tumbar la importacion.
      continue;
    }
    for (const fila of leeCSV(texto)) {
      // Cuando el archivo de una temporada todavia no existe, el servidor no
      // devuelve un 404: sirve el de otra division. Sin esta comprobacion se
      // colaban partidos de la National League dentro de la Premier.
      if (fila.Div && fila.Div !== fuentes.fd) continue;
      const p = partidoDeFila(fila);
      if (p) partidos.push({ ...p, temporada });
    }
  }
  return partidos;
}

/** Proximos partidos con sus cuotas, del archivo comun de toda la web. */
async function proximos(fuentes, dirCache, forzar) {
  const { texto } = await bajaTexto(`${RAIZ}/fixtures.csv`, dirCache, { forzar });
  return leeCSV(texto)
    .filter((f) => f.Div === fuentes.fd)
    .map((fila) => {
      const fecha = fechaISO(fila.Date, fila.Time);
      if (!fecha || !fila.HomeTeam || !fila.AwayTeam) return null;
      return {
        fecha,
        local: fila.HomeTeam,
        visitante: fila.AwayTeam,
        cuotas: cuotasDeFila(fila),
      };
    })
    .filter(Boolean);
}

module.exports = { historial, proximos };
