import { Aleatorio } from '@/utiles/aleatorio';
import { CASAS } from './casas';
import { competicion, TODAS } from './competiciones';
import { COMPETICIONES_IMPORTADAS, datosReales, cuandoCambienLosDatos } from './importado';
import { plantilla } from './plantillas';
import type {
  Alineacion,
  Equipo,
  EstadisticasEquipoPartido,
  Jugador,
  Lesion,
  Partido,
  RegistroJugador,
} from './tipos';

/**
 * Motor de la temporada. A partir de las plantillas construye el calendario,
 * los resultados, las estadisticas por equipo, el registro de cada jugador en
 * cada partido y las cuotas. Todo con semilla, asi que es estable.
 */

const DIA = 86400000;
/** Sedes de los torneos de selecciones: un equipo nacional no tiene estadio. */
const SEDES = [
  'MetLife Stadium, Nueva York', 'SoFi Stadium, Los Ángeles', 'AT&T Stadium, Dallas',
  'Estadio Azteca, Ciudad de México', 'Estadio Akron, Guadalajara', 'Estadio BBVA, Monterrey',
  'BMO Field, Toronto', 'BC Place, Vancouver', 'Mercedes-Benz Stadium, Atlanta',
  'NRG Stadium, Houston', 'Arrowhead Stadium, Kansas City', 'Hard Rock Stadium, Miami',
  'Lincoln Financial Field, Filadelfia', 'Levi’s Stadium, San Francisco',
  'Lumen Field, Seattle', 'Gillette Stadium, Boston',
];

const ARBITROS = [
  'A. Marciniak', 'C. Turpin', 'D. Massa', 'S. Attwell', 'F. Zwayer', 'I. Kovacs',
  'M. Oliver', 'J. Gil Manzano', 'D. Orsato', 'A. Taylor', 'S. Wilton', 'R. Tobar',
  'W. Sampaio', 'J. Ostojich', 'C. Ramos', 'E. Guerrero', 'P. Maillet', 'A. Rapallini',
];

/** El "hoy" de la app se congela al minuto para que la UI no baile. */
function ahora(): number {
  return Math.floor(Date.now() / 60000) * 60000;
}

function inicioDelDia(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ------------------------------------------------------------------ calendario

/** Empareja a todos los equipos de una jornada sin repetir a nadie. */
function emparejamientos(equipos: Equipo[], jornada: number): [Equipo, Equipo][] {
  const rnd = new Aleatorio(`jornada-${equipos[0]?.competicionId}-${jornada}`);
  const orden = rnd.baraja(equipos);
  const parejas: [Equipo, Equipo][] = [];
  for (let i = 0; i + 1 < orden.length; i += 2) {
    // Alterna la localia por jornada para que todos jueguen fuera y en casa.
    if ((jornada + i) % 2 === 0) parejas.push([orden[i], orden[i + 1]]);
    else parejas.push([orden[i + 1], orden[i]]);
  }
  return parejas;
}

function estadisticasEquipo(
  goles: number,
  fuerza: number,
  rivalFuerza: number,
  local: boolean,
  rnd: Aleatorio,
): EstadisticasEquipoPartido {
  const dominio = (fuerza - rivalFuerza) / 100 + (local ? 0.06 : -0.06);
  const remates = Math.max(2, Math.round(rnd.normal(11.5 + dominio * 12, 3.4)));
  const rematesPuerta = Math.max(
    goles,
    Math.round(remates * rnd.rango(0.28, 0.42)),
  );
  return {
    remates,
    rematesPuerta,
    posesion: Math.min(78, Math.max(22, Math.round(50 + dominio * 42 + rnd.normal(0, 5)))),
    corners: Math.max(0, Math.round(rnd.normal(5.1 + dominio * 3.4, 2.1))),
    faltas: Math.max(2, Math.round(rnd.normal(12.4 - dominio * 2, 3))),
    amarillas: Math.max(0, rnd.poisson(1.9 - dominio * 0.5)),
    rojas: rnd.suerte(0.05) ? 1 : 0,
    fueraJuego: Math.max(0, rnd.poisson(1.9)),
    xg: Number((rnd.rango(0.75, 1.25) * (goles * 0.55 + rematesPuerta * 0.26)).toFixed(2)),
    pases: Math.round(rnd.normal(430 + dominio * 190, 60)),
    precisionPases: Math.min(95, Math.max(62, Math.round(rnd.normal(82 + dominio * 8, 4)))),
  };
}

/** Probabilidades 1X2 y over/under a partir de un modelo de Poisson. */
function modelo(lambdaLocal: number, lambdaVisitante: number) {
  const p = (l: number, k: number) => (Math.exp(-l) * Math.pow(l, k)) / factorial(k);
  let pLocal = 0;
  let pEmpate = 0;
  let pVisitante = 0;
  let pMenos25 = 0;
  let pAmbos = 0;
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++) {
      const prob = p(lambdaLocal, a) * p(lambdaVisitante, b);
      if (a > b) pLocal += prob;
      else if (a === b) pEmpate += prob;
      else pVisitante += prob;
      if (a + b <= 2) pMenos25 += prob;
      if (a > 0 && b > 0) pAmbos += prob;
    }
  }
  return { pLocal, pEmpate, pVisitante, pMenos25, pMas25: 1 - pMenos25, pAmbos };
}

