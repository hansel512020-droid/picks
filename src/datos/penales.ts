import { slugDe } from './envivo';

/**
 * Tanda de penaltis, lanzador a lanzador.
 *
 * ESPN no publica la tanda como eventos: `keyEvents` solo trae los goles del
 * partido y el bloque de penaltis viene vacío. Lo que sí trae es el relato
 * (`commentary`), y ahí está todo — quién marcó, a quién se lo pararon y quién
 * la mandó fuera. De ahí se saca.
 *
 * El marcador de la tanda viene aparte, en `shootoutScore` de cada equipo, así
 * que ese no hay que deducirlo del texto.
 */

const RAIZ = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

export type SuertePenalti = 'gol' | 'parado' | 'fuera';

export interface Lanzamiento {
  orden: number;
  jugador: string;
  equipo: string;
  suerte: SuertePenalti;
}

export interface Tanda {
  equipoLocal: string;
  equipoVisitante: string;
  golesLocal: number;
  golesVisitante: number;
  lanzamientos: Lanzamiento[];
}

/**
 * Del texto del relato salen el nombre y el equipo. Las tres formas que usa
 * ESPN son:
 *
 *   "Goal! ... Max Clark (Gillingham) converts the penalty ..."
 *   "Penalty saved. Remeao Hutton (Gillingham) right footed shot saved ..."
 *   "Penalty missed! ... Sam Vokes (Gillingham) hits the bar ..."
 */
function leeLanzamiento(texto: string): { jugador: string; equipo: string; suerte: SuertePenalti } | null {
  let suerte: SuertePenalti;
  if (/converts the penalty/i.test(texto)) suerte = 'gol';
  else if (/^Penalty saved/i.test(texto)) suerte = 'parado';
  else if (/^Penalty missed/i.test(texto)) suerte = 'fuera';
  else return null;

  /*
   * El nombre es lo que va justo delante del paréntesis con el equipo. En el
   * caso del parado hay un segundo paréntesis con el portero ("saved ... by
   * Jordan Wright (Newport County)"), así que se coge la primera aparición y
   * no la última.
   */
  const m = texto.match(/([\p{L}\p{M}.'’\- ]+?)\s*\(([^)]+)\)/u);
  if (!m) return null;

  return {
    jugador: m[1].replace(/^.*?[.!]\s*/, '').trim(),
    equipo: m[2].trim(),
    suerte,
  };
}

export interface Agregado {
  /** Global de la eliminatoria, contando la ida. */
  local: number;
  visitante: number;
  /** "Arsenal avanza", cuando ESPN lo dice. */
  avanza?: string;
}

export interface Extras {
  tanda: Tanda | null;
  agregado: Agregado | null;
}

/**
 * Lo que un partido de eliminatoria tiene y uno de liga no: el global de los
 * dos partidos y, si la hubo, la tanda de penaltis.
 *
 * Va todo en la misma petición porque sale del mismo sitio: pedir el resumen
 * tres veces —una para el once, otra para la tanda y otra para el global— es
 * castigar la conexión del móvil sin motivo.
 */
export async function extrasDelPartido(
  competicionId: string,
  idEspn: string,
): Promise<Extras> {
  const vacio: Extras = { tanda: null, agregado: null };
  const slug = slugDe(competicionId);
  if (!slug || !idEspn) return vacio;

  try {
    const r = await fetch(`${RAIZ}/${slug}/summary?event=${idEspn}`);
    if (!r.ok) return vacio;
    const j = (await r.json()) as Record<string, any>;

    const competencia = j.header?.competitions?.[0];
    const competidores = competencia?.competitors ?? [];
    const local = competidores.find((x: any) => x.homeAway === 'home');
    const visitante = competidores.find((x: any) => x.homeAway === 'away');

    // ---------------------------------------------------------- el global
    let agregado: Agregado | null = null;
    const agLocal = Number(local?.aggregateScore);
    const agVisitante = Number(visitante?.aggregateScore);
    if (Number.isFinite(agLocal) && Number.isFinite(agVisitante)) {
      // ESPN lo cuenta en el titular: "2nd Leg - Arsenal advance 2-1 on aggregate".
      const titular: string = (competencia?.notes ?? []).find(
        (n: any) => n?.type === 'event',
      )?.headline ?? '';
      const quien = titular.match(/-\s*(.+?)\s+advances?\s+/i)?.[1];
      agregado = { local: agLocal, visitante: agVisitante, avanza: quien };
    }

    // ----------------------------------------------------------- la tanda
    const golesLocal = Number(local?.shootoutScore);
    const golesVisitante = Number(visitante?.shootoutScore);
    const hayTanda =
      Number.isFinite(golesLocal) && Number.isFinite(golesVisitante) &&
      (golesLocal > 0 || golesVisitante > 0);
    if (!hayTanda) return { tanda: null, agregado };

    // Del relato solo interesa lo que va después de "Penalty Shootout begins":
    // en el partido puede haber habido penaltis normales, y esos no cuentan.
    const relato: { text?: string }[] = j.commentary ?? [];
    const arranque = relato.findIndex((x) => /Penalty Shootout begins/i.test(x.text ?? ''));
    const desde = arranque >= 0 ? relato.slice(arranque + 1) : relato;

    const lanzamientos: Lanzamiento[] = [];
    for (const linea of desde) {
      const leido = leeLanzamiento(linea.text ?? '');
      if (leido) lanzamientos.push({ orden: lanzamientos.length + 1, ...leido });
    }

    return {
      agregado,
      tanda: {
        equipoLocal: local?.team?.displayName ?? '',
        equipoVisitante: visitante?.team?.displayName ?? '',
        golesLocal,
        golesVisitante,
        lanzamientos,
      },
    };
  } catch {
    return vacio;
  }
}
