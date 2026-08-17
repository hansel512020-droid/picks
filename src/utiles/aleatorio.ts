/**
 * Generador pseudoaleatorio con semilla. Todo el dataset se construye con el,
 * asi que la app ensena los mismos numeros en cada arranque: si un pick dice
 * 9 de 10, manana sigue diciendo 9 de 10.
 */

/** Convierte cualquier cadena en una semilla de 32 bits. */
export function semilla(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class Aleatorio {
  private estado: number;

  constructor(sem: number | string) {
    this.estado = (typeof sem === 'string' ? semilla(sem) : sem) || 1;
  }

  /** mulberry32: rapido y con buena distribucion para lo que necesitamos. */
  siguiente(): number {
    this.estado = (this.estado + 0x6d2b79f5) >>> 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero en [min, max]. */
  entero(min: number, max: number): number {
    return Math.floor(this.siguiente() * (max - min + 1)) + min;
  }

  /** Decimal en [min, max). */
  rango(min: number, max: number): number {
    return this.siguiente() * (max - min) + min;
  }

  /** true con probabilidad p. */
  suerte(p: number): boolean {
    return this.siguiente() < p;
  }

  elige<T>(lista: readonly T[]): T {
    return lista[Math.floor(this.siguiente() * lista.length)];
  }

  /** Normal por Box-Muller, recortada para no sacar valores absurdos. */
  normal(media: number, desviacion: number): number {
    const u = Math.max(this.siguiente(), 1e-9);
    const v = this.siguiente();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return media + z * desviacion;
  }

  /** Numero de sucesos de Poisson con media lambda. Asi salen los goles. */
  poisson(lambda: number): number {
    if (lambda <= 0) return 0;
    if (lambda > 20) return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))));
    const limite = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.siguiente();
    } while (p > limite);
    return k - 1;
  }

  /** Baraja una copia de la lista. */
  baraja<T>(lista: readonly T[]): T[] {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const k = Math.floor(this.siguiente() * (i + 1));
      [copia[i], copia[k]] = [copia[k], copia[i]];
    }
    return copia;
  }
}
