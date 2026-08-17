import { Aleatorio } from '@/utiles/aleatorio';
import { ARGENTINA, BRASILEIRAO, LIGAMX, MLS, OTROS_AMERICA } from './clubes-america';
import { BUNDESLIGA, LALIGA, LIGUE1, OTROS_EUROPA, PREMIER, SERIEA } from './clubes-europa';
import type { FilaClub } from './club';
import { competicion } from './competiciones';
import { nombreClub, nombreJugador } from './nombres';
import { SELECCIONES } from './selecciones';
import type { Equipo, Jugador, Posicion, RatiosJugador } from './tipos';

/** Clubes escritos a mano, por competicion. */
const CLUBES: Record<string, FilaClub[]> = {
  premier: PREMIER,
  laliga: LALIGA,
  seriea: SERIEA,
  bundesliga: BUNDESLIGA,
  ligue1: LIGUE1,
  ligamx: LIGAMX,
  mls: MLS,
  brasileirao: BRASILEIRAO,
  argentina: ARGENTINA,
};

/** Clubes que se reparten entre las copas y las competiciones continentales. */
const INVITADOS: Record<string, FilaClub[]> = {
  champions: [
    ...PREMIER.slice(0, 5), ...LALIGA.slice(0, 4), ...SERIEA.slice(0, 4),
    ...BUNDESLIGA.slice(0, 4), ...LIGUE1.slice(0, 3), ...OTROS_EUROPA.slice(0, 16),
  ],
  europaleague: [
    ...PREMIER.slice(5, 9), ...LALIGA.slice(4, 8), ...SERIEA.slice(4, 8),
    ...BUNDESLIGA.slice(4, 8), ...LIGUE1.slice(3, 7), ...OTROS_EUROPA.slice(8, 18),
  ],
  conference: [
    ...PREMIER.slice(9, 12), ...LALIGA.slice(8, 12), ...SERIEA.slice(8, 12),
    ...BUNDESLIGA.slice(8, 12), ...LIGUE1.slice(7, 11), ...OTROS_EUROPA.slice(10, 19),
  ],
  copadelrey: LALIGA,
  facup: PREMIER,
  carabao: PREMIER,
  coppa: SERIEA,
  dfbpokal: BUNDESLIGA,
  coupefrance: LIGUE1,
  portugal: OTROS_EUROPA.slice(0, 4),
  eredivisie: OTROS_EUROPA.slice(4, 7),
  turquia: OTROS_EUROPA.slice(7, 9),
  escocia: OTROS_EUROPA.slice(10, 12),
  libertadores: [...BRASILEIRAO.slice(0, 6), ...ARGENTINA.slice(0, 4), ...OTROS_AMERICA],
  sudamericana: [...BRASILEIRAO.slice(6, 12), ...ARGENTINA.slice(4, 8), ...OTROS_AMERICA.slice(4)],
  concachampions: [...LIGAMX.slice(0, 8), ...MLS.slice(0, 8)],
  colombia: OTROS_AMERICA.slice(0, 2),
  chile: OTROS_AMERICA.slice(2, 4),
  peru: OTROS_AMERICA.slice(4, 5),
  bolivia: OTROS_AMERICA.slice(5, 8),
  uruguay: OTROS_AMERICA.slice(8, 10),
  paraguay: OTROS_AMERICA.slice(10, 12),
  ecuador: OTROS_AMERICA.slice(12, 14),
};

/** Cuantos equipos tiene cada competicion cuando hay que inventarlos. */
const TAMANOS: Record<string, number> = {
  championship: 24, saudi: 18, turquia: 18, belgica: 16, escocia: 12,
  suiza: 12, austria: 12, grecia: 14, dinamarca: 12, noruega: 16,
  suecia: 16, polonia: 18, chequia: 16, croacia: 10, serbia: 16,
  rumania: 16, ucrania: 16, japon: 20, corea: 12, australia: 13,
  china: 16, colombia: 20, chile: 16, peru: 19, bolivia: 16,
  ecuador: 16, uruguay: 16, paraguay: 12, venezuela: 14, egipto: 18,
  sudafrica: 16, marruecos: 16, portugal: 18, eredivisie: 18,
  euro: 24, copaamerica: 16, nationsleague: 16, eliminatoriassud: 10,
  libertadores: 32, sudamericana: 32, concachampions: 27,
  champions: 36, europaleague: 36, conference: 36,
  copadelrey: 32, facup: 32, carabao: 32, coppa: 20, dfbpokal: 32, coupefrance: 32,
};

