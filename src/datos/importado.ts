import crudo from './importado.json';
import type {
  Equipo,
  Jugador,
  Partido,
  Posicion,
  RegistroJugador,
} from './tipos';

/**
 * Puente con los datos reales que deja `scripts/importar.js`. Si el archivo
 * `importado.json` tiene algo dentro para una competicion, la app usa eso; si
 * no, tira del generador de `motor.ts`.
 *
 *   node scripts/importar.js --liga premier
 */

interface CompeticionImportada {
  competicionId: string;
  nombre: string;
  temporadas: string[];
  importadoEn: string;
  fuentes: string[];
  equipos: Equipo[];
  partidos: Partido[];
  jugadores: Omit<Jugador, 'ratios'>[];
  registros: RegistroJugador[];
  aviso: string[];
}

interface Archivo {
  actualizado?: string;
  competiciones: Record<string, CompeticionImportada>;
}

/*
 * Los datos que usa la app ahora mismo.
 *
 * Arranca con el archivo que viaja dentro del paquete y se puede sustituir en
 * caliente por uno recién descargado, con `aplicaDatos`. Así la app se puede
 * publicar una vez y seguir recibiendo resultados nuevos cada día sin volver a
 * compilarla ni republicarla.
 *
 * Es `let` a propósito, aunque el resto del archivo lo lea como si fuera fijo:
 * quien lo cambia es una sola función, y esa se encarga también de tirar las
 * cachés que dependen de él.
 */
let ARCHIVO = crudo as unknown as Archivo;

/** Avisos para quien tenga que rehacer lo que había calculado con los datos viejos. */
const alCambiar: (() => void)[] = [];

/** Se apunta aquí quien mantenga una caché derivada de los datos. */
export function cuandoCambienLosDatos(rehacer: () => void): void {
  alCambiar.push(rehacer);
}

/**
 * Sustituye los datos por otros recién descargados.
 *
 * Lo delicado no es el reemplazo, son las cachés: media app guarda cosas
 * calculadas a partir de este archivo —las temporadas del motor, el índice de
 * escudos, los datos por competición— y si no se tiran, la app sigue enseñando
 * los partidos de ayer con el archivo de hoy cargado en memoria.
 */
export function aplicaDatos(nuevo: unknown): void {
  ARCHIVO = nuevo as Archivo;
  CACHE.clear();
  for (const rehacer of alCambiar) rehacer();
}

/** Cuántas competiciones trae lo que hay cargado. Para comprobar que llegó. */
export function competicionesCargadas(): number {
  return Object.keys(ARCHIVO.competiciones ?? {}).length;
}

/** Competiciones que tienen datos reales descargados. */
export const COMPETICIONES_IMPORTADAS = Object.keys(ARCHIVO.competiciones ?? {});

export function hayDatosReales(competicionId: string): boolean {
  const c = ARCHIVO.competiciones?.[competicionId];
  return !!c && c.partidos.length > 0;
}

/** Metadatos para enseñar en la app de dónde salen los números. */
export function procedencia(competicionId: string) {
  const c = ARCHIVO.competiciones?.[competicionId];
  if (!c) return null;
  return {
    fuentes: c.fuentes,
    temporadas: c.temporadas,
    importadoEn: c.importadoEn,
    conJugadores: c.registros.length > 0,
    aviso: c.aviso,
  };
}

/**
 * Los jugadores importados no traen `ratios` porque esos solo los usa el
 * generador. Se rellenan con la media real del propio jugador para que las
 * pantallas que los leen sigan funcionando.
 */
function conRatios(
  jugador: Omit<Jugador, 'ratios'>,
  registros: RegistroJugador[],
): Jugador {
  const n = Math.max(1, registros.length);
  const por90 = (f: (r: RegistroJugador) => number) => {
    const minutos = registros.reduce((a, r) => a + r.minutos, 0);
    if (!minutos) return 0;
    return (registros.reduce((a, r) => a + f(r), 0) / minutos) * 90;
  };
  const media = (f: (r: RegistroJugador) => number) =>
    registros.reduce((a, r) => a + f(r), 0) / n;

  return {
    ...jugador,
    posicion: jugador.posicion as Posicion,
    ratios: {
      goles: por90((r) => r.goles),
      asistencias: por90((r) => r.asistencias),
      remates: por90((r) => r.remates),
      rematesPuerta: por90((r) => r.rematesPuerta),
      pasesClave: por90((r) => r.pasesClave),
      regates: por90((r) => r.regates),
      faltasCometidas: por90((r) => r.faltasCometidas),
      faltasRecibidas: por90((r) => r.faltasRecibidas),
      entradas: por90((r) => r.entradas),
      intercepciones: por90((r) => r.intercepciones),
      despejes: por90((r) => r.despejes),
      duelosGanados: por90((r) => r.duelosGanados),
      toquesArea: por90((r) => r.toquesArea),
      amarillas: por90((r) => r.amarillas),
      precisionPases: media((r) => (r.pases ? (r.pasesCompletados / r.pases) * 100 : 0)),
      pases: por90((r) => r.pases),
      centros: por90((r) => r.centros),
      paradas: por90((r) => r.paradas),
      xg: por90((r) => r.xg),
      xa: por90((r) => r.xa),
    },
  };
}

