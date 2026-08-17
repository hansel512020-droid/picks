'use strict';
/**
 * Convierte lo que devuelven las fuentes en la forma exacta que consume la
 * app (`src/datos/tipos.ts`). Football-Data manda en equipos, partidos y
 * cuotas; API-Football rellena jugadores, registros, alineaciones y bajas.
 */

const COLORES = [
  '#E30613', '#0B2A6B', '#00A650', '#FFE500', '#6CABDD', '#8A1E8A',
  '#F58220', '#00549F', '#C8102E', '#046A38', '#132257', '#FDB913',
];

const normaliza = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(fc|cf|afc|ac|sc|cd|ud|rc|club|de|the)\b/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Distancia de edicion recortada: sirve para casar "Man City" con "Manchester City". */
function parecido(a, b) {
  const x = normaliza(a);
  const y = normaliza(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.9;
  const largo = Math.max(x.length, y.length);
  let iguales = 0;
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] === y[i]) iguales++;
  return iguales / largo;
}

/** Busca el equipo mas parecido dentro de una lista de nombres. */
function casaEquipo(nombre, candidatos) {
  let mejor = null;
  let mejorPuntos = 0;
  for (const c of candidatos) {
    const p = parecido(nombre, c.nombre);
    if (p > mejorPuntos) {
      mejorPuntos = p;
      mejor = c;
    }
  }
  return mejorPuntos >= 0.62 ? mejor : null;
}