const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800];
function factorial(n: number) {
  return FACT[n] ?? 3628800;
}

/** Convierte probabilidad en cuota anadiendo el margen de la casa. */
function precio(prob: number, margen: number, rnd: Aleatorio): number {
  const ajustada = Math.min(0.97, Math.max(0.02, prob * margen));
  const cuota = 1 / ajustada;
  return Number((cuota * rnd.rango(0.985, 1.015)).toFixed(2));
}

function creaPartido(
  competicionId: string,
  local: Equipo,
  visitante: Equipo,
  fecha: number,
  jornada: number,
): Partido {
  const comp = competicion(competicionId);
  /*
   * El identificador lleva a los dos equipos, no la posición en la lista.
   *
   * Antes era `${competicionId}-j${jornada}-${indice}`: puramente posicional.
   * Al regenerarse el calendario, ese mismo identificador pasaba a ser otro
   * partido, y los picks guardados quedaban colgados de un enfrentamiento
   * ajeno. En el historial se veía "The Strongest · menos de 1.5 goles" sobre
   * un Blooming–Aurora, y no había forma de resolverlo: el equipo del pick no
   * jugaba ese partido. Con los equipos dentro, el identificador señala
   * siempre al mismo enfrentamiento.
   *
   * Nota: el identificador es también la semilla del generador, así que los
   * marcadores de toda la temporada cambian con este cambio. Es inevitable y
   * solo ocurre una vez.
   */
  const id = `${competicionId}-j${jornada}-${local.id}-${visitante.id}`;
  const rnd = new Aleatorio(id);

  // Goles esperados: ataque propio contra defensa rival, normalizado al ritmo
  // goleador historico de la competicion, y con la ventaja de jugar en casa.
  const base = comp.golesPartido / 2;
  const lambdaLocal = Math.max(
    0.25,
    base * Math.pow(1.028, local.ataque - visitante.defensa) * 1.14,
  );
  const lambdaVisitante = Math.max(
    0.2,
    base * Math.pow(1.028, visitante.ataque - local.defensa) * 0.88,
  );

  const t = ahora();
  const jugado = fecha <= t - 105 * 60000;
  const enCurso = !jugado && fecha <= t;
  const minuto = enCurso ? Math.min(90, Math.max(1, Math.floor((t - fecha) / 60000))) : undefined;

  const golesFinalLocal = rnd.poisson(lambdaLocal);
  const golesFinalVisitante = rnd.poisson(lambdaVisitante);
  // En un partido en curso solo han caido los goles hasta el minuto actual.
  const proporcion = enCurso ? (minuto ?? 0) / 92 : 1;
  const golesLocal = jugado
    ? golesFinalLocal
    : enCurso
      ? Math.round(golesFinalLocal * proporcion)
      : 0;
  const golesVisitante = jugado
    ? golesFinalVisitante
    : enCurso
      ? Math.round(golesFinalVisitante * proporcion)
      : 0;

  const m = modelo(lambdaLocal, lambdaVisitante);
  const porCasa: Partido['cuotas']['porCasa'] = {};
  for (const casa of CASAS) {
    const r = new Aleatorio(`${id}-${casa.id}`);
    porCasa[casa.id] = {
      local: precio(m.pLocal, casa.margen, r),
      empate: precio(m.pEmpate, casa.margen, r),
      visitante: precio(m.pVisitante, casa.margen, r),
    };
  }

  return {
    id,
    competicionId,
    localId: local.id,
    visitanteId: visitante.id,
    fecha: new Date(fecha).toISOString(),
    estado: jugado ? 'finalizado' : enCurso ? (minuto === 46 ? 'descanso' : 'en_curso') : 'previa',
    minuto,
    golesLocal,
    golesVisitante,
    golesLocalDescanso: Math.round(golesLocal * 0.42),
    golesVisitanteDescanso: Math.round(golesVisitante * 0.42),
    jornada,
    ronda: comp.grupos ? `Grupo ${local.grupo ?? 'A'}` : `Jornada ${jornada}`,
    estadio: comp.tipo === 'seleccion' ? rnd.elige(SEDES) : (local.estadio ?? 'Estadio'),
    arbitro: rnd.elige(ARBITROS),
    estadisticas: {
      local: estadisticasEquipo(golesLocal, local.fuerza, visitante.fuerza, true, rnd),
      visitante: estadisticasEquipo(golesVisitante, visitante.fuerza, local.fuerza, false, rnd),
    },
    cuotas: {
      local: porCasa.bet365.local,
      empate: porCasa.bet365.empate,
      visitante: porCasa.bet365.visitante,
      mas25: precio(m.pMas25, 1.055, rnd),
      menos25: precio(m.pMenos25, 1.055, rnd),
      ambosMarcan: precio(m.pAmbos, 1.055, rnd),
      ambosNoMarcan: precio(1 - m.pAmbos, 1.055, rnd),
      porCasa,
    },
  };
}

