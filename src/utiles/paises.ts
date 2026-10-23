/**
 * El nombre del país en español a partir de su bandera.
 *
 * La nacionalidad de los jugadores importados viene de la plantilla de ESPN,
 * en inglés ("France", "Korea Republic"). La bandera que se saca de ahí sí es
 * fiable —dos indicadores regionales con el código ISO—, así que el nombre se
 * reconstruye desde ella con la tabla de regiones del propio navegador. Si no
 * se puede (bandera de torneo, Intl incompleto), se queda el nombre original.
 */

/** Inglaterra, Escocia y Gales no son países ISO: van con su etiqueta. */
const SUBDIVISIONES: Record<string, string> = {
  gbeng: 'Inglaterra',
  gbsct: 'Escocia',
  gbwls: 'Gales',
};

/** Donde la tabla del navegador no dice lo que se dice en la tele. */
const COMO_SE_DICE: Record<string, string> = {
  CI: 'Costa de Marfil',
  CD: 'RD Congo',
  CZ: 'Chequia',
  US: 'Estados Unidos',
  BA: 'Bosnia',
};

let nombres: Intl.DisplayNames | null | undefined;

function tablaEs(): Intl.DisplayNames | null {
  if (nombres !== undefined) return nombres;
  try {
    nombres = new Intl.DisplayNames(['es'], { type: 'region' });
  } catch {
    nombres = null;
  }
  return nombres;
}

const CACHE = new Map<string, string | undefined>();

function desdeBandera(bandera: string): string | undefined {
  const cp = [...bandera].map((c) => c.codePointAt(0) ?? 0);
  if (cp.length === 2 && cp.every((c) => c >= 0x1f1e6 && c <= 0x1f1ff)) {
    const codigo = String.fromCharCode(...cp.map((c) => c - 0x1f1e6 + 65));
    if (COMO_SE_DICE[codigo]) return COMO_SE_DICE[codigo];
    try {
      const nombre = tablaEs()?.of(codigo);
      return nombre && nombre !== codigo ? nombre : undefined;
    } catch {
      return undefined;
    }
  }
  if (cp[0] === 0x1f3f4 && cp.length > 2) {
    const etiqueta = String.fromCharCode(
      ...cp
        .slice(1)
        .filter((c) => c > 0xe0000 && c < 0xe007f)
        .map((c) => c - 0xe0000),
    );
    return SUBDIVISIONES[etiqueta];
  }
  return undefined;
}

/** "Francia" para 🇫🇷 aunque el dato diga "France". */
export function paisEnEspanol(bandera: string | undefined, pais: string | undefined): string | undefined {
  if (bandera) {
    if (!CACHE.has(bandera)) CACHE.set(bandera, desdeBandera(bandera));
    const nombre = CACHE.get(bandera);
    if (nombre) return nombre;
  }
  return pais || undefined;
}
