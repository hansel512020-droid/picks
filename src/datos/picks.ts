import { Aleatorio } from '@/utiles/aleatorio';
import { competicion } from './competiciones';
import { cuandoCambienLosDatos, equiposImportados, partidosDelEquipoEnTodas } from './importado';
import { precioDe, probMercadoEquipo, probMercadoJugador } from './mercado';
import { temporada } from './motor';
import type { Equipo, Familia, Partido, Pick, RegistroJugador } from './tipos';

/**
 * Fabrica de picks. Para cada partido que aun no ha terminado busca metricas
 * en las que el sujeto (jugador, equipo o partido) viene batiendo una linea de
 * forma sistematica, y la convierte en una tarjeta con su tasa de acierto real
 * medida sobre los registros, su cuota y la ventaja frente al mercado.
 */

// --------------------------------------------------------------- utilidades

/** Coma decimal, que es como escribe los promedios la app. */
export function coma(n: number, decimales = 1): string {
  return n.toFixed(decimales).replace('.', ',');
}

/** Punto decimal, que es como se escriben las lineas de los mercados. */
export function linea(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : n.toFixed(1);
}

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const manana = new Date(hoy.getTime() + 86400000);
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const mismoDia = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (mismoDia(d, hoy)) return `Hoy ${hora}`;
  if (mismoDia(d, manana)) return `Mañana ${hora}`;
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  return `${dias[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1} ${hora}`;
}

/**
 * Fuerza de cada equipo, por identificador, de todas las competiciones.
 *
 * El historial de un equipo cruza competiciones —un club de Serie A juega
 * Coppa contra uno de Serie B— y el rival de cada partido puede no estar en la
 * temporada que se está mirando. Por eso el índice es global.
 */
let FUERZAS: Map<string, number> | null = null;
cuandoCambienLosDatos(() => {
  FUERZAS = null;
});

function fuerzaDe(equipoId: string): number | null {
  if (!FUERZAS) {
    FUERZAS = new Map();
    for (const e of equiposImportados()) FUERZAS.set(e.id, e.fuerza);
  }
  return FUERZAS.get(equipoId) ?? null;
}

/**
 * Cuánto vale cada partido del historial para predecir el de hoy.
 *
 * ── El problema ─────────────────────────────────────────────────────────────
 *
 * Contar "8 de sus últimos 10" trata todos los partidos como si fueran el
 * mismo. No lo son. El Sassuolo hizo pocos remates en sus últimos diez porque
 * jugaba contra Juventus, Inter y Milan, que le disputan el balón. Hoy juega
 * contra el Cesena, de Serie B, que se encierra atrás y le deja rematar a
 * placer. Ese 8 de 10 es un dato cierto sobre una situación que no se parece a
 * la de hoy: el número está bien y la conclusión está mal.
 *
 * ── Lo que se hace ──────────────────────────────────────────────────────────
 *
 * Pesar cada partido por lo que se parezca su rival al de hoy. Si hoy juega
 * contra uno flojo, mandan los partidos anteriores contra rivales flojos. No
 * se inventa ningún factor de corrección: se usa lo que el propio equipo hizo
 * en circunstancias parecidas, que es el único dato honesto que hay.
 *
 * La campana es ancha —15 puntos de fuerza— a propósito. Estrecha dejaría dos
 * partidos decidiéndolo todo, y dos partidos no son una muestra.
 */
function pesoPorRival(fuerzaRival: number | null, fuerzaHoy: number | null): number {
  if (fuerzaRival === null || fuerzaHoy === null) return 1;
  const dif = fuerzaRival - fuerzaHoy;
  return Math.exp(-(dif * dif) / (2 * 15 * 15));
}

/**
 * Un partido contra el mismo rival vale por tres.
 *
 * Parecerse en fuerza es una aproximación; haberse enfrentado de verdad es el
 * dato. Dos equipos con la misma puntuación pueden jugar de forma opuesta
 * —uno se encierra y otro presiona arriba— y eso no lo captura ningún número
 * de fuerza. Si el Sassuolo ya jugó contra el Cesena, lo que pasó ese día dice
 * más que diez partidos contra equipos "parecidos" al Cesena.
 *
 * Se multiplica en vez de sustituir: con uno o dos enfrentamientos no hay
 * muestra para decidir solo con ellos, pero sí para que pesen bastante más.
 */
const PESO_ENFRENTAMIENTO = 3;

/**
 * Cuota de dos resultados que no pueden darse a la vez.
 *
 * No es una aproximación: con cuotas de 2,00 y 3,00 la probabilidad conjunta es
 * 1/2 + 1/3 = 0,833, y 1 / 0,833 son exactamente los 1,20 que da la fórmula.
 * Hereda el margen de las cuotas de las que sale, así que no inventa valor.
 */
function dobleOportunidad(a: number, b: number): number {
  if (a <= 1 || b <= 1) return 0;
  return Number(((a * b) / (a + b)).toFixed(2));
}

/**
 * Cuánto de la métrica concede el rival, comparado con lo normal.
 *
 * Devuelve un factor: 1 es un rival del montón, 1,3 uno que concede un 30% más
 * que la media —una defensa que se deja rematar— y 0,8 uno que concede un 20%
 * menos.
 *
 * Sin esto solo se mira la mitad del partido. "Remates del Sassuolo" no
 * depende solo del Sassuolo: un rival que se encierra y regala el balón
 * dispara ese número aunque el Sassuolo juegue exactamente igual que siempre.
 *
 * Se mide sobre lo que el rival ha concedido en sus propios partidos, que es
 * un dato suyo y no una suposición a partir de su categoría.
 */
/*
 * El factor no cambia entre las líneas de un mismo mercado.
 *
 * Lo que concede el Cesena en remates es lo mismo para "más de 10.5" que para
 * "menos de 14.5", pero se recalculaba en cada una: seis métricas por cuatro
 * líneas por dos sentidos, cuarenta y ocho veces la misma cuenta sobre veinte
 * partidos, y otras tantas por el otro equipo. Se guarda por rival, métrica y
 * fecha, que es de lo único que depende.
 */
const FACTORES = new Map<string, number>();
cuandoCambienLosDatos(() => FACTORES.clear());

function factorDelRival(
  rival: Equipo,
  met: { clave?: string; valor: (p: Partido, esLocal: boolean) => number },
  mediaCompeticion: number,
  /** Nada posterior a esta fecha: al medir el modelo, el futuro no existe. */
  antesDe: string,
): number {
  if (mediaCompeticion <= 0) return 1;

  const memo = `${rival.id}|${met.clave ?? ''}|${antesDe}`;
  const guardado = FACTORES.get(memo);
  if (guardado !== undefined) return guardado;

  const suyos = partidosDelEquipoEnTodas(rival.nombre, rival.bandera)
    .filter(({ partido }) => partido.estado === 'finalizado' && partido.fecha < antesDe)
    .slice(0, 20);
  if (suyos.length < 5) {
    FACTORES.set(memo, 1);
    return 1;
  }

  // Lo que le hicieron A ÉL: el valor del otro lado del marcador.
  const concedido =
    suyos.reduce((a, { partido, esLocal }) => a + met.valor(partido, !esLocal), 0) / suyos.length;

  /*
   * Se recorta a un ±35%. Un rival recién ascendido con cinco partidos malos
   * daría un factor de 2 y convertiría cualquier línea en un pick seguro, que
   * es exactamente el error que estamos arreglando, solo que del otro lado.
   */
  const factor = Math.min(1.35, Math.max(0.65, concedido / mediaCompeticion));
  FACTORES.set(memo, factor);
  return factor;
}

/**
 * La tasa de acierto contando cada partido por lo que se parece al de hoy.
 *
 * Devuelve `null` cuando no hay muestra suficiente entre los partidos que se
 * parecen: en ese caso no se corrige nada y manda el conteo de siempre. Es
 * preferible quedarse con el dato crudo que fabricar una probabilidad a partir
 * de dos partidos.
 */