// ------------------------------------------------------------------ registros

/** Los 11 que salen de inicio y los minutos de cada uno. */
function reparteMinutos(
  jugadores: Jugador[],
  partidoId: string,
): { jugador: Jugador; minutos: number; titular: boolean; sustituidoEn?: number }[] {
  const rnd = new Aleatorio(`${partidoId}-minutos`);
  // Puntua a cada jugador: su nivel mas un ruido por partido, para que haya
  // rotaciones sin que un suplente juegue siempre.
  const puntuados = jugadores.map((jug) => ({
    jug,
    p:
      jug.nivel +
      (jug.rol === 'titular' ? 9 : jug.rol === 'rotacion' ? 2 : -6) +
      rnd.rango(-4.5, 4.5),
  }));

  const porteros = puntuados.filter((x) => x.jug.posicion === 'POR').sort((a, b) => b.p - a.p);
  const campo = puntuados.filter((x) => x.jug.posicion !== 'POR').sort((a, b) => b.p - a.p);

  const once = [porteros[0], ...campo.slice(0, 10)].filter(Boolean);
  const banquillo = campo.slice(10);

  const salida: { jugador: Jugador; minutos: number; titular: boolean; sustituidoEn?: number }[] = [];
  const cambios = rnd.entero(3, 5);
  // Los cambios se los llevan los titulares peor puntuados del campo.
  const candidatos = once
    .filter((x) => x.jug.posicion !== 'POR')
    .slice()
    .sort((a, b) => a.p - b.p)
    .slice(0, cambios)
    .map((x) => x.jug.id);

  for (const x of once) {
    const sale = candidatos.includes(x.jug.id);
    const minuto = sale ? rnd.entero(55, 88) : 90;
    salida.push({
      jugador: x.jug,
      minutos: minuto,
      titular: true,
      sustituidoEn: sale ? minuto : undefined,
    });
  }
  for (let i = 0; i < cambios && i < banquillo.length; i++) {
    salida.push({
      jugador: banquillo[i].jug,
      minutos: rnd.entero(4, 34),
      titular: false,
    });
  }
  return salida;
}

/**
 * Reparte un total del equipo (goles, remates, corners...) entre los jugadores
 * en proporcion a su ratio y a los minutos que jugaron.
 */
function reparte(
  total: number,
  pesos: number[],
  rnd: Aleatorio,
): number[] {
  const suma = pesos.reduce((a, b) => a + b, 0);
  const salida = new Array(pesos.length).fill(0);
  if (suma <= 0 || total <= 0) return salida;
  for (let n = 0; n < total; n++) {
    let tirada = rnd.siguiente() * suma;
    for (let i = 0; i < pesos.length; i++) {
      tirada -= pesos[i];
      if (tirada <= 0) {
        salida[i]++;
        break;
      }
    }
  }
  return salida;
}