/**
 * Competiciones que se enseñan en la app. En cuanto hay algo importado, solo
 * salen las que tienen datos reales: así el Mundial, la Eurocopa o la Copa
 * América desaparecen de la lista mientras no se juegan y vuelven solas en
 * cuanto se importan otra vez. No se borra nada, solo se oculta.
 */
/** Todos los equipos de todas las competiciones importadas. */
export function equiposImportados(): Equipo[] {
  return Object.values(ARCHIVO.competiciones ?? {}).flatMap((c) => c.equipos);
}

export function competicionVisible(competicionId: string): boolean {
  if (!COMPETICIONES_IMPORTADAS.length) return true;
  // "Todas" no tiene archivo propio: existe mientras haya algo descargado.
  if (competicionId === 'todas') return true;
  return hayDatosReales(competicionId);
}

/** Clave para reconocer al mismo equipo en competiciones distintas. */
export function claveEquipo(nombre: string): string {
  return (nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Todos los partidos de un equipo en TODAS las competiciones importadas, no
 * solo en la que se esté mirando. Es lo que hace que un equipo peruano que
 * juega la Libertadores arrastre también lo que hace en su liga, y que un
 * modesto de Championship que cae en la FA Cup traiga su historial.
 */
export function partidosDelEquipoEnTodas(
  nombreEquipo: string,
  bandera?: string,
): { competicionId: string; partido: Partido; esLocal: boolean }[] {
  const clave = claveEquipo(nombreEquipo);
  const salida: { competicionId: string; partido: Partido; esLocal: boolean }[] = [];

  for (const [competicionId, c] of Object.entries(ARCHIVO.competiciones ?? {})) {
    /*
     * El nombre no basta para saber que es el mismo club.
     *
     * Hay homónimos en países distintos —el River Plate argentino y el de
     * Montevideo— y buscando solo por nombre se mezclaban: en la ficha del
     * argentino aparecía "Primera División · 1 partido", que es la liga
     * uruguaya del otro. Con la bandera se separan, y quien no la pase se
     * queda con el comportamiento de antes.
     */
    const suyos = c.equipos.filter(
      (e) => claveEquipo(e.nombre) === clave && (!bandera || !e.bandera || e.bandera === bandera),
    );
    if (!suyos.length) continue;
    const ids = new Set(suyos.map((e) => e.id));
    for (const p of c.partidos) {
      // Se devuelven completos: quien los recibe lee estadísticas directas.
      if (ids.has(p.localId)) salida.push({ competicionId, partido: completaPartido(p), esLocal: true });
      else if (ids.has(p.visitanteId)) salida.push({ competicionId, partido: completaPartido(p), esLocal: false });
    }
  }
  salida.sort((a, b) => a.partido.fecha.localeCompare(b.partido.fecha));
  return salida;
}

export interface PartidoDeTodas {
  competicionId: string;
  partidoId: string;
  fecha: string;
  estado: string;
  minuto?: number;
  local: Equipo;
  visitante: Equipo;
  golesLocal: number;
  golesVisitante: number;
}

/**
 * Absolutamente todos los partidos descargados, de todas las competiciones y
 * en un solo listado. Es lo que da de comer a la pantalla "Todos los
 * partidos": el resto de la app siempre trabaja dentro de una competición.
 */
export function todosLosPartidos(): PartidoDeTodas[] {
  const salida: PartidoDeTodas[] = [];

  for (const [competicionId, c] of Object.entries(ARCHIVO.competiciones ?? {})) {
    const porId = new Map(c.equipos.map((e) => [e.id, e]));
    for (const p of c.partidos) {
      const local = porId.get(p.localId);
      const visitante = porId.get(p.visitanteId);
      if (!local || !visitante) continue;
      salida.push({
        competicionId,
        partidoId: p.id,
        fecha: p.fecha,
        estado: p.estado,
        minuto: p.minuto,
        local,
        visitante,
        golesLocal: p.golesLocal ?? 0,
        golesVisitante: p.golesVisitante ?? 0,
      });
    }
  }
  return salida;
}

export interface ProximoPartido {
  competicionId: string;
  partidoId: string;
  fecha: string;
  estado: string;
  minuto?: number;
  local: Equipo;
  visitante: Equipo;
  golesLocal: number;
  golesVisitante: number;
}

/**
 * Próximos partidos de TODAS las competiciones, del más cercano al más lejano
 * y con lo que se está jugando ahora mismo por delante. Es lo que sale en la
 * tira de la portada: da igual qué competición esté activa.
 */
export function proximosDeTodas(limite = 30): ProximoPartido[] {
  const salida: ProximoPartido[] = [];

  /*
   * No basta con descartar los finalizados: si una competición se importó hace
   * días, sus partidos siguen guardados como "previa" aunque ya se hayan
   * jugado. Un partido cuya hora pasó hace más de tres horas no es próximo
   * diga lo que diga el archivo.
   */
  const corte = Date.now() - 3 * 3600_000;

  for (const [competicionId, c] of Object.entries(ARCHIVO.competiciones ?? {})) {
    const porId = new Map(c.equipos.map((e) => [e.id, e]));
    for (const p of c.partidos) {
      if (p.estado === 'finalizado') continue;
      const empieza = new Date(p.fecha).getTime();
      if (Number.isFinite(empieza) && empieza < corte) continue;
      const local = porId.get(p.localId);
      const visitante = porId.get(p.visitanteId);
      if (!local || !visitante) continue;
      salida.push({
        competicionId,
        partidoId: p.id,
        fecha: p.fecha,
        estado: p.estado,
        minuto: p.minuto,
        local,
        visitante,
        golesLocal: p.golesLocal,
        golesVisitante: p.golesVisitante,
      });
    }
  }

  const enJuego = (e: string) => (e === 'en_curso' || e === 'descanso' ? 0 : 1);
  salida.sort(
    (a, b) => enJuego(a.estado) - enJuego(b.estado) || a.fecha.localeCompare(b.fecha),
  );
  return salida.slice(0, limite);
}

/** En cuántas competiciones importadas aparece este equipo. */
export function competicionesDelEquipo(nombreEquipo: string): string[] {
  const clave = claveEquipo(nombreEquipo);
  return Object.entries(ARCHIVO.competiciones ?? {})
    .filter(([, c]) => c.equipos.some((e) => claveEquipo(e.nombre) === clave))
    .map(([id]) => id);
}

export interface DatosReales {
  equipos: Equipo[];
  jugadores: Jugador[];
  partidos: Partido[];
  registros: RegistroJugador[];
}

/**
 * Los registros se guardan sin los campos que valen cero: ESPN no publica
 * pases clave, regates, entradas ni duelos, y escribir quince ceros por cada
 * una de las veinte mil líneas engordaba el archivo sin aportar nada. Aquí se
 * reponen para que el resto de la app no tenga que saberlo.
 */
const REGISTRO_VACIO = {
  minutos: 0, titular: false, goles: 0, asistencias: 0, remates: 0, rematesPuerta: 0,
  rematesFuera: 0, rematesBloqueados: 0, pasesClave: 0, regates: 0, regatesIntentados: 0,
  faltasCometidas: 0, faltasRecibidas: 0, entradas: 0, intercepciones: 0, despejes: 0,
  duelosGanados: 0, duelosTotales: 0, toquesArea: 0, toques: 0, pases: 0, pasesCompletados: 0,
  centros: 0, centrosCompletados: 0, amarillas: 0, rojas: 0, paradas: 0, golesEncajados: 0,
  xg: 0, xa: 0, nota: 6.2,
};

function completaRegistro(r: Partial<RegistroJugador>): RegistroJugador {
  return { ...REGISTRO_VACIO, ...r } as RegistroJugador;
}

/** Lo mismo con las estadísticas del partido, que también van sin ceros. */
const ESTADISTICAS_VACIAS = {
  remates: 0, rematesPuerta: 0, posesion: 0, corners: 0, faltas: 0,
  amarillas: 0, rojas: 0, fueraJuego: 0, xg: 0, pases: 0, precisionPases: 0,
};

function completaPartido(p: Partido): Partido {
  return {
    ...p,
    estadisticas: {
      local: { ...ESTADISTICAS_VACIAS, ...p.estadisticas?.local },
      visitante: { ...ESTADISTICAS_VACIAS, ...p.estadisticas?.visitante },
    },
  };
}

const CACHE = new Map<string, DatosReales>();

/** Devuelve los datos reales de una competición, ya listos para el motor. */
export function datosReales(competicionId: string): DatosReales | null {
  const guardado = CACHE.get(competicionId);
  if (guardado) return guardado;

  const c = ARCHIVO.competiciones?.[competicionId];
  if (!c || !c.partidos.length) return null;

  const registros = c.registros.map(completaRegistro);
  const partidos = c.partidos.map(completaPartido);
  const porJugador = new Map<string, RegistroJugador[]>();
  for (const r of registros) {
    const lista = porJugador.get(r.jugadorId) ?? [];
    lista.push(r);
    porJugador.set(r.jugadorId, lista);
  }

  const resultado: DatosReales = {
    equipos: c.equipos,
    jugadores: c.jugadores.map((j) => conRatios(j, porJugador.get(j.id) ?? [])),
    partidos,
    registros,
  };

  CACHE.set(competicionId, resultado);
  return resultado;
}