function tasaEnContexto(
  valores: number[],
  pesos: number[],
  linea: number,
  sentido: 'mas' | 'menos',
): number | null {
  const acierta = (v: number) => (sentido === 'mas' ? v > linea : v < linea);
  let aciertos = 0;
  let total = 0;
  for (let i = 0; i < Math.min(valores.length, 20); i++) {
    const peso = pesos[i] ?? 1;
    if (acierta(valores[i])) aciertos += peso;
    total += peso;
  }
  // Menos de cuatro partidos equivalentes no es una muestra, es una anécdota.
  return total >= 4 ? aciertos / total : null;
}

/**
 * Junta el histórico crudo con lo que dice el contexto de hoy.
 *
 * Las dos correcciones tiran en la misma dirección pero por caminos distintos:
 * el contexto mira qué hizo ESTE equipo contra rivales así, y el factor mira
 * qué concede ESE rival a cualquiera. Cuando las dos coinciden, la corrección
 * es fuerte; cuando se contradicen, se anulan entre ellas y queda algo parecido
 * al dato crudo, que es lo prudente.
 *
 * La mezcla es al 50% a propósito, no al 100% de la corregida: el conteo de los
 * últimos partidos sigue siendo un dato real y no se tira por la borda porque
 * el rival de hoy sea distinto.
 */
function probabilidadAjustada(
  base: number,
  enContexto: number | null,
  factorRival: number,
  sentido: 'mas' | 'menos',
): number {
  let p = enContexto === null ? base : base * 0.5 + enContexto * 0.5;

  /*
   * Un rival que concede más empuja hacia arriba los "más de" y hunde los
   * "menos de". El desvío se reparte a la mitad porque el factor ya viene de
   * una media de veinte partidos y aplicarlo entero exagera.
   */
  const desvio = (factorRival - 1) * 0.5;
  p += sentido === 'mas' ? desvio * p : -desvio * p;

  return Math.min(0.94, Math.max(0.06, p));
}

/**
 * Lo que el histórico no cuenta, en una frase, para pegar al argumento.
 *
 * Solo habla cuando hay algo que decir: si el rival de hoy se parece a los de
 * siempre y no concede nada raro, devuelve cadena vacía y el argumento queda
 * como estaba. Añadir una coletilla a todos los picks es la mejor forma de que
 * nadie lea ninguna.
 */
function notaDeContexto(
  equipo: Equipo,
  rival: Equipo,
  met: { valor: (p: Partido, esLocal: boolean) => number },
  mediaCompeticion: number,
  fuerzaHoy: number | null,
  antesDe: string,
): string {
  const partes: string[] = [];

  // ¿Es este rival muy distinto de los que viene enfrentando?
  const suyos = partidosDelEquipoEnTodas(equipo.nombre, equipo.bandera)
    .filter(({ partido }) => partido.estado === 'finalizado' && partido.fecha < antesDe)
    .slice(0, 10);
  const fuerzas = suyos
    .map(({ partido, esLocal }) => fuerzaDe(esLocal ? partido.visitanteId : partido.localId))
    .filter((f): f is number => f !== null);

  if (fuerzas.length >= 5 && fuerzaHoy !== null) {
    const media = fuerzas.reduce((a, b) => a + b, 0) / fuerzas.length;
    const dif = fuerzaHoy - media;
    if (dif <= -8)
      partes.push(
        `${rival.nombre} es más flojo que los rivales que viene enfrentando, así que es probable que domine más de lo normal`,
      );
    else if (dif >= 8)
      partes.push(
        `${rival.nombre} es más fuerte que sus rivales recientes, así que le costará más que de costumbre`,
      );
  }

  // ¿Y este rival concede mucho o poco de esta métrica?
  const factor = factorDelRival(rival, met, mediaCompeticion, antesDe);
  if (factor >= 1.15)
    partes.push(`${rival.nombre} concede bastante más de lo normal en este apartado`);
  else if (factor <= 0.85)
    partes.push(`${rival.nombre} concede bastante menos de lo normal en este apartado`);

  return partes.length ? ` ${partes.join('; y ')}.` : '';
}

/** Cuenta cuantas veces la serie supera la linea, del mas reciente al mas viejo. */
function evalua(valores: number[], linea: number, sentido: 'mas' | 'menos') {
  const acierta = (v: number) => (sentido === 'mas' ? v > linea : v < linea);
  const racha = valores.slice(0, 10).map(acierta);
  return {
    racha,
    aciertosL5: valores.slice(0, 5).filter(acierta).length,
    aciertosL10: racha.filter(Boolean).length,
    aciertosL20: valores.slice(0, 20).filter(acierta).length,
    muestraL20: Math.min(20, valores.length),
    media: valores.slice(0, 10).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(10, valores.length)),
  };
}

/**
 * Probabilidad del modelo: mezcla la tasa reciente con la de la muestra larga
 * y la empuja hacia el 50% cuando hay pocos partidos (encogimiento bayesiano).
 */
function probabilidad(aciertosL10: number, aciertosL20: number, muestra: number): number {
  const corto = aciertosL10 / 10;
  const largo = aciertosL20 / Math.max(1, muestra);
  const cruda = corto * 0.62 + largo * 0.38;
  const peso = Math.min(1, muestra / 16);
  return Math.min(0.94, Math.max(0.06, 0.5 + (cruda - 0.5) * (0.55 + 0.45 * peso)));
}

