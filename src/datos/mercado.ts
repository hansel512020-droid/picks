import { Aleatorio } from '@/utiles/aleatorio';
import { casa as buscaCasa } from './casas';
import type { Posicion } from './tipos';

/**
 * Modelo de precios. La clave de la app es que la cuota NO sale de la racha
 * reciente del jugador: sale de su media de toda la temporada, corregida hacia
 * el patron de su puesto, que es como tarifica el mercado. Cuando la forma de
 * las ultimas semanas se separa de esa media aparece la ventaja que busca la
 * app.
 */

/** Media por partido de un jugador medio en cada puesto. */
const BASE: Record<string, Record<Posicion, number>> = {
  goles: { POR: 0.001, DEF: 0.05, MED: 0.11, DEL: 0.34 },
  remates: { POR: 0.02, DEF: 0.5, MED: 1.0, DEL: 2.1 },
  rematesPuerta: { POR: 0.01, DEF: 0.16, MED: 0.35, DEL: 0.85 },
  asistencias: { POR: 0.01, DEF: 0.06, MED: 0.13, DEL: 0.15 },
  pasesClave: { POR: 0.06, DEF: 0.45, MED: 1.15, DEL: 1.05 },
  regates: { POR: 0.04, DEF: 0.4, MED: 0.9, DEL: 1.45 },
  faltasRecibidas: { POR: 0.08, DEF: 0.55, MED: 1.1, DEL: 1.25 },
  faltasCometidas: { POR: 0.08, DEF: 0.8, MED: 0.95, DEL: 0.7 },
  entradas: { POR: 0.04, DEF: 1.6, MED: 1.35, DEL: 0.45 },
  intercepciones: { POR: 0.12, DEF: 1.15, MED: 0.9, DEL: 0.3 },
  despejes: { POR: 0.9, DEF: 2.5, MED: 0.8, DEL: 0.4 },
  duelosGanados: { POR: 0.5, DEF: 3.9, MED: 3.6, DEL: 2.8 },
  toquesArea: { POR: 3.6, DEF: 0.55, MED: 1.25, DEL: 3.6 },
  amarillas: { POR: 0.05, DEF: 0.16, MED: 0.17, DEL: 0.11 },
  paradas: { POR: 2.6, DEF: 0, MED: 0, DEL: 0 },
};

/**
 * Metricas que el mercado trata como una media con dispersion, no como un
 * conteo. La desviacion se saca de la propia media (un jugador que da 40 pases
 * varia mas en valor absoluto que uno que da 12), salvo en los minutos, donde
 * la dispersion la marcan los cambios y no la media.
 */
const CONTINUAS: Record<string, { media: Record<Posicion, number>; desviacion: (m: number) => number }> = {
  pases: {
    media: { POR: 26, DEF: 45, MED: 50, DEL: 24 },
    desviacion: (m) => Math.max(3.5, m * 0.3),
  },
  minutos: {
    media: { POR: 86, DEF: 76, MED: 70, DEL: 68 },
    desviacion: () => 17,
  },
};

const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800];

/** P(X > linea) con X ~ Poisson(lambda). La linea siempre acaba en .5. */
function poissonSobre(lambda: number, linea: number): number {
  if (lambda <= 0) return 0.001;
  const k = Math.floor(linea);
  let acumulada = 0;
  for (let i = 0; i <= k && i < FACT.length; i++) {
    acumulada += (Math.exp(-lambda) * Math.pow(lambda, i)) / FACT[i];
  }
  return Math.min(0.995, Math.max(0.005, 1 - acumulada));
}

/** P(X > linea) con X ~ Normal(media, desviacion). */
function normalSobre(media: number, desviacion: number, linea: number): number {
  const z = (linea - media) / Math.max(1, desviacion);
  // Aproximacion logistica de la normal acumulada: sobra de precisa aqui.
  const acumulada = 1 / (1 + Math.exp(-1.702 * z));
  return Math.min(0.99, Math.max(0.01, 1 - acumulada));
}

/**
 * Cuanto pesa el jugador concreto frente al patron de su puesto. El mercado
 * conoce bien a cada jugador, pero tira algo hacia la media del puesto: ahi
 * vive la ventaja de los especialistas, y por eso es un margen pequeno.
 */
const PESO_JUGADOR = 0.85;

/**
 * Probabilidad que el mercado le asigna a que un jugador supere la linea.
 * Mezcla lo que hace un jugador medio de ese puesto con la media historica del
 * propio jugador, pero ignora por completo su racha reciente.
 */
export function probMercadoJugador(
  metrica: string,
  linea: number,
  posicion: Posicion,
  nivel: number,
  mediaPropia: number,
): number {
  const continua = CONTINUAS[metrica];
  if (continua) {
    const ajuste = 1 + (nivel - 75) * 0.006;
    const mezcla =
      continua.media[posicion] * ajuste * (1 - PESO_JUGADOR) + mediaPropia * PESO_JUGADOR;
    return normalSobre(mezcla, continua.desviacion(mezcla), linea);
  }
  const base = BASE[metrica]?.[posicion];
  if (base === undefined) return 0.5;
  const delPuesto = base * Math.pow(1.021, nivel - 75);
  const lambda = delPuesto * (1 - PESO_JUGADOR) + mediaPropia * PESO_JUGADOR;
  return poissonSobre(lambda, linea);
}

/** Igual, pero para metricas de equipo y de partido. */
export function probMercadoEquipo(
  metrica: string,
  linea: number,
  mediaCompeticion: number,
  mediaPropia: number,
): number {
  // La casa parte de la media de la competicion y corrige por el equipo.
  const lambda =
    Math.max(0.1, mediaCompeticion) * (1 - PESO_JUGADOR) + Math.max(0.1, mediaPropia) * PESO_JUGADOR;
  return poissonSobre(lambda, linea);
}

/** Convierte probabilidad en precio con el margen de la casa. */
export function precioDe(prob: number, casaId: string, semilla: string): number {
  const c = buscaCasa(casaId);
  /*
   * Sin ruido aleatorio.
   *
   * Aquí se le sumaba un ±3% al azar al precio estimado, para que no pareciera
   * salido de una fórmula. Pero ese ruido entra en la ventaja que decide qué
   * picks se publican y en qué orden, así que era azar disfrazado de dato. El
   * precio es una estimación del modelo —y la app lo marca como "EST"—, pero al
   * menos es la misma estimación siempre y sale entera de las estadísticas.
   */
  const conMargen = Math.min(0.96, Math.max(0.02, prob * c.margen));
  return Number((1 / conMargen).toFixed(2));
}

export { poissonSobre, normalSobre };