// ---------------------------------------------------------------- posiciones

const POSICIONES: Posicion[] = ['POR', 'DEF', 'MED', 'DEL'];

/** Reparto de una plantilla de 20: 2 porteros, 7 defensas, 7 medios, 4 delanteros. */
const REPARTO: Posicion[] = [
  'POR', 'POR', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF', 'DEF',
  'MED', 'MED', 'MED', 'MED', 'MED', 'MED', 'MED', 'DEL', 'DEL', 'DEL', 'DEL',
];

/**
 * Ratios por 90 minutos. Salen de la posicion y se escalan con el nivel, que
 * es lo que hace que Haaland tire mas que un delantero de mitad de tabla.
 */
export function ratiosDe(posicion: Posicion, nivel: number, rnd: Aleatorio): RatiosJugador {
  // 1.0 es un jugador de 75. Un 90 multiplica por ~1.6, un 62 por ~0.6.
  const k = Math.pow(1.033, nivel - 75);
  const v = (base: number, dispersion = 0.22) =>
    Math.max(0, base * k * rnd.rango(1 - dispersion, 1 + dispersion));

  switch (posicion) {
    case 'POR':
      return {
        goles: 0, asistencias: v(0.02), remates: v(0.03), rematesPuerta: v(0.01),
        pasesClave: v(0.08), regates: v(0.05), faltasCometidas: v(0.1),
        faltasRecibidas: v(0.1), entradas: v(0.05), intercepciones: v(0.15),
        despejes: v(1.1), duelosGanados: v(0.6), toquesArea: v(4.5),
        amarillas: v(0.06), precisionPases: 74 + (nivel - 70) * 0.35, pases: v(30),
        centros: 0, paradas: v(3.1, 0.18), xg: 0, xa: v(0.02),
      };
    case 'DEF':
      return {
        goles: v(0.06), asistencias: v(0.08), remates: v(0.6), rematesPuerta: v(0.2),
        pasesClave: v(0.6), regates: v(0.5), faltasCometidas: v(1.0),
        faltasRecibidas: v(0.7), entradas: v(2.1), intercepciones: v(1.5),
        despejes: v(3.2), duelosGanados: v(5.0), toquesArea: v(0.7),
        amarillas: v(0.19), precisionPases: 79 + (nivel - 70) * 0.4, pases: v(52),
        centros: v(1.0), paradas: 0, xg: v(0.07), xa: v(0.07),
      };
    case 'MED':
      return {
        goles: v(0.16), asistencias: v(0.18), remates: v(1.3), rematesPuerta: v(0.45),
        pasesClave: v(1.5), regates: v(1.2), faltasCometidas: v(1.2),
        faltasRecibidas: v(1.4), entradas: v(1.8), intercepciones: v(1.2),
        despejes: v(1.0), duelosGanados: v(4.6), toquesArea: v(1.6),
        amarillas: v(0.21), precisionPases: 82 + (nivel - 70) * 0.35, pases: v(58),
        centros: v(1.2), paradas: 0, xg: v(0.17), xa: v(0.18),
      };
    default:
      return {
        goles: v(0.46), asistencias: v(0.2), remates: v(2.7), rematesPuerta: v(1.15),
        pasesClave: v(1.4), regates: v(1.9), faltasCometidas: v(0.9),
        faltasRecibidas: v(1.6), entradas: v(0.6), intercepciones: v(0.4),
        despejes: v(0.5), duelosGanados: v(3.6), toquesArea: v(4.6),
        amarillas: v(0.14), precisionPases: 76 + (nivel - 70) * 0.35, pases: v(31),
        centros: v(1.0), paradas: 0, xg: v(0.48), xa: v(0.19),
      };
  }
}

