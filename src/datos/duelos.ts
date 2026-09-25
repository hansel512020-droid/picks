import { slugDe } from './envivo';

/**
 * El cara a cara que publica ESPN, pedido en el momento.
 *
 * ── Por qué hace falta ──────────────────────────────────────────────────────
 *
 * El historial mutuo se sacaba de los partidos descargados, y eso solo alcanza
 * a lo que entra en la ventana del importador (tres temporadas). Para dos
 * equipos que llevan años en la misma liga sobra; para dos que se acaban de
 * reencontrar, no hay nada que enseñar aunque se hayan visto catorce veces.
 * Girona y Albacete se enfrentan mañana y el último fue en marzo de 2021: la
 * ficha decía "no se han enfrentado" y quien lo lee piensa que la app falla.
 *
 * Guardar seis temporadas de cada equipo para resolverlo sería multiplicar por
 * dos el archivo que baja cada usuario. ESPN ya tiene ese dato y lo da en el
 * resumen del propio partido —los últimos cinco enfrentamientos, con fecha y
 * marcador—, así que se pide al abrir la ficha y se junta con lo nuestro.
 */

const RAIZ = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

export interface DueloEspn {
  /** ISO, tal como lo da ESPN. */
  fecha: string;
  local: string;
  visitante: string;
  golesLocal: number;
  golesVisitante: number;
}

/*
 * Un partido no cambia de historial mientras la app está abierta, así que se
 * pide una vez y se guarda para toda la sesión. La promesa, no el resultado:
 * si dos partes de la pantalla lo piden a la vez, esperan a la misma petición.
 */
const CACHE = new Map<string, Promise<DueloEspn[]>>();

async function pide(slug: string, idEspn: string): Promise<DueloEspn[]> {
  try {
    const r = await fetch(`${RAIZ}/${slug}/summary?event=${idEspn}`);
    if (!r.ok) return [];
    const j = (await r.json()) as Record<string, any>;

    /*
     * ESPN mete varias series en `seasonseries` (la liguilla, el grupo…); la
     * que interesa es la marcada como enfrentamiento directo.
     */
    const serie = (j.seasonseries ?? []).find((s: any) => s.type === 'head-to-head');
    const salida: DueloEspn[] = [];

    for (const e of serie?.events ?? []) {
      // Solo lo jugado: la propia cita de hoy también viene en la lista.
      if (e.status !== 'post' && !e.statusType?.completed) continue;
      const local = (e.competitors ?? []).find((c: any) => c.homeAway === 'home');
      const visitante = (e.competitors ?? []).find((c: any) => c.homeAway === 'away');
      if (!local || !visitante) continue;
      const gl = Number(local.score);
      const gv = Number(visitante.score);
      if (!Number.isFinite(gl) || !Number.isFinite(gv)) continue;
      salida.push({
        fecha: e.date,
        local: local.team?.displayName ?? '',
        visitante: visitante.team?.displayName ?? '',
        golesLocal: gl,
        golesVisitante: gv,
      });
    }

    return salida;
  } catch {
    // Sin red o con ESPN caído: se sigue con el historial que tenga la app.
    return [];
  }
}

/**
 * Enfrentamientos anteriores entre los dos equipos de un partido, según ESPN.
 * Devuelve lista vacía cuando no se sabe: quien llama enseña lo suyo.
 */
export function caraACaraEspn(competicionId: string, idEspn?: string): Promise<DueloEspn[]> {
  const slug = slugDe(competicionId);
  if (!slug || !idEspn) return Promise.resolve([]);
  const clave = `${slug}:${idEspn}`;
  const guardado = CACHE.get(clave);
  if (guardado) return guardado;
  const pedido = pide(slug, idEspn);
  CACHE.set(clave, pedido);
  return pedido;
}