function registrosDeEquipo(
  partido: Partido,
  jugadores: Jugador[],
  esLocal: boolean,
  rivalId: string,
  rivalFuerza: number,
): RegistroJugador[] {
  const stats = esLocal ? partido.estadisticas.local : partido.estadisticas.visitante;
  const goles = esLocal ? partido.golesLocal : partido.golesVisitante;
  const encajados = esLocal ? partido.golesVisitante : partido.golesLocal;
  const alineados = reparteMinutos(jugadores, `${partido.id}-${esLocal ? 'L' : 'V'}`);
  const rnd = new Aleatorio(`${partido.id}-${esLocal ? 'L' : 'V'}-stats`);

  const min = alineados.map((x) => x.minutos / 90);
  // Un rival duro baja el rendimiento ofensivo y sube el trabajo defensivo.
  const dureza = Math.pow(1.02, 75 - rivalFuerza);

  const pesoGol = alineados.map((x, i) => x.jugador.ratios.goles * min[i]);
  const pesoAsis = alineados.map((x, i) => x.jugador.ratios.asistencias * min[i]);
  const pesoRemate = alineados.map((x, i) => x.jugador.ratios.remates * min[i]);
  const pesoPuerta = alineados.map((x, i) => x.jugador.ratios.rematesPuerta * min[i]);
  const pesoFalta = alineados.map((x, i) => x.jugador.ratios.faltasCometidas * min[i]);
  const pesoAmarilla = alineados.map((x, i) => x.jugador.ratios.amarillas * min[i]);

  const golesPorJugador = reparte(goles, pesoGol, rnd);
  const asistPorJugador = reparte(Math.max(0, goles - rnd.entero(0, 1)), pesoAsis, rnd);
  const rematesPorJugador = reparte(stats.remates, pesoRemate, rnd);
  const puertaPorJugador = reparte(stats.rematesPuerta, pesoPuerta, rnd);
  const faltasPorJugador = reparte(stats.faltas, pesoFalta, rnd);
  const amarillasPorJugador = reparte(stats.amarillas, pesoAmarilla, rnd);

  return alineados.map((x, i) => {
    const r = x.jugador.ratios;
    const f = min[i];
    const g = golesPorJugador[i];
    const rem = rematesPorJugador[i];
    const puerta = Math.min(rem, puertaPorJugador[i] + (g > puertaPorJugador[i] ? g : 0));
    const pases = Math.max(0, Math.round(rnd.normal(r.pases * f, r.pases * f * 0.16)));
    const precision = Math.min(99, Math.max(50, rnd.normal(r.precisionPases, 6)));
    const duelos = Math.max(0, Math.round(rnd.normal(r.duelosGanados * f * dureza, 1.4)));

    return {
      partidoId: partido.id,
      jugadorId: x.jugador.id,
      equipoId: x.jugador.equipoId,
      rivalId,
      local: esLocal,
      fecha: partido.fecha,
      minutos: x.minutos,
      titular: x.titular,
      sustituidoEn: x.sustituidoEn,
      goles: g,
      asistencias: asistPorJugador[i],
      remates: rem,
      rematesPuerta: puerta,
      rematesFuera: Math.max(0, rem - puerta - (rnd.suerte(0.3) ? 1 : 0)),
      rematesBloqueados: Math.max(0, rem - puerta - Math.max(0, rem - puerta - 1)),
      pasesClave: Math.max(0, Math.round(rnd.normal(r.pasesClave * f, 0.9))),
      regates: Math.max(0, Math.round(rnd.normal(r.regates * f * dureza, 1.0))),
      regatesIntentados: Math.max(0, Math.round(rnd.normal(r.regates * f * 1.9, 1.3))),
      faltasCometidas: faltasPorJugador[i],
      faltasRecibidas: Math.max(0, Math.round(rnd.normal(r.faltasRecibidas * f, 0.9))),
      entradas: Math.max(0, Math.round(rnd.normal(r.entradas * f / dureza, 1.0))),
      intercepciones: Math.max(0, Math.round(rnd.normal(r.intercepciones * f / dureza, 0.9))),
      despejes: Math.max(0, Math.round(rnd.normal(r.despejes * f / dureza, 1.2))),
      duelosGanados: duelos,
      duelosTotales: duelos + Math.max(0, Math.round(rnd.normal(duelos * 0.85, 1.2))),
      toquesArea: Math.max(0, Math.round(rnd.normal(r.toquesArea * f * dureza, 1.3))),
      toques: Math.max(0, Math.round(pases * 1.35 + rnd.normal(8, 4))),
      pases,
      pasesCompletados: Math.round((pases * precision) / 100),
      centros: Math.max(0, Math.round(rnd.normal(r.centros * f, 0.9))),
      centrosCompletados: Math.max(0, Math.round(rnd.normal(r.centros * f * 0.28, 0.5))),
      amarillas: Math.min(1, amarillasPorJugador[i]),
      rojas: 0,
      paradas:
        x.jugador.posicion === 'POR'
          ? Math.max(encajados > 0 ? 0 : 1, Math.round(rnd.normal(r.paradas * f, 1.1)))
          : 0,
      golesEncajados: x.jugador.posicion === 'POR' ? encajados : 0,
      xg: Number((r.xg * f * rnd.rango(0.5, 1.6)).toFixed(2)),
      xa: Number((r.xa * f * rnd.rango(0.5, 1.6)).toFixed(2)),
      nota: Number(
        Math.min(
          9.8,
          Math.max(
            4.5,
            6.1 + g * 0.9 + asistPorJugador[i] * 0.55 + puerta * 0.12 + rnd.normal(0, 0.42),
          ),
        ).toFixed(1),
      ),
    };
  });
}