function rolDe(indice: number): Jugador['rol'] {
  if (indice < 11) return 'titular';
  if (indice < 16) return 'rotacion';
  return 'suplente';
}

/** Construye el objeto Jugador a partir de la linea "Nombre|POS|dorsal|nivel". */
function desdeLinea(
  linea: string,
  equipoId: string,
  indice: number,
  pais: string,
  bandera: string,
  rnd: Aleatorio,
): Jugador {
  const [nombre, pos, dorsal, nivel] = linea.split('|');
  const posicion = (POSICIONES.includes(pos as Posicion) ? pos : 'MED') as Posicion;
  const n = Number(nivel) || 70;
  return {
    id: `${equipoId}-${indice}`,
    nombre: nombre.trim(),
    equipoId,
    posicion,
    dorsal: Number(dorsal) || indice + 1,
    edad: rnd.entero(19, 34),
    pais,
    bandera,
    nivel: n,
    rol: rolDe(indice),
    ratios: ratiosDe(posicion, n, rnd),
  };
}

/** Rellena hasta 20 jugadores con nombres del banco de la competicion. */
function completa(
  jugadores: Jugador[],
  equipoId: string,
  competicionId: string,
  fuerza: number,
  pais: string,
  bandera: string,
  rnd: Aleatorio,
): Jugador[] {
  const usados = jugadores.map((x) => x.posicion);
  const faltan = REPARTO.slice();
  // Quita del reparto las posiciones que ya estan cubiertas.
  for (const p of usados) {
    const i = faltan.indexOf(p);
    if (i >= 0) faltan.splice(i, 1);
  }
  const dorsales = new Set(jugadores.map((x) => x.dorsal));
  let libre = 1;
  const siguienteDorsal = () => {
    while (dorsales.has(libre)) libre++;
    dorsales.add(libre);
    return libre;
  };

  for (let i = 0; i < faltan.length && jugadores.length < 20; i++) {
    const posicion = faltan[i];
    const indice = jugadores.length;
    const nivel = Math.round(fuerza - rnd.rango(4, 12));
    jugadores.push({
      id: `${equipoId}-${indice}`,
      nombre: nombreJugador(competicionId, rnd.entero(0, 9999), pais),
      equipoId,
      posicion,
      dorsal: siguienteDorsal(),
      edad: rnd.entero(18, 33),
      pais,
      bandera,
      nivel,
      rol: rolDe(indice),
      ratios: ratiosDe(posicion, nivel, rnd),
    });
  }
  return jugadores;
}

// ------------------------------------------------------------------ montaje

export interface PlantillaCompeticion {
  equipos: Equipo[];
  jugadores: Jugador[];
}

const CACHE = new Map<string, PlantillaCompeticion>();

function desdeClubes(competicionId: string, clubes: FilaClub[]): PlantillaCompeticion {
  const comp = competicion(competicionId);
  const equipos: Equipo[] = [];
  const jugadores: Jugador[] = [];

  clubes.forEach((club, i) => {
    // El id lleva la competicion delante para que un club invitado a la
    // Champions no pise al mismo club en su liga.
    const equipoId = `${competicionId}:${club.id}`;
    const rnd = new Aleatorio(`${equipoId}-plantilla`);
    equipos.push({
      id: equipoId,
      nombre: club.nombre,
      corto: club.corto,
      bandera: comp.bandera,
      competicionId,
      fuerza: club.fuerza,
      ataque: club.ataque,
      defensa: club.defensa,
      color: club.color,
      ciudad: club.ciudad,
      estadio: club.estadio,
      grupo: comp.grupos ? comp.grupos[i % comp.grupos.length] : undefined,
    });
    const propios = club.jugadores.map((linea, k) =>
      desdeLinea(linea, equipoId, k, comp.pais, comp.bandera, rnd),
    );
    jugadores.push(
      ...completa(propios, equipoId, competicionId, club.fuerza, comp.pais, comp.bandera, rnd),
    );
  });

  return { equipos, jugadores };
}