function siglas(nombre) {
  // Fuera los parentesis y todo lo que no sea letra: sin esto, "Universidad
  // Catolica (Ecuador)" se quedaba en "UC(" y quedaba a medias en pantalla.
  const limpio = (nombre || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(FC|CF|AFC|AC|SC|CD|UD|RC|SD|CA|AD)\b/gi, ' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const palabras = limpio.split(' ').filter(Boolean);
  if (!palabras.length) return (nombre || '???').slice(0, 3).toUpperCase();
  if (palabras.length >= 3) return palabras.slice(0, 3).map((p) => p[0]).join('').toUpperCase();
  if (palabras.length === 2) return (palabras[0].slice(0, 2) + palabras[1][0]).toUpperCase();
  return palabras[0].slice(0, 3).toUpperCase();
}

/** 0-100 alrededor de 75 a partir de una media y la media de la liga. */
function aEscala(valor, mediaLiga, sensibilidad) {
  if (!mediaLiga) return 75;
  return Math.max(45, Math.min(97, Math.round(75 + ((valor - mediaLiga) / mediaLiga) * sensibilidad)));
}

const POSICIONES = { G: 'POR', D: 'DEF', M: 'MED', F: 'DEL' };

// --------------------------------------------------------------- equipos

/**
 * Saca la tabla de equipos del historial y les pone nota de ataque, defensa y
 * fuerza segun lo que han hecho de verdad esta temporada.
 */
function equiposDelHistorial(competicionId, partidos, bandera) {
  const acumulado = new Map();
  const toma = (nombre) => {
    if (!acumulado.has(nombre)) {
      acumulado.set(nombre, { nombre, jugados: 0, gf: 0, gc: 0, puntos: 0, escudo: undefined });
    }
    return acumulado.get(nombre);
  };

  for (const p of partidos) {
    const l = toma(p.local);
    const v = toma(p.visitante);
    // El escudo lo trae la propia fuente junto al partido.
    l.escudo = l.escudo ?? p.escudoLocal;
    v.escudo = v.escudo ?? p.escudoVisitante;
    l.jugados++;
    v.jugados++;
    l.gf += p.golesLocal;
    l.gc += p.golesVisitante;
    v.gf += p.golesVisitante;
    v.gc += p.golesLocal;
    if (p.golesLocal > p.golesVisitante) l.puntos += 3;
    else if (p.golesLocal < p.golesVisitante) v.puntos += 3;
    else {
      l.puntos++;
      v.puntos++;
    }
  }

  // Se quedan todos, incluidos los recien ascendidos con uno o dos partidos:
  // si se filtran, sus encuentros se caen del calendario.
  const lista = [...acumulado.values()];
  const mediaGf = lista.reduce((a, e) => a + e.gf / e.jugados, 0) / Math.max(1, lista.length);
  const mediaGc = lista.reduce((a, e) => a + e.gc / e.jugados, 0) / Math.max(1, lista.length);
  const mediaPts = lista.reduce((a, e) => a + e.puntos / e.jugados, 0) / Math.max(1, lista.length);

  /*
   * El identificador sale del nombre recortado a catorce letras, y eso hace
   * que dos clubes distintos acaben compartiendolo: "Universidad Catolica" y
   * "Universidad Catolica (Quito)" daban los dos `universidadcat`, con lo que
   * sus partidos y sus estadisticas se mezclaban. Cuando se repite se le pega
   * un sufijo para separarlos.
   */
  const usados = new Set();
  const idUnico = (nombre, i) => {
    const base = `${competicionId}:${normaliza(nombre).slice(0, 14) || `eq${i}`}`;
    if (!usados.has(base)) {
      usados.add(base);
      return base;
    }
    let n = 2;
    while (usados.has(`${base}${n}`)) n++;
    usados.add(`${base}${n}`);
    return `${base}${n}`;
  };

  return lista
    .sort((a, b) => b.puntos / b.jugados - a.puntos / a.jugados)
    .map((e, i) => {
      // Con pocos partidos la nota se acerca a la media de la liga: tres
      // victorias en agosto no convierten a nadie en el mejor equipo.
      const confianza = Math.min(1, e.jugados / 8);
      const hacia = (nota) => Math.round(75 + (nota - 75) * confianza);
      return {
        id: idUnico(e.nombre, i),
        nombre: e.nombre,
        corto: siglas(e.nombre),
        bandera,
        competicionId,
        fuerza: hacia(aEscala(e.puntos / e.jugados, mediaPts, 22)),
        // La defensa es al reves: encajar poco sube la nota.
        ataque: hacia(aEscala(e.gf / e.jugados, mediaGf, 20)),
        defensa: hacia(aEscala(2 * mediaGc - e.gc / e.jugados, mediaGc, 20)),
        color: COLORES[i % COLORES.length],
        escudo: e.escudo,
        partidosJugados: e.jugados,
      };
    });
}

// -------------------------------------------------------------- partidos

const CASAS_APP = ['bet365', 'betano', '1xbet', 'betfair', 'pinnacle', 'bwin', 'williamhill', 'codere', 'betsson', 'rushbet'];

/**
 * Completa las casas que Football-Data no publica derivandolas de las que si,
 * con el margen tipico de cada una. Se marca en el resultado para que la app
 * pueda decir cuales son precios reales.
 */
function cuotasCompletas(cuotas) {
  /*
   * Cuales de estos precios vienen de verdad de una casa. ESPN publica la
   * cuota de su propio proveedor, que casi nunca es una de las diez que
   * enseña la app: por eso se apunta tambien ese nombre. Antes solo se
   * miraban las diez y la lista salia vacia aunque el precio fuera real, con
   * lo que la app no podia distinguir un precio de mercado de uno derivado.
   */
  const reales = Object.keys(cuotas.porCasa ?? {}).filter(
    (c) => CASAS_APP.includes(c) || c !== 'media',
  );
  /*
   * La casa de la que sale el precio de partida, y su nombre. Hace falta el
   * nombre porque el resumen del partido tiene que enseñar ESE precio y no uno
   * derivado: reescalar la cuota de DraftKings al margen tipico de bet365
   * movia cada linea un centimo, y una cuota que no es la que publica nadie no
   * se puede llamar real.
   */
  const nombreReferencia =
    (cuotas.porCasa?.bet365 && 'bet365') ??
    (cuotas.porCasa?.pinnacle && 'pinnacle') ??
    Object.keys(cuotas.porCasa ?? {})[0];
  const referencia = cuotas.porCasa?.[nombreReferencia];
  if (!referencia) return null;

  const porCasa = {};
  const margenes = {
    bet365: 1.055, betano: 1.06, '1xbet': 1.07, betfair: 1.03, pinnacle: 1.025,
    bwin: 1.065, williamhill: 1.06, codere: 1.075, betsson: 1.07, rushbet: 1.08,
  };
  // Margen implicito de la casa de referencia.
  const suma = 1 / referencia.local + 1 / referencia.empate + 1 / referencia.visitante;

  for (const casa of CASAS_APP) {
    if (cuotas.porCasa?.[casa]) {
      porCasa[casa] = cuotas.porCasa[casa];
      continue;
    }
    const factor = suma / margenes[casa];
    porCasa[casa] = {
      local: Number((referencia.local * factor).toFixed(2)),
      empate: Number((referencia.empate * factor).toFixed(2)),
      visitante: Number((referencia.visitante * factor).toFixed(2)),
    };
  }

  return { porCasa, reales, referencia, nombreReferencia };
}

function estadisticasEquipo(crudas, goles) {
  const remates = crudas?.remates ?? 0;
  const puerta = crudas?.rematesPuerta ?? 0;
  return {
    remates,
    rematesPuerta: puerta,
    // Football-Data no publica posesion ni xG: se dejan derivados y marcados.
    posesion: 50,
    corners: crudas?.corners ?? 0,
    faltas: crudas?.faltas ?? 0,
    amarillas: crudas?.amarillas ?? 0,
    rojas: crudas?.rojas ?? 0,
    fueraJuego: 0,
    xg: Number((goles * 0.55 + puerta * 0.26).toFixed(2)),
    pases: 0,
    precisionPases: 0,
  };
}

/** Une historial y proximos en la lista de partidos de la app. */
function partidosDeHistorial(competicionId, historial, proximos, equipos) {
  const porNombre = new Map(equipos.map((e) => [e.nombre, e]));
  const buscar = (nombre) => porNombre.get(nombre) ?? casaEquipo(nombre, equipos);
  const ahora = Date.now();
  const salida = [];

  const monta = (p, indice, jugado) => {
    const local = buscar(p.local);
    const visitante = buscar(p.visitante);
    if (!local || !visitante) return null;

    const t = new Date(p.fecha).getTime();
    const enCurso = !jugado && t <= ahora && t > ahora - 105 * 60000;
    const cuotas = cuotasCompletas(p.cuotas ?? {});

    // El estado que da ESPN manda sobre el que se deduce de la hora: es el que
    // sabe de verdad si el partido esta en juego, en el descanso o acabado.
    const estado = jugado
      ? 'finalizado'
      : (p.estadoEspn ?? (enCurso ? 'en_curso' : 'previa'));

    return {
      /*
       * El identificador sale del de ESPN, que es del partido y no cambia
       * nunca.
       *
       * Antes era `${competicionId}-r${indice}`: la posición en la lista. Cada
       * importación reordenaba los partidos, y entonces `bolivia-r55` pasaba a
       * señalar otro enfrentamiento. Los picks guardados quedaban colgados de
       * un partido ajeno —en el historial se veía "The Strongest · menos de
       * 1.5 goles" sobre un Blooming–Aurora— y no había forma de resolverlos,
       * porque el equipo del pick no jugaba ahí. Quedaban en gris para siempre.
       *
       * Sin `idEspn` no hay más remedio que el índice, pero eso solo ocurre en
       * partidos sin datos reales detrás.
       */
      id: p.idEspn ? `${competicionId}-e${p.idEspn}` : `${competicionId}-r${indice}`,
      idEspn: p.idEspn,
      competicionId,
      localId: local.id,
      visitanteId: visitante.id,
      fecha: p.fecha,
      estado,
      minuto: p.minuto ?? (enCurso ? Math.min(90, Math.floor((ahora - t) / 60000)) : undefined),
      golesLocal: estado === 'previa' ? 0 : (p.golesLocal ?? 0),
      golesVisitante: estado === 'previa' ? 0 : (p.golesVisitante ?? 0),
      golesLocalDescanso: jugado ? p.golesLocalDescanso : 0,
      golesVisitanteDescanso: jugado ? p.golesVisitanteDescanso : 0,
      jornada: 0,
      ronda: p.temporada ? `Temporada ${p.temporada}` : undefined,
      estadio: local.estadio ?? `Estadio del ${local.nombre}`,
      arbitro: p.arbitro ?? 'Sin designar',
      estadisticas: {
        local: estadisticasEquipo(p.estadisticas?.local, jugado ? p.golesLocal : 0),
        visitante: estadisticasEquipo(p.estadisticas?.visitante, jugado ? p.golesVisitante : 0),
      },
      cuotas: cuotas
        ? {
            // El resumen lleva el precio publicado, no uno reescalado.
            local: cuotas.referencia.local,
            empate: cuotas.referencia.empate,
            visitante: cuotas.referencia.visitante,
            casaResumen: cuotas.nombreReferencia,
            mas25: p.cuotas?.mas25 ?? 0,
            menos25: p.cuotas?.menos25 ?? 0,
            ambosMarcan: 0,
            ambosNoMarcan: 0,
            porCasa: cuotas.porCasa,
            casasReales: cuotas.reales,
          }
        : null,
    };
  };

  let indice = 0;
  // Se guarda con la fecha: en una liga los mismos dos equipos se enfrentan
  // dos veces por temporada, asi que el enfrentamiento por si solo no vale
  // para detectar un duplicado. Sin la fecha, se caian TODOS los partidos
  // futuros de las ligas y la app se quedaba sin picks.
  const jugadosPorClave = new Map();
  for (const p of historial) {
    const montado = monta(p, indice++, true);
    if (!montado) continue;
    const clave = `${montado.localId}|${montado.visitanteId}`;
    const cuando = new Date(montado.fecha).getTime();
    jugadosPorClave.set(clave, [...(jugadosPorClave.get(clave) ?? []), cuando]);
    salida.push(montado.cuotas ? montado : { ...montado, cuotas: cuotasVacias() });
  }

  for (const p of proximos) {
    // Football-Data tarda en sacar del archivo de proximos los partidos que ya
    // se jugaron. Si la hora ya paso hace rato, o el enfrentamiento ya esta en
    // el historial, es una fila caduca y no debe salir como pendiente.
    const t = new Date(p.fecha).getTime();
    if (t < ahora - 3 * 3600000) continue;
    const montado = monta(p, indice++, false);
    if (!montado) continue;
    // Solo es duplicado si ese mismo enfrentamiento ya consta jugado en una
    // fecha muy proxima; el partido de la vuelta no cuenta.
    const yaJugados = jugadosPorClave.get(`${montado.localId}|${montado.visitanteId}`) ?? [];
    if (yaJugados.some((cuando) => Math.abs(cuando - t) < 2 * 86400000)) continue;
    salida.push(montado.cuotas ? montado : { ...montado, cuotas: cuotasVacias() });
  }

  salida.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return salida;
}

function cuotasVacias() {
  const porCasa = {};
  for (const casa of CASAS_APP) porCasa[casa] = { local: 0, empate: 0, visitante: 0 };
  return {
    local: 0, empate: 0, visitante: 0, mas25: 0, menos25: 0,
    ambosMarcan: 0, ambosNoMarcan: 0, porCasa, casasReales: [],
  };
}

// ------------------------------------------------------------- jugadores

/** Traduce una linea de /fixtures/players al registro de la app. */
function registroDeAPI(linea, contexto) {
  const s = linea.statistics?.[0];
  if (!s) return null;
  const minutos = s.games?.minutes ?? 0;
  if (!minutos) return null;

  const remates = s.shots?.total ?? 0;
  const puerta = s.shots?.on ?? 0;
  const pases = s.passes?.total ?? 0;
  const precision = Number(String(s.passes?.accuracy ?? '').replace('%', '')) || 0;
  const duelosGanados = s.duels?.won ?? 0;
  const duelosTotales = s.duels?.total ?? 0;

  return {
    partidoId: contexto.partidoId,
    jugadorId: contexto.jugadorId,
    equipoId: contexto.equipoId,
    rivalId: contexto.rivalId,
    local: contexto.local,
    fecha: contexto.fecha,
    minutos,
    titular: !s.games?.substitute,
    goles: s.goals?.total ?? 0,
    asistencias: s.goals?.assists ?? 0,
    remates,
    rematesPuerta: puerta,
    rematesFuera: Math.max(0, remates - puerta),
    rematesBloqueados: s.shots?.blocked ?? 0,
    pasesClave: s.passes?.key ?? 0,
    regates: s.dribbles?.success ?? 0,
    regatesIntentados: s.dribbles?.attempts ?? 0,
    faltasCometidas: s.fouls?.committed ?? 0,
    faltasRecibidas: s.fouls?.drawn ?? 0,
    entradas: s.tackles?.total ?? 0,
    intercepciones: s.tackles?.interceptions ?? 0,
    // API-Football no publica despejes: se deja a 0 y la app no ofrece ese mercado.
    despejes: 0,
    duelosGanados,
    duelosTotales,
    toquesArea: 0,
    toques: pases,
    pases,
    pasesCompletados: Math.round((pases * precision) / 100),
    centros: 0,
    centrosCompletados: 0,
    amarillas: s.cards?.yellow ?? 0,
    rojas: s.cards?.red ?? 0,
    paradas: s.goals?.saves ?? 0,
    golesEncajados: s.goals?.conceded ?? 0,
    xg: 0,
    xa: 0,
    nota: Number(s.games?.rating ?? 0) || 6.5,
  };
}

/**
 * Monta jugadores y registros a partir de las respuestas de API-Football,
 * casando cada equipo de la API con el equipo que ya tiene la app.
 */
function jugadoresDeAPI(competicionId, porFixture, equipos, partidos, bandera) {
  const jugadores = new Map();
  const registros = [];

  // Los partidos de la app se localizan por fecha y por nombres de equipo.
  const indicePartidos = partidos.map((p) => ({
    partido: p,
    local: equipos.find((e) => e.id === p.localId),
    visitante: equipos.find((e) => e.id === p.visitanteId),
    dia: p.fecha.slice(0, 10),
  }));

  for (const { fixture, equiposAPI } of porFixture) {
    const dia = new Date(fixture.date).toISOString().slice(0, 10);
    const nombreLocal = fixture.teams?.home?.name;
    const nombreVisitante = fixture.teams?.away?.name;

    const encaje = indicePartidos.find(
      (x) =>
        Math.abs(new Date(x.partido.fecha).getTime() - new Date(fixture.date).getTime()) < 36e5 * 30 &&
        x.dia === dia &&
        parecido(x.local?.nombre ?? '', nombreLocal ?? '') >= 0.62 &&
        parecido(x.visitante?.nombre ?? '', nombreVisitante ?? '') >= 0.62,
    );
    if (!encaje) continue;

    for (const bloque of equiposAPI) {
      const esLocal = parecido(bloque.team?.name ?? '', encaje.local?.nombre ?? '') >= 0.62;
      const equipo = esLocal ? encaje.local : encaje.visitante;
      const rival = esLocal ? encaje.visitante : encaje.local;
      if (!equipo || !rival) continue;

      for (const linea of bloque.players ?? []) {
        const idAPI = linea.player?.id;
        if (!idAPI) continue;
        const jugadorId = `${competicionId}:j${idAPI}`;
        const s = linea.statistics?.[0];

        if (!jugadores.has(jugadorId)) {
          jugadores.set(jugadorId, {
            id: jugadorId,
            nombre: linea.player.name,
            equipoId: equipo.id,
            posicion: POSICIONES[s?.games?.position] ?? 'MED',
            dorsal: s?.games?.number ?? 0,
            edad: 0,
            pais: '',
            bandera,
            nivel: 75,
            rol: 'titular',
            notas: [],
          });
        }
        const jug = jugadores.get(jugadorId);
        if (s?.games?.rating) jug.notas.push(Number(s.games.rating));

        const registro = registroDeAPI(linea, {
          partidoId: encaje.partido.id,
          jugadorId,
          equipoId: equipo.id,
          rivalId: rival.id,
          local: esLocal,
          fecha: encaje.partido.fecha,
        });
        if (registro) registros.push(registro);
      }
    }
  }

  // El nivel sale de la nota media: es lo mas cercano a "calidad" que da la API.
  const lista = [...jugadores.values()].map((j) => {
    const media = j.notas.length ? j.notas.reduce((a, b) => a + b, 0) / j.notas.length : 6.5;
    const { notas, ...resto } = j;
    return {
      ...resto,
      nivel: Math.max(58, Math.min(94, Math.round(40 + media * 6.2))),
      partidos: notas.length,
    };
  });

  // Titular, rotacion o suplente segun cuanto ha jugado dentro de su equipo.
  const porEquipo = new Map();
  for (const j of lista) {
    const l = porEquipo.get(j.equipoId) ?? [];
    l.push(j);
    porEquipo.set(j.equipoId, l);
  }
  for (const plantel of porEquipo.values()) {
    plantel.sort((a, b) => b.partidos - a.partidos);
    plantel.forEach((j, i) => {
      j.rol = i < 11 ? 'titular' : i < 16 ? 'rotacion' : 'suplente';
      delete j.partidos;
    });
  }

  return { jugadores: lista, registros };
}

/**
 * Nombres con los que API-Football llama a las casas, traducidos a las de la
 * app. Lo que no encaja se ignora: mejor menos casas que precios inventados.
 */
const CASAS_API = {
  'bet365': 'bet365',
  'betano': 'betano',
  '1xbet': '1xbet',
  'betfair': 'betfair',
  'pinnacle': 'pinnacle',
  'bwin': 'bwin',
  'william hill': 'williamhill',
  'betsson': 'betsson',
  'codere': 'codere',
  'rushbet': 'rushbet',
};

/**
 * Traduce la respuesta de /odds a las cuotas que entiende la app. Solo se mira
 * el 1X2 y el más/menos de 2.5, que es lo que se enseña.
 */
function cuotasDeAPI(bloque) {
  const porCasa = {};
  let mas25;
  let menos25;

  for (const casa of bloque?.bookmakers ?? []) {
    const id = CASAS_API[(casa.name ?? '').toLowerCase()];
    const ganador = casa.bets?.find((b) => b.name === 'Match Winner');
    if (id && ganador) {
      const busca = (v) => Number(ganador.values?.find((x) => x.value === v)?.odd);
      const local = busca('Home');
      const empate = busca('Draw');
      const visitante = busca('Away');
      if (local && empate && visitante) porCasa[id] = { local, empate, visitante };
    }
    const goles = casa.bets?.find((b) => b.name === 'Goals Over/Under');
    if (goles && mas25 === undefined) {
      const arriba = Number(goles.values?.find((x) => x.value === 'Over 2.5')?.odd);
      const abajo = Number(goles.values?.find((x) => x.value === 'Under 2.5')?.odd);
      if (arriba) mas25 = arriba;
      if (abajo) menos25 = abajo;
    }
  }
  return Object.keys(porCasa).length ? { porCasa, mas25, menos25 } : null;
}

/**
 * Convierte el calendario de ESPN a la forma que espera el resto del
 * constructor: historial de lo jugado y lista de lo que viene.
 */
function desdeEspn(partidos) {
  const historial = [];
  const proximos = [];

  for (const p of partidos) {
    const comun = {
      fecha: p.fecha,
      local: p.local,
      visitante: p.visitante,
      escudoLocal: p.escudoLocal,
      escudoVisitante: p.escudoVisitante,
      arbitro: p.arbitro,
      estadio: p.estadio,
      idEspn: p.idEspn,
      cuotas: {},
    };
    if (p.estado === 'finalizado') {
      historial.push({
        ...comun,
        golesLocal: p.golesLocal,
        golesVisitante: p.golesVisitante,
        golesLocalDescanso: 0,
        golesVisitanteDescanso: 0,
        estadisticas: { local: {}, visitante: {} },
      });
    } else {
      proximos.push({ ...comun, estadoEspn: p.estado, minuto: p.minuto, golesLocal: p.golesLocal, golesVisitante: p.golesVisitante });
    }
  }
  return { historial, proximos };
}

/** Mete en el partido las estadisticas y los jugadores que devolvio ESPN. */
function aplicaDetalleEspn(partido, detalle, equipos, competicionId) {
  const busca = (nombre) => equipos.find((e) => parecido(e.nombre, nombre) >= 0.72);
  const local = equipos.find((e) => e.id === partido.localId);
  const visitante = equipos.find((e) => e.id === partido.visitanteId);

  for (const bloque of detalle.equipos ?? []) {
    const esLocal = parecido(bloque.nombre, local?.nombre ?? '') >= 0.72;
    const destino = esLocal ? 'local' : 'visitante';
    const e = bloque.estadisticas;
    partido.estadisticas[destino] = {
      remates: e.remates,
      rematesPuerta: e.rematesPuerta,
      posesion: e.posesion,
      corners: e.corners,
      faltas: e.faltas,
      amarillas: e.amarillas,
      rojas: e.rojas,
      fueraJuego: e.fueraJuego,
      xg: Number((partido[esLocal ? 'golesLocal' : 'golesVisitante'] * 0.55 + e.rematesPuerta * 0.26).toFixed(2)),
      pases: 0,
      precisionPases: 0,
    };
  }

  const registros = [];
  const jugadores = [];
  for (const bloque of detalle.plantillas ?? []) {
    const esLocal = parecido(bloque.nombre, local?.nombre ?? '') >= 0.72;
    const equipo = esLocal ? local : visitante;
    const rival = esLocal ? visitante : local;
    if (!equipo || !rival) continue;

    for (const j of bloque.jugadores) {
      if (!j.idEspn) continue;
      const jugadorId = `${competicionId}:e${j.idEspn}`;
      jugadores.push({
        id: jugadorId,
        nombre: j.nombre,
        equipoId: equipo.id,
        posicion: { G: 'POR', D: 'DEF', M: 'MED', F: 'DEL' }[j.posicion] ?? 'MED',
        dorsal: j.dorsal,
        edad: 0,
        pais: '',
        nivel: 75,
        rol: j.titular ? 'titular' : 'rotacion',
      });
      // Los que no jugaron no dejan registro: falsearia sus medias.
      if (!j.titular && !j.goles && !j.remates && !j.faltasCometidas && !j.amarillas && !j.paradas) {
        continue;
      }
      registros.push({
        partidoId: partido.id,
        jugadorId,
        equipoId: equipo.id,
        rivalId: rival.id,
        local: esLocal,
        fecha: partido.fecha,
        minutos: j.minutos,
        titular: j.titular,
        goles: j.goles,
        asistencias: j.asistencias,
        remates: j.remates,
        rematesPuerta: j.rematesPuerta,
        rematesFuera: Math.max(0, j.remates - j.rematesPuerta),
        rematesBloqueados: 0,
        pasesClave: 0,
        regates: 0,
        regatesIntentados: 0,
        faltasCometidas: j.faltasCometidas,
        faltasRecibidas: j.faltasRecibidas,
        entradas: 0,
        intercepciones: 0,
        despejes: 0,
        duelosGanados: 0,
        duelosTotales: 0,
        toquesArea: 0,
        toques: 0,
        pases: 0,
        pasesCompletados: 0,
        centros: 0,
        centrosCompletados: 0,
        amarillas: j.amarillas,
        rojas: j.rojas,
        paradas: j.paradas,
        golesEncajados: j.golesEncajados,
        xg: 0,
        xa: 0,
        nota: Number((6.2 + j.goles * 0.9 + j.asistencias * 0.55 + j.rematesPuerta * 0.12).toFixed(1)),
      });
    }
  }
  return { registros, jugadores };
}

module.exports = {
  cuotasDeAPI,
  desdeEspn,
  aplicaDetalleEspn,
  equiposDelHistorial,
  partidosDeHistorial,
  jugadoresDeAPI,
  casaEquipo,
  parecido,
  normaliza,
  siglas,
  POSICIONES,
};
