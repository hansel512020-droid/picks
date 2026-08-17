import { slugDe } from './envivo';

/**
 * Alineaciones reales pedidas a ESPN en el momento.
 *
 * ESPN publica el once y el dibujo táctico de cada equipo, y lo hace también
 * antes del partido en cuanto el club lo anuncia (aproximadamente una hora
 * antes). Por eso esto se pide desde la app y no en la importación: una
 * alineación descargada ayer no sirve para el partido de esta tarde.
 *
 * Lo que ESPN NO da en fútbol es el parte de lesiones: el bloque `injuries`
 * viene vacío y el endpoint por equipo devuelve `{}`. Cuando no hay dato, la
 * app lo dice en lugar de inventárselo.
 */

const RAIZ = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

export interface JugadorAlineado {
  nombre: string;
  dorsal: number;
  /** Puesto tal como lo etiqueta ESPN: G, CD, LM, ST… */
  puesto: string;
  titular: boolean;
  idEspn?: string;
}

export interface OnceEquipo {
  equipo: string;
  /** Dibujo táctico, por ejemplo "4-2-3-1". Puede faltar. */
  formacion?: string;
  titulares: JugadorAlineado[];
  suplentes: JugadorAlineado[];
}

export interface Alineaciones {
  local?: OnceEquipo;
  visitante?: OnceEquipo;
  /** Falso mientras ESPN aún no ha publicado el once. */
  confirmadas: boolean;
}

function unEquipo(bloque: Record<string, any>): OnceEquipo {
  const gente: JugadorAlineado[] = (bloque.roster ?? []).map((e: Record<string, any>) => ({
    nombre: e.athlete?.displayName ?? '',
    dorsal: Number(e.jersey) || 0,
    puesto: e.position?.abbreviation ?? '',
    titular: !!e.starter,
    idEspn: e.athlete?.id,
  }));
  return {
    equipo: bloque.team?.displayName ?? '',
    formacion: bloque.formation,
    titulares: gente.filter((x) => x.titular),
    suplentes: gente.filter((x) => !x.titular),
  };
}

/**
 * Once de los dos equipos de un partido. Devuelve `null` si no hay conexión o
 * si ESPN no tiene ese partido; devuelve `confirmadas: false` cuando responde
 * pero todavía no hay once publicado.
 */
export async function alineacionesDelPartido(
  competicionId: string,
  idEspn: string,
): Promise<Alineaciones | null> {
  const slug = slugDe(competicionId);
  if (!slug || !idEspn) return null;
  try {
    const r = await fetch(`${RAIZ}/${slug}/summary?event=${idEspn}`);
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, any>;

    const bloques = j.rosters ?? [];
    if (!bloques.length) return { confirmadas: false };

    // ESPN marca el lado en la cabecera, no en el propio bloque de plantilla.
    const competidores = j.header?.competitions?.[0]?.competitors ?? [];
    const idLocal = competidores.find((x: any) => x.homeAway === 'home')?.team?.id;

    const uno = unEquipo(bloques[0]);
    const dos = bloques[1] ? unEquipo(bloques[1]) : undefined;
    const primeroEsLocal = String(bloques[0]?.team?.id ?? '') === String(idLocal ?? '');

    const local = primeroEsLocal ? uno : dos;
    const visitante = primeroEsLocal ? dos : uno;

    return {
      local,
      visitante,
      // Un once publicado son once titulares; menos que eso es una previsión.
      confirmadas: (local?.titulares.length ?? 0) >= 11 && (visitante?.titulares.length ?? 0) >= 11,
    };
  } catch {
    return null;
  }
}