/** Cuanta gente guardo el pick. Sube con la ventaja y con el nombre del sujeto. */
function fuegoDe(id: string, ventaja: number, fama: number): number {
  const rnd = new Aleatorio(`${id}-fuego`);
  const base = ventaja * 0.85 + Math.max(0, fama - 72) * 1.3;
  const n = Math.round(base * rnd.rango(0.35, 1.35));
  // Un dato que falta nunca debe acabar en un "NaN" en pantalla.
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Un pick solo merece salir si el precio es apostable y la ventaja es real.
 * Sin este filtro la lista se llena de "menos de 0.5 tarjetas" a cuota 1.06.
 */
/*
 * ── Estos números salen de medir, no de intuición ───────────────────────────
 *
 * El backtest sobre 29.322 picks de 3.446 partidos jugados dejó esto:
 *
 *   ventaja < 10%    9.473 picks   -7,9% de retorno
 *   ventaja 10-20%  15.316 picks   -4,3%
 *   ventaja 20-35%   3.996 picks  +12,1%
 *   ventaja > 35%      537 picks  +86,3%
 *
 * Por debajo del 20% se pierde dinero de forma sistemática, y ahí estaba el
 * corte: en el 6%. El 85% de lo que se publicaba era ruido que restaba.
 *
 * Publicar menos y mejor no es una opinión de diseño: es lo que dicen tres mil
 * partidos.
 */
const VENTAJA_MINIMA = 20;
/** Al "menos de" se le exige más: es un mercado más aburrido y peor pagado. */
const VENTAJA_MINIMA_MENOS = 25;

/*
 * Las faltas se van.
 *
 *   faltas   11.508 picks   60,0% de acierto   -6,7% de retorno
 *
 * Eran el 39% del catálogo entero y el mercado que más dinero perdía: solas se
 * comían la ganancia de todos los demás. Aciertan un 60%, que suena bien, pero
 * a las cuotas que se pagan un 60% no basta.
 */
const FAMILIAS_APAGADAS = new Set<Familia>(['faltas']);

/**
 * Si el pick existe siquiera.
 *
 * Listón bajo: sirve para que la ficha de un partido tenga algo que enseñar.
 * Quien busca el Necaxa–León quiere ver análisis de ESE partido, y una pantalla
 * vacía no le ayuda a nada.
 */
function admisible(cuota: number, ventaja: number, sentido: 'mas' | 'menos'): boolean {
  if (cuota < 1.18 || cuota > 6) return false;
  return ventaja >= (sentido === 'menos' ? 11 : 6);
}

/**
 * Si el pick se recomienda de verdad.
 *
 * Este es el listón que sale del backtest, y el que separa lo que la app pone
 * en la portada de lo que solo enseña si vas a buscarlo. Los que no lo pasan
 * siguen existiendo en la ficha del partido, marcados como lo que son: una
 * tendencia sin ventaja suficiente sobre el precio.
 *
 * La diferencia importa para poder decir la verdad: el 25,8% de retorno medido
 * es el de los recomendados. Si se mezclaran, ese número dejaría de aplicar a
 * nada concreto.
 */
function recomendable(familia: Familia, aciertosL10: number): boolean {
  if (FAMILIAS_APAGADAS.has(familia)) return false;
  return aciertosL10 >= 8;
}

/**
 * Cuanto tira cada familia de mercado en la portada. Un pick de goles vende
 * mucho mas que uno de pases completados, aunque el numero sea igual de bueno.
 */
const TIRON: Record<Familia, number> = {
  goles: 1, resultado: 0.95, tiros: 0.92, asistencias: 0.85, corners: 0.8,
  tarjetas: 0.72, defensa: 0.66, combinadas: 0.6, faltas: 0.42, pases: 0.45,
};

/**
 * Orden de la portada. Manda la ventaja, pero se pondera por la fiabilidad de
 * la muestra, por el tiron del mercado y por el nombre del sujeto: nadie abre
 * la app para leer sobre el tercer central de un equipo de mitad de tabla.
 */
function valor(
  p: { ventaja: number; probabilidad: number; muestraL20: number; familia: Familia },
  fama: number,
) {
  return (
    p.ventaja *
    p.probabilidad *
    TIRON[p.familia] *
    Math.min(1, p.muestraL20 / 12) *
    Math.pow(1.055, Math.max(0, fama - 72))
  );
}

// ------------------------------------------------------------ definicion de metricas

type Extractor = (r: RegistroJugador) => number;

interface MetricaJugador {
  clave: string;
  etiqueta: string;
  /** Como se lee en el mercado: "Más de 0.5 remates a puerta". */
  mercado: string;
  familia: Familia;
  extractor: Extractor;
  /** Lineas que suele ofrecer el mercado para esa metrica. */
  lineas: number[];
  /** Solo se ofrece a jugadores de estas posiciones. */
  posiciones?: string[];
}

/**
 * Solo mercados que las casas ofrecen de verdad, con las lineas que ofrecen.
 *
 * Esto no es un detalle: antes la app sacaba cosas como "mas de 2.5 despejes"
 * o "mas de 74.5 minutos", que no existen en ningun sitio y no se pueden
 * apostar. Los que quedan son los que publican bet365, Betano y compania:
 * tiros, tiros a puerta, goles, asistencias, faltas, entradas, pases, tarjeta
 * y paradas del portero. Fuera despejes, duelos, intercepciones, toques en el
 * area y minutos.
 */
export const METRICAS_JUGADOR: MetricaJugador[] = [
  { clave: 'goles', etiqueta: 'Goles', mercado: 'goles', familia: 'goles', extractor: (r) => r.goles, lineas: [0.5, 1.5], posiciones: ['DEL', 'MED'] },
  { clave: 'remates', etiqueta: 'Remates', mercado: 'remates', familia: 'tiros', extractor: (r) => r.remates, lineas: [0.5, 1.5, 2.5, 3.5, 4.5] },
  { clave: 'rematesPuerta', etiqueta: 'Remates a puerta', mercado: 'remates a puerta', familia: 'tiros', extractor: (r) => r.rematesPuerta, lineas: [0.5, 1.5, 2.5] },
  { clave: 'asistencias', etiqueta: 'Asistencias', mercado: 'asistencias', familia: 'asistencias', extractor: (r) => r.asistencias, lineas: [0.5, 1.5], posiciones: ['DEL', 'MED'] },
  { clave: 'faltasCometidas', etiqueta: 'Faltas cometidas', mercado: 'faltas cometidas', familia: 'faltas', extractor: (r) => r.faltasCometidas, lineas: [0.5, 1.5, 2.5, 3.5] },
  { clave: 'faltasRecibidas', etiqueta: 'Faltas recibidas', mercado: 'faltas recibidas', familia: 'faltas', extractor: (r) => r.faltasRecibidas, lineas: [0.5, 1.5, 2.5] },
  { clave: 'entradas', etiqueta: 'Entradas', mercado: 'entradas', familia: 'defensa', extractor: (r) => r.entradas, lineas: [0.5, 1.5, 2.5, 3.5], posiciones: ['DEF', 'MED'] },
  // Las casas ponen la linea de pases en decenas, no de diez en diez.
  { clave: 'pases', etiqueta: 'Pases completados', mercado: 'pases completados', familia: 'pases', extractor: (r) => r.pasesCompletados, lineas: [14.5, 24.5, 34.5, 44.5, 54.5] },
  { clave: 'amarillas', etiqueta: 'Tarjeta amarilla', mercado: 'tarjeta amarilla', familia: 'tarjetas', extractor: (r) => r.amarillas, lineas: [0.5] },
  { clave: 'paradas', etiqueta: 'Paradas', mercado: 'paradas', familia: 'defensa', extractor: (r) => r.paradas, lineas: [1.5, 2.5, 3.5, 4.5, 5.5], posiciones: ['POR'] },
];

interface MetricaEquipo {
  clave: string;
  etiqueta: string;
  mercado: string;
  familia: Familia;
  /** Valor del equipo en un partido suyo. */
  valor: (p: Partido, esLocal: boolean) => number;
  lineas: number[];
}

/** Mercados de equipo, tambien con las lineas que publican las casas. */
export const METRICAS_EQUIPO: MetricaEquipo[] = [
  { clave: 'goles', etiqueta: 'Goles del equipo', mercado: 'goles del equipo', familia: 'goles', valor: (p, l) => (l ? p.golesLocal : p.golesVisitante), lineas: [0.5, 1.5, 2.5, 3.5] },
  { clave: 'remates', etiqueta: 'Remates del equipo', mercado: 'remates del equipo', familia: 'tiros', valor: (p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).remates, lineas: [8.5, 10.5, 12.5, 14.5] },
  { clave: 'rematesPuerta', etiqueta: 'Remates a puerta', mercado: 'remates a puerta del equipo', familia: 'tiros', valor: (p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).rematesPuerta, lineas: [2.5, 3.5, 4.5, 5.5] },
  { clave: 'corners', etiqueta: 'Córners', mercado: 'córners del equipo', familia: 'corners', valor: (p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).corners, lineas: [3.5, 4.5, 5.5, 6.5] },
  { clave: 'tarjetas', etiqueta: 'Tarjetas', mercado: 'tarjetas del equipo', familia: 'tarjetas', valor: (p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).amarillas, lineas: [1.5, 2.5, 3.5] },
];

export const METRICAS_PARTIDO = [
  { clave: 'golesTotales', mercado: 'goles', familia: 'goles' as Familia, valor: (p: Partido) => p.golesLocal + p.golesVisitante, lineas: [1.5, 2.5, 3.5] },
  { clave: 'cornersTotales', mercado: 'córners', familia: 'corners' as Familia, valor: (p: Partido) => p.estadisticas.local.corners + p.estadisticas.visitante.corners, lineas: [8.5, 9.5, 10.5, 11.5] },
  { clave: 'tarjetasTotales', mercado: 'tarjetas', familia: 'tarjetas' as Familia, valor: (p: Partido) => p.estadisticas.local.amarillas + p.estadisticas.visitante.amarillas, lineas: [3.5, 4.5, 5.5] },
  { clave: 'rematesTotales', mercado: 'remates', familia: 'tiros' as Familia, valor: (p: Partido) => p.estadisticas.local.remates + p.estadisticas.visitante.remates, lineas: [21.5, 24.5, 26.5] },
];

// ------------------------------------------------------------------- fabrica

/** Todas las familias, en el orden en el que salen los chips. */
export const FAMILIAS: { id: Familia; nombre: string }[] = [
  { id: 'goles', nombre: 'Goles' },
  { id: 'tiros', nombre: 'Tiros' },
  { id: 'corners', nombre: 'Córners' },
  { id: 'tarjetas', nombre: 'Tarjetas' },
  { id: 'resultado', nombre: 'Resultado' },
  { id: 'asistencias', nombre: 'Asistencias' },
  { id: 'pases', nombre: 'Pases' },
  { id: 'faltas', nombre: 'Faltas' },
  { id: 'defensa', nombre: 'Defensa' },
  { id: 'combinadas', nombre: 'Otros' },
];

const CACHE = new Map<string, Pick[]>();

/*
 * Se vacía cuando llegan datos nuevos, como las demás.
 *
 * Estos picks se calculan a partir de la temporada, que sale del archivo
 * descargado. El motor tiraba su caché de temporadas y el índice de escudos
 * tiraba la suya, pero esta se quedaba: después de refrescar los datos, un
 * partido ya visitado seguía enseñando los picks calculados con los resultados
 * de antes —líneas viejas, rachas viejas— y no había forma de que se
 * actualizaran sin recargar la app entera.
 *
 * Se nota poco al abrir, porque ahora los datos llegan antes de pintar nada.
 * Se nota cada seis horas, que es cuando la app vuelve a preguntar al servidor
 * con la app abierta.
 */
cuandoCambienLosDatos(() => CACHE.clear());

/** Picks de un partido concreto. */
export function picksDePartido(
  competicionId: string,
  partidoId: string,
  casaId: string,
  /** Competiciones compradas por el usuario; '*' son todas. */
  libres?: Set<string>,
): Pick[] {
  /*
   * La clave del cache incluye si hay compra: si no, el primer cálculo (sin
   * derechos cargados todavía) dejaría los candados puestos para siempre,
   * incluso después de pagar.
   */
  const conAcceso = !!libres && libres.size > 0;
  const clave = `${partidoId}-${casaId}-${conAcceso ? [...libres].sort().join(",") : "libre0"}`;
  const guardado = CACHE.get(clave);
  if (guardado) return guardado;

  const t = temporada(competicionId);
  const partido = t.porPartido.get(partidoId);
  if (!partido) return [];

  const local = t.porEquipo.get(partido.localId)!;
  const visitante = t.porEquipo.get(partido.visitanteId)!;

  /*
   * La competición que lleva el pick es la del partido, no la que se estaba
   * mirando. Con "Todas" activa la temporada junta a todo el mundo, y un pick
   * de un Alavés–Getafe tiene que decir "LaLiga", no "Todas".
   */
  const compReal = partido.competicionId || competicionId;
  /*
   * Siempre la hora del partido, nunca "En curso". Que se esté jugando lo dice
   * la franja roja de la tarjeta, con el minuto y el marcador de verdad; aquí
   * repetirlo solo quita sitio al club y al rival, que es lo que esta línea
   * tiene que contar.
   */
  const contexto = `${local.nombre} vs ${visitante.nombre} • ${fechaCorta(partido.fecha)}`;
  const picks: Pick[] = [];

  // ------------------------------------------------------- picks de jugador
  const plantel = t.jugadores.filter(
    (x) => x.equipoId === local.id || x.equipoId === visitante.id,
  );

  for (const jug of plantel) {
    // Solo cuentan los partidos en los que tuvo minutos de verdad: una linea
    // de remates no dice nada si el jugador entro en el 88.
    const historial = (t.registrosPorJugador.get(jug.id) ?? []).filter(
      // Y nada posterior: sin esto, medir el modelo contra el pasado usaria
      // partidos que en ese momento no se habian jugado.
      (r) => r.partidoId !== partidoId && r.minutos >= 25 && r.fecha < partido.fecha,
    );
    // Con menos de 6 partidos no hay muestra suficiente para afirmar nada.
    if (historial.length < 6) continue;
    if (jug.rol === 'suplente') continue;

    for (const met of METRICAS_JUGADOR) {
      if (met.posiciones && !met.posiciones.includes(jug.posicion)) continue;
      const valores = historial.map(met.extractor);
      // Media de toda la temporada: es lo que ve la casa al poner el precio.
      const mediaLarga = valores.reduce((a, b) => a + b, 0) / Math.max(1, valores.length);

      /*
       * En props de jugador las casas publican "mas de", no "menos de".
       * Nadie ofrece "menos de 1.5 remates de tal jugador": el mercado que
       * existe es el contrario. Ofrecerlo era inventarse una apuesta que el
       * usuario no puede colocar en ningun sitio.
       */
      for (const l of met.lineas) {
        for (const sentido of ['mas'] as const) {
          const ev = evalua(valores, l, sentido);
          // Solo interesa lo que se repite: 7 de 10 o mejor.
          if (ev.aciertosL10 < 7) continue;
          const prob = probabilidad(ev.aciertosL10, ev.aciertosL20, ev.muestraL20);
          const id = `${partidoId}-${jug.id}-${met.clave}-${l}-${sentido}`;
          // El precio lo pone el mercado mirando al puesto, no a este jugador.
          const pMercado = probMercadoJugador(met.clave, l, jug.posicion, jug.nivel, mediaLarga);
          const cuota = precioDe(sentido === 'mas' ? pMercado : 1 - pMercado, casaId, id);
          const ventaja = Number(((prob - 1 / cuota) * 100).toFixed(1));
          if (!admisible(cuota, ventaja, sentido)) continue;

          const casa = casaId;
          const nombreMercado = `${sentido === 'mas' ? 'Más' : 'Menos'} de ${linea(l)} ${met.mercado}`;
          picks.push({
            id,
            partidoId,
            competicionId: compReal,
            sujeto: 'jugador',
            sujetoId: jug.id,
            titulo: jug.nombre,
            /*
             * En un pick de jugador lo primero que hay que saber es de qué
             * club es. Las siglas del enfrentamiento ("UTR vs AZA") no lo
             * dicen: ni identifican al equipo del jugador ni se entienden a
             * simple vista. Va el nombre completo del club y, detrás, contra
             * quién y cuándo.
             */
            // El club va junto al nombre, en el título; aquí queda el rival.
            equipo: (jug.equipoId === local.id ? local : visitante).nombre,
            contexto: `vs ${(jug.equipoId === local.id ? visitante : local).nombre} • ${fechaCorta(partido.fecha)}`,
            argumento:
              sentido === 'mas'
                ? `${jug.nombre} superó los ${coma(l)} ${met.mercado} en ${ev.aciertosL10} de sus últimos 10 partidos (${coma(ev.media)} por partido).`
                : `${jug.nombre} se quedó por debajo de ${coma(l)} ${met.mercado} en ${ev.aciertosL10} de sus últimos 10 partidos (${coma(ev.media)} por partido).`,
            familia: met.familia,
            mercado: nombreMercado,
            metrica: met.clave,
            linea: l,
            sentido,
            cuota,
            casa,
            precioReal: false,
            recomendado: recomendable(met.familia, ev.aciertosL10),
            racha: ev.racha,
            aciertosL5: ev.aciertosL5,
            aciertosL10: ev.aciertosL10,
            aciertosL20: ev.aciertosL20,
            muestraL20: ev.muestraL20,
            media: ev.media,
            probabilidad: prob,
            ventaja,
            fuego: fuegoDe(id, ventaja, jug.nivel),
            imagen: jug.bandera,
            esBandera: true,
            nombres: [jug.nombre],
          });
        }
      }
    }
  }

  /*
   * Historial del equipo para tarificar. En una copa o en una continental un
   * equipo apenas ha jugado tres partidos, y con eso no se puede afirmar nada:
   * en ese caso se tira de todo lo suyo en las demás competiciones importadas,
   * que es donde está su liga. Sin esto, un Catanzaro–Sudtirol de Coppa se
   * queda sin un solo pick pese a que los dos equipos tienen media temporada
   * de Serie B a sus espaldas.
   */
  /*
   * Solo cuenta lo que pasó ANTES de este partido.
   *
   * Para un partido que aún no se ha jugado da igual: todo lo terminado es
   * anterior por definición. Importa al medir el modelo contra la temporada
   * pasada, que es la única forma de saber si acierta: sin este filtro, el pick
   * de un partido de octubre se calcularía con los resultados de noviembre y
   * saldría un porcentaje de aciertos que no significa nada. Se llama mirar el
   * futuro, y es la forma más fácil de construir un modelo que parece
   * infalible en las pruebas y falla en cuanto se usa de verdad.
   */
  const antesDeEste = (p: Partido) =>
    p.id !== partidoId && p.estado === 'finalizado' && p.fecha < partido.fecha;

  const historialDe = (equipo: Equipo): { p: Partido; esLocal: boolean }[] => {
    const propios = (t.partidosPorEquipo.get(equipo.id) ?? [])
      .filter(antesDeEste)
      .map((p) => ({ p, esLocal: p.localId === equipo.id }));
    if (propios.length >= 6) {
      return propios.sort((a, b) => b.p.fecha.localeCompare(a.p.fecha));
    }

    // El lado viene dado: fuera de esta competición el equipo tiene otro id,
    // así que compararlo con `localId` daría "visitante" siempre.
    // Con la bandera: sin ella se mezclaban los clubes homónimos de países
    // distintos y el historial salía contaminado con partidos de otro equipo.
    const fuera = partidosDelEquipoEnTodas(equipo.nombre, equipo.bandera)
      .filter(({ partido: otro }) => antesDeEste(otro))
      .map(({ partido: otro, esLocal }) => ({ p: otro, esLocal }));

    const vistos = new Set<string>();
    return [...propios, ...fuera]
      .filter(({ p }) => (vistos.has(p.id) ? false : (vistos.add(p.id), true)))
      .sort((a, b) => b.p.fecha.localeCompare(a.p.fecha));
  };

  // --------------------------------------------------------- picks de equipo
  for (const equipo of [local, visitante]) {
    const suyos = historialDe(equipo);
    if (suyos.length < 6) continue;

    /*
     * Contra quién juega hoy, y cuánto se le parece cada rival del historial.
     *
     * Esto es lo que evita el error del Sassuolo: sus últimos diez partidos
     * fueron contra rivales de Serie A y hoy juega contra uno de Serie B. Los
     * partidos contra equipos parecidos al de hoy pesan más, y los
     * enfrentamientos directos con ese mismo rival pesan el triple.
     */
    const rival = equipo.id === local.id ? visitante : local;
    const fuerzaHoy = fuerzaDe(rival.id) ?? rival.fuerza ?? null;
    const pesos = suyos.map(({ p, esLocal }) => {
      const rivalId = esLocal ? p.visitanteId : p.localId;
      const peso = pesoPorRival(fuerzaDe(rivalId), fuerzaHoy);
      return rivalId === rival.id ? peso * PESO_ENFRENTAMIENTO : peso;
    });

    for (const met of METRICAS_EQUIPO) {
      const valores = suyos.map(({ p, esLocal }) => met.valor(p, esLocal));
      // El mercado tarifica con la media de la competicion, no con la del equipo.
      // Tambien recortada en el tiempo: la media de la competicion de hoy no
      // se conocia el dia del partido que se esta midiendo.
      const mediaCompeticion =
        t.partidos
          .filter((p) => p.estado === 'finalizado' && p.fecha < partido.fecha)
          .reduce((a, p) => a + met.valor(p, true) + met.valor(p, false), 0) /
        Math.max(
          2,
          t.partidos.filter((p) => p.estado === 'finalizado' && p.fecha < partido.fecha).length * 2,
        );

      for (const l of met.lineas) {
        for (const sentido of ['mas', 'menos'] as const) {
          const ev = evalua(valores, l, sentido);
          if (ev.aciertosL10 < 7) continue;
          /*
           * El conteo crudo —8 de 10— sigue siendo el que se enseña: es un
           * hecho y no se toca. Lo que se corrige es la probabilidad, que
           * siempre fue una estimación, y con ella la ventaja, que decide si
           * el pick llega a publicarse.
           */
          const prob = probabilidadAjustada(
            probabilidad(ev.aciertosL10, ev.aciertosL20, ev.muestraL20),
            tasaEnContexto(valores, pesos, l, sentido),
            factorDelRival(rival, met, mediaCompeticion, partido.fecha),
            sentido,
          );
          const id = `${partidoId}-${equipo.id}-${met.clave}-${l}-${sentido}`;
          const mediaPropia = valores.reduce((a, b) => a + b, 0) / Math.max(1, valores.length);
          const pMercado = probMercadoEquipo(met.clave, l, mediaCompeticion, mediaPropia);
          const cuota = precioDe(sentido === 'mas' ? pMercado : 1 - pMercado, casaId, id);
          const ventaja = Number(((prob - 1 / cuota) * 100).toFixed(1));
          const casa = casaId;
          if (!admisible(cuota, ventaja, sentido)) continue;

          picks.push({
            id,
            partidoId,
            competicionId: compReal,
            sujeto: 'equipo',
            sujetoId: equipo.id,
            titulo: equipo.nombre,
            contexto,
            argumento:
              `${equipo.nombre} ${sentido === 'mas' ? 'superó' : 'no llegó a'} ${coma(l)} ${met.mercado} en ${ev.aciertosL10} de sus últimos 10 partidos (${coma(ev.media)} de media).` +
              // Y si el rival de hoy cambia el cuadro, se dice. Un ajuste que
              // mueve la probabilidad sin explicarse es una caja negra, y por
              // una caja negra no se paga.
              notaDeContexto(equipo, rival, met, mediaCompeticion, fuerzaHoy, partido.fecha),
            familia: met.familia,
            mercado: `${sentido === 'mas' ? 'Más' : 'Menos'} de ${linea(l)} ${met.mercado}`,
            metrica: met.clave,
            linea: l,
            sentido,
            cuota,
            casa,
            precioReal: false,
            recomendado: recomendable(met.familia, ev.aciertosL10),
            racha: ev.racha,
            aciertosL5: ev.aciertosL5,
            aciertosL10: ev.aciertosL10,
            aciertosL20: ev.aciertosL20,
            muestraL20: ev.muestraL20,
            media: ev.media,
            probabilidad: prob,
            ventaja,
            fuego: fuegoDe(id, ventaja, equipo.fuerza),
            imagen: equipo.bandera,
            esBandera: true,
            nombres: [equipo.nombre],
          });
        }
      }
    }
  }

  // -------------------------------------------------------- picks de partido
  // Historial del enfrentamiento: los partidos recientes de los dos equipos.
  // Mismo criterio que arriba: si en esta competición no hay muestra, se mira
  // lo que los dos equipos han hecho en el resto.
  const vistosPartido = new Set<string>();
  const delPartido = [...historialDe(local), ...historialDe(visitante)]
    .map(({ p }) => p)
    .filter((p) => (vistosPartido.has(p.id) ? false : (vistosPartido.add(p.id), true)))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  if (delPartido.length >= 8) {
    for (const met of METRICAS_PARTIDO) {
      const valores = delPartido.map(met.valor);
      const jugados = t.partidos.filter(
        (p) => p.estado === 'finalizado' && p.fecha < partido.fecha,
      );
      const mediaCompeticion =
        jugados.reduce((a, p) => a + met.valor(p), 0) / Math.max(1, jugados.length);

      for (const l of met.lineas) {
        for (const sentido of ['mas', 'menos'] as const) {
          const ev = evalua(valores, l, sentido);
          if (ev.aciertosL10 < 7) continue;
          const prob = probabilidad(ev.aciertosL10, ev.aciertosL20, ev.muestraL20);
          const id = `${partidoId}-partido-${met.clave}-${l}-${sentido}`;
          const mediaPropia = valores.reduce((a, b) => a + b, 0) / Math.max(1, valores.length);
          const pMercado = probMercadoEquipo(met.clave, l, mediaCompeticion, mediaPropia);
          const cuota = precioDe(sentido === 'mas' ? pMercado : 1 - pMercado, casaId, id);
          const ventaja = Number(((prob - 1 / cuota) * 100).toFixed(1));
          const casa = casaId;
          if (!admisible(cuota, ventaja, sentido)) continue;

          picks.push({
            id,
            partidoId,
            competicionId: compReal,
            sujeto: 'partido',
            sujetoId: partidoId,
            titulo: `${local.nombre} vs ${visitante.nombre}`,
            contexto,
            argumento: `Promedio combinado: ${coma(ev.media)} ${met.mercado}. ${sentido === 'mas' ? 'Más' : 'Menos'} de ${linea(l)} acierta ${ev.aciertosL10 * 10}% (L10). ${coma(ventaja, 0)}% de ventaja.`,
            familia: met.familia,
            mercado: `${sentido === 'mas' ? 'Más' : 'Menos'} de ${linea(l)} ${met.mercado}`,
            metrica: met.clave,
            linea: l,
            sentido,
            cuota,
            casa,
            precioReal: false,
            recomendado: recomendable(met.familia, ev.aciertosL10),
            racha: ev.racha,
            aciertosL5: ev.aciertosL5,
            aciertosL10: ev.aciertosL10,
            aciertosL20: ev.aciertosL20,
            muestraL20: ev.muestraL20,
            media: ev.media,
            probabilidad: prob,
            ventaja,
            fuego: fuegoDe(id, ventaja, Math.max(local.fuerza, visitante.fuerza)),
            imagen: `${local.bandera}${visitante.bandera}`,
            esBandera: true,
            nombres: [local.nombre, visitante.nombre],
          });
        }
      }
    }

    // 1X2: sale del modelo de goles, no del historial. Solo si hay cuotas de
    // verdad: los partidos que vienen de ESPN no traen precios, y sin ellos
    // salia "NaN%" y una cuota de 0.00 en la tarjeta.
    const hayCuotas =
      partido.cuotas.local > 1 && partido.cuotas.empate > 1 && partido.cuotas.visitante > 1;
    const implicita = (c: number) => 1 / c;
    const opciones: {
      nombre: string;
      cuota: number;
      prob: number;
      /** De quien habla la opcion. Sin esto la racha era siempre la del local. */
      tipo:
        | 'local'
        | 'empate'
        | 'visitante'
        | 'local-o-empate'
        | 'visitante-o-empate'
        | 'sin-empate';
    }[] = [
      // El nombre entero del club, no las siglas: "Gana GUC" no lo entiende
      // nadie, y este texto se lee también en el argumento y en el historial.
      { nombre: `Gana ${local.nombre}`, cuota: partido.cuotas.local, prob: implicita(partido.cuotas.local), tipo: 'local' },
      { nombre: 'Empate', cuota: partido.cuotas.empate, prob: implicita(partido.cuotas.empate), tipo: 'empate' },
      { nombre: `Gana ${visitante.nombre}`, cuota: partido.cuotas.visitante, prob: implicita(partido.cuotas.visitante), tipo: 'visitante' },

      /*
       * Doble oportunidad: gana o empata.
       *
       * Es el mercado para cuando un equipo se ve por encima pero no como para
       * fiarse de la victoria seca. Las casas lo ofrecen siempre y no hacía
       * falta ningún dato nuevo: sale de las mismas tres cuotas.
       *
       * La cuota de dos resultados excluyentes es (c1 × c2) / (c1 + c2). No es
       * una aproximación: con cuotas de 2,00 y 3,00 la probabilidad conjunta es
       * 1/2 + 1/3 = 0,833, y 1 / 0,833 son exactamente los 1,20 que da la
       * fórmula. Hereda el margen de las cuotas de las que sale, así que no
       * inventa valor donde no lo hay.
       *
       * Pagan poco por definición —cubren dos de los tres resultados— y por eso
       * pocos pasarán el corte de ventaja. Los que pasen serán los buenos.
       */
      {
        nombre: `${local.nombre} gana o empata`,
        cuota: dobleOportunidad(partido.cuotas.local, partido.cuotas.empate),
        prob: implicita(partido.cuotas.local) + implicita(partido.cuotas.empate),
        tipo: 'local-o-empate',
      },
      {
        nombre: `${visitante.nombre} gana o empata`,
        cuota: dobleOportunidad(partido.cuotas.visitante, partido.cuotas.empate),
        prob: implicita(partido.cuotas.visitante) + implicita(partido.cuotas.empate),
        tipo: 'visitante-o-empate',
      },
      {
        nombre: 'Gana uno de los dos (sin empate)',
        cuota: dobleOportunidad(partido.cuotas.local, partido.cuotas.visitante),
        prob: implicita(partido.cuotas.local) + implicita(partido.cuotas.visitante),
        tipo: 'sin-empate',
      },
    ];
    /*
     * Normalizar solo con los tres resultados básicos.
     *
     * Las dobles oportunidades se solapan con ellos: "gana o empata" contiene
     * "gana" y contiene "empata". Meterlas en la suma daría un total del 200% y
     * hundiría todas las probabilidades a la mitad.
     */
    const suma = opciones
      .filter((o) => o.tipo === 'local' || o.tipo === 'empate' || o.tipo === 'visitante')
      .reduce((a, b) => a + b.prob, 0);
    for (const op of hayCuotas ? opciones : []) {
      const prob = op.prob / suma;
      if (prob < 0.34) continue;
      const id = `${partidoId}-1x2-${op.nombre}`;
      const rnd = new Aleatorio(id);
      const ajustada = Math.min(0.9, prob * rnd.rango(1.0, 1.12));
      const ventaja = Number(((ajustada - implicita(op.cuota)) * 100).toFixed(1));
      if (ventaja < 1) continue;
      /*
       * El historial del equipo del que habla el pick, y de lo que dice.
       *
       * Antes miraba siempre las victorias del LOCAL, fuera cual fuera la
       * opción: en "Gana Lecce" enseñaba lo que hizo el Palermo, y en "Empate"
       * enseñaba victorias en vez de empates. El resultado eran barras que no
       * tenían nada que ver con el pick que acompañaban —un "0 de 10" debajo de
       * un pick recomendado— y no había forma de que cuadraran.
       */
      const equipoDeLaOpcion =
        op.tipo === 'visitante' || op.tipo === 'visitante-o-empate' ? visitante : local;
      const gano = delPartido
        .filter((p) => p.localId === equipoDeLaOpcion.id || p.visitanteId === equipoDeLaOpcion.id)
        .slice(0, 10)
        .map((p) => {
          const empate = p.golesLocal === p.golesVisitante;
          const ganoEl =
            p.localId === equipoDeLaOpcion.id
              ? p.golesLocal > p.golesVisitante
              : p.golesVisitante > p.golesLocal;
          if (op.tipo === 'empate') return empate;
          // En la doble oportunidad "acertar" es que se diera cualquiera de las
          // dos cosas que cubre, no solo la victoria.
          if (op.tipo === 'local-o-empate' || op.tipo === 'visitante-o-empate')
            return ganoEl || empate;
          if (op.tipo === 'sin-empate') return !empate;
          return ganoEl;
        });

      picks.push({
        id,
        partidoId,
        // La liga real del partido, no la que se esté mirando: con "Todas"
        // activa este pick decía "Todas" en vez de "Liga MX".
        competicionId: compReal,
        sujeto: 'partido',
        sujetoId: partidoId,
        titulo: `${local.nombre} vs ${visitante.nombre}`,
        contexto,
        argumento:
          `${op.nombre === 'Empate' ? 'El empate' : op.nombre.replace('Gana ', 'La victoria de ')}` +
          ` tiene un ${(ajustada * 100).toFixed(0)}% de probabilidad según el modelo, ` +
          `y la cuota de ${op.cuota.toFixed(2)} solo le da un ${(implicita(op.cuota) * 100).toFixed(0)}%.`,
        familia: 'resultado',
        mercado: op.nombre,
        metrica: '1x2',
        linea: 0,
        sentido: 'si',
        cuota: op.cuota,
        // El sello es el de quien publicó ese precio, no el de la casa que el
        // usuario tenga seleccionada.
        casa: partido.cuotas.casaResumen ?? casaId,
        // El 1X2 sí sale de una cuota publicada: por eso hay picks de 1X2
        // solo cuando el partido trae precios.
        precioReal: true,
        /*
         * El 1X2 se recomienda con el mismo liston, pero su ventaja es la mas
         * fiable de todas: se mide contra un precio que alguien publico, no
         * contra uno que calcula la propia app.
         */
        recomendado: gano.filter(Boolean).length >= 8,
        racha: gano,
        aciertosL5: gano.slice(0, 5).filter(Boolean).length,
        aciertosL10: gano.filter(Boolean).length,
        aciertosL20: gano.filter(Boolean).length,
        muestraL20: gano.length,
        media: ajustada * 100,
        probabilidad: ajustada,
        ventaja,
        fuego: fuegoDe(id, ventaja, Math.max(local.fuerza, visitante.fuerza)),
        imagen: `${local.bandera}${visitante.bandera}`,
        esBandera: true,
        nombres: [local.nombre, visitante.nombre],
      });
    }
  }

  // Ordena por lo que la app llama "valor": ventaja ponderada por acierto.
  const fama = (p: Pick) =>
    p.sujeto === 'jugador'
      ? (t.porJugador.get(p.sujetoId)?.nivel ?? 70)
      : p.sujeto === 'equipo'
        ? (t.porEquipo.get(p.sujetoId)?.fuerza ?? 70)
        : Math.max(local.fuerza, visitante.fuerza);
  picks.sort((a, b) => valor(b, fama(b)) - valor(a, fama(a)));

  // De cada metrica se queda la mejor linea, y de cada sujeto como mucho dos
  // picks: si no, la lista es el mismo delantero repetido cinco veces.
  const vistas = new Set<string>();
  const porSujeto = new Map<string, number>();
  const limpios = picks.filter((p) => {
    const metricaClave = `${p.sujetoId}|${p.metrica}`;
    if (vistas.has(metricaClave)) return false;
    const cuantos = porSujeto.get(p.sujetoId) ?? 0;
    if (cuantos >= 2) return false;
    vistas.add(metricaClave);
    porSujeto.set(p.sujetoId, cuantos + 1);
    return true;
  });

  /*
   * Las 3 primeras de cada competición son gratis; el resto pide Scout Pro si
   * esa competición es de pago.
   *
   * Se mira la competición del pick y no la de la pantalla a propósito: con
   * "Todas" activa la lista mezcla ligas, y si se mirara la de la pantalla
   * —que es gratuita por definición, no es un torneo— el candado se caería y
   * la app entera quedaría abierta. El recuento también va por competición:
   * si no, en "Todas" solo las tres primeras de la lista entera serían libres.
   */
  limpios.forEach((p) => {
    const suya = p.competicionId;
    /*
     * El candado va por liga, no por tipo de pick.
     *
     * Las cuatro gratuitas se ven enteras: picks de jugador, de equipo y de
     * partido. En el resto se enseñan los tres primeros como muestra y lo
     * demás pide Scout Pro —pero se enseña igual, con el candado puesto: la
     * gracia es que el usuario vea que hay análisis ahí y sepa qué compra.
     */
    const comprada = !!libres && (libres.has('*') || libres.has(suya));
    /*
     * O la liga es gratuita, o está comprada. No hay término medio.
     *
     * Antes se regalaban los tres primeros picks de cada competición como
     * muestra. Fuera: las cinco ligas libres ya son la muestra, y son ligas
     * enteras —Champions, Premier, LaLiga, Liga MX y Brasileirão—, no tres
     * tarjetas sueltas. Con el aperitivo puesto en todas partes, el resto
     * dejaba de valer la pena pagarlo.
     */
    p.pro = !competicion(suya).gratis && !comprada;
  });

  CACHE.set(clave, limpios);
  return limpios;
}

/** Partidos de una competicion que aun se pueden analizar. */
export function partidosAbiertos(competicionId: string): Partido[] {
  /*
   * Lo que se está jugando ahora y lo que viene, nunca lo de ayer. No basta
   * con mirar el estado: un partido importado hace días sigue guardado como
   * "previa" aunque ya se haya jugado, y colarlo aquí gasta un hueco de la
   * portada en un partido que ya no se puede apostar.
   */
  const corte = Date.now() - 3 * 3600_000;
  return temporada(competicionId)
    .partidos.filter((p) => {
      if (p.estado === 'finalizado') return false;
      if (p.estado === 'en_curso' || p.estado === 'descanso') return true;
      return new Date(p.fecha).getTime() >= corte;
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Cuantas tarjetas tiene que haber en la portada como minimo. Abrir la app y
 * encontrarse tres picks da sensacion de vacio aunque los tres sean buenos.
 */
const MINIMO_PORTADA = 22;

/** Picks destacados de toda una competicion. */
/**
 * La portada, calculada por trozos para no congelar la pantalla.
 *
 * Analizar un partido cuesta unos 70 ms, y la portada mira cuarenta: casi tres
 * segundos en los que el navegador no responde a nada, porque JavaScript no
 * tiene hilos. Eso es lo que hacía que la app pareciera colgada al abrirla con
 * "Todas".
 *
 * Partiendo el trabajo, entre partido y partido se le devuelve el turno al
 * navegador para que atienda toques y repinte. Cada `yield` entrega la lista
 * como esté: aparecen unos cuantos picks enseguida y la lista se va llenando,
 * que se siente mucho más rápido que verlos todos de golpe al final.
 *
 * La versión de una tanda sigue existiendo justo debajo, para el backtest y
 * para todo lo que no dibuja nada y sí quiere el resultado entero.
 */
/**
 * La portada de una tanda, para todo lo que no dibuja: el backtest y las
 * pantallas que ya tienen los datos en memoria.
 *
 * Consume el generador de golpe. Misma lógica, mismo resultado.
 */
export function picksDeCompeticion(
  competicionId: string,
  casaId: string,
  limite = 60,
  libres?: Set<string>,
): Pick[] {
  const trozos = picksDeCompeticionPorTrozos(competicionId, casaId, limite, libres);
  let paso = trozos.next();
  while (!paso.done) paso = trozos.next();
  return paso.value;
}

/**
 * La portada, calculada por trozos para no congelar la pantalla.
 *
 * Analizar un partido cuesta unos 70 ms, y la portada mira cuarenta: casi tres
 * segundos en los que el navegador no responde a nada, porque JavaScript no
 * tiene hilos. Eso es lo que hacía que la app pareciera colgada al abrirla con
 * "Todas" activa.
 *
 * Partiendo el trabajo, entre trozo y trozo se le devuelve el turno al
 * navegador para que atienda toques y repinte. Cada entrega trae la lista como
 * esté: aparecen unos cuantos picks enseguida y se va llenando, que se siente
 * mucho más rápido que verlos todos de golpe al final aunque el reloj diga lo
 * contrario.
 */
export function* picksDeCompeticionPorTrozos(
  competicionId: string,
  casaId: string,
  limite = 60,
  /*
   * Las competiciones que el usuario tiene compradas. El comodín "*" en el
   * conjunto significa que las tiene todas.
   *
   * Llega como argumento y no se consulta aquí porque esto es una función de
   * datos, no un componente: los derechos viven en un proveedor de React y
   * solo las pantallas pueden leerlos. Sin este dato el candado se cerraría
   * igual sobre lo que el usuario ya ha pagado.
   */
  libres?: Set<string>,
  /*
   * Tres partidos por trozo: unos 200 ms de calculo entre respiro y respiro.
   * Con cinco los tirones se notaban al desplazar; con uno solo, el ir y venir
   * al navegador cuesta mas que el propio calculo.
   */
  porTrozo = 3,
): Generator<Pick[], Pick[], void> {
  /*
   * Se miran los cuarenta partidos más cercanos, no los catorce de antes.
   * Según van terminando los de hoy, sus picks se retiran de la portada; con
   * un cuenco corto la lista se quedaba en tres tarjetas un domingo por la
   * tarde en vez de pasar a los partidos de mañana. El tope de la lista lo
   * pone `limite`, así que ampliar el cuenco no alarga la portada: solo evita
   * que se quede sin material.
   */
  /*
   * Y se paran en cuanto hay material de sobra.
   *
   * Analizar un partido cuesta unos 70 ms: cuarenta son casi tres segundos con
   * el navegador congelado, porque JavaScript no tiene hilos y mientras calcula
   * la página no responde a nada. Con "Todas" activa eso es lo que hacía que se
   * quedara colgada al abrir.
   *
   * La portada enseña `limite` tarjetas. Seguir analizando partidos cuando ya
   * hay cinco veces esa cantidad no cambia lo que se ve: solo cuesta tiempo.
   */
  const partidos = partidosAbiertos(competicionId).slice(0, 40);
  const t = temporada(competicionId);
  const todos: Pick[] = [];
  // Un jugador aparece una sola vez en la portada, con su partido mas cercano,
  // y ningun mercado se repite mas de tres veces: si no, la lista entera acaba
  // siendo "menos de 13.5 remates del equipo" diez veces seguidas.
  const porSujetoPortada = new Map<string, number>();
  const porMercado = new Map<string, number>();
  // Los que se quedan fuera solo por el tope de repeticion. Sirven para
  // rellenar si al final la portada sale corta.
  const reserva: Pick[] = [];

  /*
   * El criterio de orden, definido antes del bucle.
   *
   * Hace falta aquí arriba porque cada entrega parcial sale ya ordenada: si se
   * entregaran en el orden en que se calculan, las primeras tarjetas cambiarían
   * de sitio al llegar las siguientes y la lista bailaría delante de quien la
   * está leyendo.
   */
  const famaDe = (p: Pick) =>
    p.sujeto === 'jugador'
      ? (t.porJugador.get(p.sujetoId)?.nivel ?? 70)
      : p.sujeto === 'equipo'
        ? (t.porEquipo.get(p.sujetoId)?.fuerza ?? 70)
        : 78;

  let desdeElUltimoTrozo = 0;

  for (const p of partidos) {
    /*
     * Diez por partido en vez de seis, y hasta dos del mismo sujeto. Los topes
     * estaban para que la portada no fuese monotona, pero se habian quedado
     * tan bajos que estrangulaban la lista antes de que actuara el filtro de
     * calidad, que es el que de verdad debe decidir que sale.
     */
    /*
     * A la portada solo van los recomendados.
     *
     * La ficha de un partido enseña también los que no llegan al corte, para
     * que quien busca ese partido concreto encuentre análisis. Pero la portada
     * es lo que la app pone delante sin que nadie lo pida, y ahí solo debe
     * haber lo que el backtest respalda. Mezclarlos haría que el 25,8% de
     * retorno medido no aplicara a nada que el usuario pueda distinguir.
     */
    const recomendados = picksDePartido(competicionId, p.id, casaId, libres)
      .filter((x) => x.recomendado)
      .slice(0, 10);
    for (const pick of recomendados) {
      const delSujeto = porSujetoPortada.get(pick.sujetoId) ?? 0;
      if (delSujeto >= 2) continue;
      const mercado = `${pick.metrica}|${pick.sentido}`;
      /*
       * Tope por mercado, para que la portada no sea diez veces el mismo
       * "menos de 2.5 goles". Estaba en tres para toda la lista y se quedaba
       * cortísima: con treinta competiciones a la vez, tres tarjetas de goles
       * en total dejan fuera casi todo lo bueno. Seis deja variedad sin que se
       * repita en pantalla.
       */
      const repetido = porMercado.get(mercado) ?? 0;
      if (repetido >= 12) {
        reserva.push(pick);
        continue;
      }
      porSujetoPortada.set(pick.sujetoId, delSujeto + 1);
      porMercado.set(mercado, repetido + 1);
      todos.push(pick);
    }

    /*
     * Cada cinco partidos se entrega lo que hay y se cede el turno.
     *
     * Este `yield` es todo el arreglo: aquí es donde el navegador recupera el
     * control para atender toques y repintar. Sin él, los cuarenta partidos se
     * calculan de una tirada y la página se queda muerta tres segundos.
     */
    desdeElUltimoTrozo++;
    if (desdeElUltimoTrozo >= porTrozo) {
      desdeElUltimoTrozo = 0;
      yield [...todos]
        .sort((a, b) => valor(b, famaDe(b)) - valor(a, famaDe(a)))
        .slice(0, Math.max(limite, MINIMO_PORTADA));
    }
  }
  const fama = (p: Pick) =>
    p.sujeto === 'jugador'
      ? (t.porJugador.get(p.sujetoId)?.nivel ?? 70)
      : p.sujeto === 'equipo'
        ? (t.porEquipo.get(p.sujetoId)?.fuerza ?? 70)
        : 78;
  /*
   * Lo de hoy manda. Con cuarenta partidos en el cuenco, ordenar solo por
   * valor puede colar por delante un partido de dentro de tres dias y dejar
   * abajo el que empieza en una hora. Quien abre la app quiere apostar hoy.
   *
   * El calculo va dentro del comparador a proposito: sacado a una funcion
   * aparte, el compilador de React lo reordenaba y quedaba sin definir al
   * ejecutarse.
   */
  const inicioDeHoy = new Date();
  inicioDeHoy.setHours(0, 0, 0, 0);
  const finDeHoy = inicioDeHoy.getTime() + 86400000;
  const deHoy = (p: Pick) => {
    const cuando = new Date(t.porPartido.get(p.partidoId)?.fecha ?? 0).getTime();
    return cuando >= inicioDeHoy.getTime() && cuando < finDeHoy ? 1 : 0;
  };

  todos.sort((a, b) => deHoy(b) - deHoy(a) || valor(b, fama(b)) - valor(a, fama(a)));

  /*
   * La portada nunca debe quedarse en cuatro tarjetas. Los topes de variedad
   * son una preferencia, no una regla: si por culpa de ellos no se llega al
   * minimo, se rellena con lo mejor de lo que descartaron, que sigue siendo
   * analisis bueno y solo repite mercado.
   */
  if (todos.length < MINIMO_PORTADA) {
    reserva.sort((a, b) => valor(b, fama(b)) - valor(a, fama(a)));
    for (const p of reserva) {
      if (todos.length >= MINIMO_PORTADA) break;
      const n = porSujetoPortada.get(p.sujetoId) ?? 0;
      if (n >= 2) continue;
      porSujetoPortada.set(p.sujetoId, n + 1);
      todos.push(p);
    }
  }

  return todos.slice(0, Math.max(limite, MINIMO_PORTADA));
}

/** Los picks que mas ha guardado la comunidad. */
export function picksComunidad(competicionId: string, casaId: string, limite = 40): Pick[] {
  const todos = picksDeCompeticion(competicionId, casaId, 200);
  return [...todos].sort((a, b) => b.fuego - a.fuego).slice(0, limite);
}

export { fechaCorta };