// ------------------------------------------------------------------ temporada

export interface Temporada {
  competicionId: string;
  equipos: Equipo[];
  jugadores: Jugador[];
  partidos: Partido[];
  registros: RegistroJugador[];
  porEquipo: Map<string, Equipo>;
  porJugador: Map<string, Jugador>;
  porPartido: Map<string, Partido>;
  registrosPorJugador: Map<string, RegistroJugador[]>;
  registrosPorPartido: Map<string, RegistroJugador[]>;
  partidosPorEquipo: Map<string, Partido[]>;
}

const TEMPORADAS = new Map<string, Temporada>();

/*
 * Al llegar datos nuevos hay que tirar las temporadas ya montadas: llevan
 * dentro los partidos, los equipos y los registros del archivo anterior, y sin
 * esto la app seguiría enseñando la jornada de ayer.
 */
cuandoCambienLosDatos(() => TEMPORADAS.clear());

/** Jornadas jugadas y por jugar segun el tamano de la competicion. */
function calendario(nEquipos: number) {
  if (nEquipos > 40) return { pasadas: 12, futuras: 4 };
  if (nEquipos > 24) return { pasadas: 16, futuras: 6 };
  return { pasadas: 20, futuras: 8 };
}

/** Monta los indices que usan todas las pantallas. */
function indexa(
  competicionId: string,
  equipos: Equipo[],
  jugadores: Jugador[],
  partidos: Partido[],
  registros: RegistroJugador[],
): Temporada {
  partidos.sort((a, b) => a.fecha.localeCompare(b.fecha));

  const registrosPorJugador = new Map<string, RegistroJugador[]>();
  const registrosPorPartido = new Map<string, RegistroJugador[]>();
  for (const reg of registros) {
    const a = registrosPorJugador.get(reg.jugadorId) ?? [];
    a.push(reg);
    registrosPorJugador.set(reg.jugadorId, a);
    const b = registrosPorPartido.get(reg.partidoId) ?? [];
    b.push(reg);
    registrosPorPartido.set(reg.partidoId, b);
  }
  // Del mas reciente al mas antiguo: los L5 y L10 leen desde el principio.
  for (const lista of registrosPorJugador.values()) {
    lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  const partidosPorEquipo = new Map<string, Partido[]>();
  for (const p of partidos) {
    for (const id of [p.localId, p.visitanteId]) {
      const lista = partidosPorEquipo.get(id) ?? [];
      lista.push(p);
      partidosPorEquipo.set(id, lista);
    }
  }

  return {
    competicionId,
    equipos,
    jugadores,
    partidos,
    registros,
    porEquipo: new Map(equipos.map((e) => [e.id, e])),
    porJugador: new Map(jugadores.map((x) => [x.id, x])),
    porPartido: new Map(partidos.map((p) => [p.id, p])),
    registrosPorJugador,
    registrosPorPartido,
    partidosPorEquipo,
  };
}

export function temporada(competicionId: string): Temporada {
  const guardada = TEMPORADAS.get(competicionId);
  if (guardada) return guardada;

  /*
   * "Todas" no es un torneo: es la suma de todo lo descargado. Los
   * identificadores ya vienen con el prefijo de su competición
   * (`premier:arsenal`), así que se pueden juntar sin que choquen.
   */
  if (competicionId === TODAS) {
    const equipos: Equipo[] = [];
    const jugadores: Jugador[] = [];
    const partidos: Partido[] = [];
    const registros: RegistroJugador[] = [];

    for (const id of COMPETICIONES_IMPORTADAS) {
      const r = datosReales(id);
      if (!r) continue;
      equipos.push(...r.equipos);
      jugadores.push(...r.jugadores);
      partidos.push(...r.partidos);
      registros.push(...r.registros);
    }

    // Si no hay nada importado no se puede componer: cae al generador.
    if (partidos.length) {
      const armada = indexa(competicionId, equipos, jugadores, partidos, registros);
      TEMPORADAS.set(competicionId, armada);
      return armada;
    }
  }

  // Si el importador dejó datos reales de esta competición, mandan ellos.
  const reales = datosReales(competicionId);
  if (reales) {
    const armada = indexa(
      competicionId,
      reales.equipos,
      reales.jugadores,
      reales.partidos,
      reales.registros,
    );
    TEMPORADAS.set(competicionId, armada);
    return armada;
  }

  const { equipos, jugadores } = plantilla(competicionId);
  const { pasadas, futuras } = calendario(equipos.length);
  const hoy = inicioDelDia(ahora());

  const jugadoresPorEquipo = new Map<string, Jugador[]>();
  for (const jug of jugadores) {
    const lista = jugadoresPorEquipo.get(jug.equipoId) ?? [];
    lista.push(jug);
    jugadoresPorEquipo.set(jug.equipoId, lista);
  }

  const partidos: Partido[] = [];
  const registros: RegistroJugador[] = [];

  for (let jornada = 0; jornada < pasadas + futuras; jornada++) {
    const parejas = emparejamientos(equipos, jornada);
    // La jornada `pasadas` cae hoy: siempre hay partidos de hoy en la portada.
    const diaBase = hoy + (jornada - pasadas) * 4 * DIA;
    parejas.forEach(([local, visitante], i) => {
      const rnd = new Aleatorio(`${competicionId}-${jornada}-${i}-hora`);
      // Reparte los partidos entre la vispera, el dia y el siguiente.
      const desplazamiento = jornada === pasadas ? 0 : rnd.entero(-1, 1);
      const hora = rnd.elige([13, 15, 16, 18, 19, 20, 21]);
      const minutos = rnd.elige([0, 0, 15, 30, 45]);
      let fecha = diaBase + desplazamiento * DIA + hora * 3600000 + minutos * 60000;
      // Los dos primeros de la jornada de hoy se ponen a jugar ahora mismo:
      // asi la portada y la pestana de en vivo nunca estan vacias.
      if (jornada === pasadas && i < 2) {
        fecha = ahora() - (i === 0 ? 27 : 63) * 60000;
      }
      const partido = creaPartido(competicionId, local, visitante, fecha, jornada);
      partidos.push(partido);

      if (partido.estado === 'finalizado' || partido.estado === 'en_curso' || partido.estado === 'descanso') {
        const jl = jugadoresPorEquipo.get(local.id) ?? [];
        const jv = jugadoresPorEquipo.get(visitante.id) ?? [];
        registros.push(...registrosDeEquipo(partido, jl, true, visitante.id, visitante.fuerza));
        registros.push(...registrosDeEquipo(partido, jv, false, local.id, local.fuerza));
      }
    });
  }

  const resultado = indexa(competicionId, equipos, jugadores, partidos, registros);
  TEMPORADAS.set(competicionId, resultado);
  return resultado;
}

// ------------------------------------------------------- alineaciones y bajas

const FORMACIONES: Record<string, [number, number][]> = {
  // Coordenadas en % del campo: x de izquierda a derecha, y de la porteria arriba.
  '4-3-3': [
    [50, 8], [16, 26], [38, 24], [62, 24], [84, 26],
    [30, 48], [50, 45], [70, 48], [18, 74], [50, 80], [82, 74],
  ],
  '4-2-3-1': [
    [50, 8], [16, 26], [38, 24], [62, 24], [84, 26],
    [36, 44], [64, 44], [18, 64], [50, 62], [82, 64], [50, 82],
  ],
  '3-5-2': [
    [50, 8], [28, 24], [50, 22], [72, 24],
    [10, 48], [36, 46], [50, 52], [64, 46], [90, 48], [40, 80], [60, 80],
  ],
  '4-4-2': [
    [50, 8], [16, 26], [38, 24], [62, 24], [84, 26],
    [16, 52], [40, 50], [60, 50], [84, 52], [40, 80], [60, 80],
  ],
  '5-3-2': [
    [50, 8], [10, 30], [30, 24], [50, 22], [70, 24], [90, 30],
    [32, 52], [50, 50], [68, 52], [40, 80], [60, 80],
  ],
};

/** Once tipo de un equipo para un partido, con posiciones sobre el campo. */
export function alineacion(competicionId: string, partidoId: string, equipoId: string): Alineacion {
  const t = temporada(competicionId);
  const rnd = new Aleatorio(`${partidoId}-${equipoId}-once`);
  const nombres = Object.keys(FORMACIONES);
  const formacion = rnd.elige(nombres);
  const puestos = FORMACIONES[formacion];

  const plantel = t.jugadores.filter((x) => x.equipoId === equipoId);
  const porteros = plantel.filter((x) => x.posicion === 'POR').sort((a, b) => b.nivel - a.nivel);
  const defensas = plantel.filter((x) => x.posicion === 'DEF').sort((a, b) => b.nivel - a.nivel);
  const medios = plantel.filter((x) => x.posicion === 'MED').sort((a, b) => b.nivel - a.nivel);
  const delanteros = plantel.filter((x) => x.posicion === 'DEL').sort((a, b) => b.nivel - a.nivel);

  const [, d, m, dl] = formacion.split('-').map(Number);
  const nDef = d;
  const nMed = formacion.split('-').length === 4 ? m + Number(formacion.split('-')[2]) : m;
  const elegidos: string[] = [
    porteros[0]?.id,
    ...defensas.slice(0, nDef).map((x) => x.id),
    ...medios.slice(0, Math.max(0, 10 - nDef - dl)).map((x) => x.id),
    ...delanteros.slice(0, dl).map((x) => x.id),
  ].filter(Boolean);

  // Si la formacion no cuadra por falta de jugadores en una linea, completa.
  const resto = plantel.filter((x) => !elegidos.includes(x.id));
  while (elegidos.length < 11 && resto.length) elegidos.push(resto.shift()!.id);

  return {
    formacion,
    once: elegidos.slice(0, 11).map((jugadorId, i) => ({
      jugadorId,
      x: puestos[i]?.[0] ?? 50,
      y: puestos[i]?.[1] ?? 50,
    })),
    suplentes: resto.slice(0, 9).map((x) => x.id),
    confirmada: rnd.suerte(0.55),
  };
}

const TIPOS_LESION = [
  'Rotura fibrilar', 'Esguince de tobillo', 'Sobrecarga muscular', 'Lesión de rodilla',
  'Molestias en el isquiotibial', 'Fractura de metatarso', 'Problemas de espalda',
  'Contusión', 'Pubalgia', 'Tendinitis',
];

/** Bajas y dudas de un equipo. Aparecen en la pestana Lesiones del partido. */
export function lesiones(competicionId: string, equipoId: string): Lesion[] {
  const t = temporada(competicionId);
  const rnd = new Aleatorio(`${equipoId}-bajas`);
  const plantel = t.jugadores.filter((x) => x.equipoId === equipoId);
  const cuantas = rnd.entero(1, 4);
  return rnd.baraja(plantel).slice(0, cuantas).map((jug) => {
    const estado = rnd.elige(['baja', 'baja', 'duda', 'sancionado'] as const);
    const semanas = rnd.entero(1, 8);
    return {
      jugadorId: jug.id,
      nombre: jug.nombre,
      equipoId,
      tipo: estado === 'sancionado' ? 'Sanción por acumulación' : rnd.elige(TIPOS_LESION),
      estado,
      vuelta:
        estado === 'duda'
          ? 'Decide el míster'
          : estado === 'sancionado'
            ? 'Vuelve la próxima jornada'
            : `Aprox. ${semanas} semana${semanas > 1 ? 's' : ''}`,
    };
  });
}

export { ahora, inicioDelDia };