function inventados(competicionId: string): PlantillaCompeticion {
  const comp = competicion(competicionId);
  const total = TAMANOS[competicionId] ?? 16;
  const base = INVITADOS[competicionId] ?? [];
  const equipos: Equipo[] = [];
  const jugadores: Jugador[] = [];

  for (let i = 0; i < total; i++) {
    const real = base[i];
    const rnd = new Aleatorio(`${competicionId}-eq-${i}`);
    if (real) {
      const equipoId = `${competicionId}:${real.id}`;
      equipos.push({
        id: equipoId,
        nombre: real.nombre,
        corto: real.corto,
        bandera: comp.bandera,
        competicionId,
        fuerza: real.fuerza,
        ataque: real.ataque,
        defensa: real.defensa,
        color: real.color,
        ciudad: real.ciudad,
        estadio: real.estadio,
        grupo: comp.grupos ? comp.grupos[i % comp.grupos.length] : undefined,
      });
      const propios = real.jugadores.map((linea, k) =>
        desdeLinea(linea, equipoId, k, comp.pais, comp.bandera, rnd),
      );
      jugadores.push(
        ...completa(propios, equipoId, competicionId, real.fuerza, comp.pais, comp.bandera, rnd),
      );
      continue;
    }

    const { nombre, corto, ciudad } = nombreClub(competicionId, i);
    const equipoId = `${competicionId}:gen${i}`;
    // Los primeros de la lista son los fuertes: da una tabla con jerarquia.
    const fuerza = Math.round(comp.nivel + 8 - (i / total) * 16 + rnd.rango(-2, 2));
    equipos.push({
      id: equipoId,
      nombre,
      corto: `${corto}${i % 3 === 0 ? '' : ''}`,
      bandera: comp.bandera,
      competicionId,
      fuerza,
      ataque: Math.round(fuerza + rnd.rango(-3, 3)),
      defensa: Math.round(fuerza + rnd.rango(-3, 3)),
      color: ['#E30613', '#0B2A6B', '#00A650', '#FFE500', '#000000', '#8A1E8A'][i % 6],
      ciudad,
      estadio: `Estadio de ${ciudad}`,
      grupo: comp.grupos ? comp.grupos[i % comp.grupos.length] : undefined,
    });
    jugadores.push(
      ...completa([], equipoId, competicionId, fuerza, comp.pais, comp.bandera, rnd),
    );
  }

  return { equipos, jugadores };
}

function selecciones(competicionId: string): PlantillaCompeticion {
  const comp = competicion(competicionId);
  const equipos: Equipo[] = [];
  const jugadores: Jugador[] = [];

  SELECCIONES.forEach((s) => {
    const equipoId = `${competicionId}:${s.id}`;
    const rnd = new Aleatorio(`${equipoId}-plantilla`);
    equipos.push({
      id: equipoId,
      nombre: s.nombre,
      corto: s.corto,
      bandera: s.bandera,
      competicionId,
      grupo: s.grupo,
      fuerza: s.fuerza,
      ataque: s.ataque,
      defensa: s.defensa,
      color: s.color,
      ciudad: s.pais,
      // Una seleccion no tiene estadio propio: el del partido lo pone el motor.
      estadio: 'Selección nacional',
    });
    const propios = s.jugadores.map((linea, k) =>
      desdeLinea(linea, equipoId, k, s.pais, s.bandera, rnd),
    );
    jugadores.push(
      ...completa(propios, equipoId, competicionId, s.fuerza, s.pais, s.bandera, rnd),
    );
  });

  return { equipos, jugadores };
}

/** Plantillas de una competicion. Se calcula una vez y se guarda en memoria. */
export function plantilla(competicionId: string): PlantillaCompeticion {
  const guardada = CACHE.get(competicionId);
  if (guardada) return guardada;

  let resultado: PlantillaCompeticion;
  if (competicionId === 'mundial' || competicion(competicionId).tipo === 'seleccion') {
    resultado = selecciones(competicionId);
  } else if (CLUBES[competicionId]) {
    resultado = desdeClubes(competicionId, CLUBES[competicionId]);
  } else {
    resultado = inventados(competicionId);
  }

  CACHE.set(competicionId, resultado);
  return resultado;
}
