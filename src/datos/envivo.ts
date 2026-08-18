import { competicionesImportadas } from './importado';

/**
 * Datos en vivo pedidos por la propia app, no por el importador.
 *
 * El archivo importado es una foto del momento en que se descargó: sirve para
 * el historial y el calendario, pero no para saber cómo va un partido ahora
 * mismo. Esto pregunta a ESPN cada minuto mientras hay algo en juego, que es
 * la única forma de que el marcador y el minuto sean de verdad.
 *
 * Si no hay conexión no pasa nada: se queda con lo último que supo.
 */

const RAIZ = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

/** La misma tabla que usa el importador, para pedir la competición correcta. */
const LIGAS: Record<string, string> = {
  premier: 'eng.1', championship: 'eng.2', laliga: 'esp.1', seriea: 'ita.1',
  bundesliga: 'ger.1', ligue1: 'fra.1', eredivisie: 'ned.1', portugal: 'por.1',
  belgica: 'bel.1', turquia: 'tur.1', grecia: 'gre.1', escocia: 'sco.1',
  suiza: 'sui.1', austria: 'aut.1', dinamarca: 'den.1', noruega: 'nor.1',
  suecia: 'swe.1', polonia: 'pol.1', rumania: 'rou.1', chequia: 'cze.1',
  croacia: 'cro.1', serbia: 'srb.1', ucrania: 'ukr.1',
  champions: 'uefa.champions', europaleague: 'uefa.europa',
  conference: 'uefa.europa.conf',
  // Fases previas: competiciones distintas en ESPN, con su propio marcador.
  championsprevia: 'uefa.champions_qual', europaprevia: 'uefa.europa_qual',
  conferenceprevia: 'uefa.europa.conf_qual',
  libertadores: 'conmebol.libertadores',
  sudamericana: 'conmebol.sudamericana', concachampions: 'concacaf.champions',
  copadelrey: 'esp.copa_del_rey', facup: 'eng.fa', carabao: 'eng.league_cup',
  coppa: 'ita.coppa_italia', dfbpokal: 'ger.dfb_pokal',
  coupefrance: 'fra.coupe_de_france', mundial: 'fifa.world', euro: 'uefa.euro',
  copaamerica: 'conmebol.america', nationsleague: 'uefa.nations',
  ligamx: 'mex.1', brasileirao: 'bra.1', argentina: 'arg.1', mls: 'usa.1',
  // Segundas divisiones. Traen partidos entre semana, cuando las primeras
  // descansan, y en agosto son de lo poco que hay en juego.
  bundesliga2: 'ger.2', ligue2: 'fra.2', expansionmx: 'mex.2',
  brasileiraob: 'bra.2', argentinab: 'arg.2',
  colombia: 'col.1', chile: 'chi.1', peru: 'per.1', bolivia: 'bol.1',
  ecuador: 'ecu.1', uruguay: 'uru.1', paraguay: 'par.1', venezuela: 'ven.1',
  japon: 'jpn.1', corea: 'kor.1', australia: 'aus.1', china: 'chn.1',
  saudi: 'ksa.1', egipto: 'egy.1', sudafrica: 'rsa.1', marruecos: 'mar.1',
};

/** Slug de ESPN de una competición, para pedirle el detalle de un partido. */
export function slugDe(competicionId: string): string | undefined {
  return LIGAS[competicionId];
}

export type EstadoVivo = 'previa' | 'en_curso' | 'descanso' | 'penales' | 'finalizado';

export interface PartidoVivo {
  competicionId: string;
  /** Nombres tal como los da ESPN: es como se casan con los importados. */
  local: string;
  visitante: string;
  golesLocal: number;
  golesVisitante: number;
  estado: EstadoVivo;
  minuto?: number;
  /**
   * El reloj tal cual lo da ESPN: "67'" o "90'+3'".
   *
   * Se guarda entero porque `minuto` es un número y el descuento se pierde:
   * un partido en el 90+5 se quedaba clavado en 90 y parecía que el reloj no
   * avanzaba.
   */
  reloj?: string;
  fecha: string;
  /**
   * Marcador de la tanda de penaltis, cuando la hay. Va aparte de los goles
   * porque el partido sigue siendo 2-2: la tanda no cambia el resultado, solo
   * dice quién pasa.
   */
  penalesLocal?: number;
  penalesVisitante?: number;
  /** El identificador de ESPN, para poder pedirle el detalle de la tanda. */
  idEspn?: string;
}

function estadoDe(tipo: { state?: string; name?: string; completed?: boolean }): EstadoVivo {
  // La tanda se está lanzando ahora: el partido no ha terminado.
  if (tipo?.name === 'STATUS_SHOOTOUT') return 'penales';
  if (tipo?.state === 'post' || tipo?.completed) return 'finalizado';
  if (tipo?.name === 'STATUS_HALFTIME') return 'descanso';
  if (tipo?.state === 'in') return 'en_curso';
  return 'previa';
}

const aFecha = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

/** Clave con la que se reconoce un partido venga de donde venga. */
export function claveDelPartido(local: string, visitante: string): string {
  const limpio = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '');
  return `${limpio(local)}|${limpio(visitante)}`;
}

/** Pide a ESPN los partidos de hoy de una competición. */
async function deLaCompeticion(competicionId: string): Promise<PartidoVivo[]> {
  const slug = LIGAS[competicionId];
  if (!slug) return [];
  try {
    const r = await fetch(`${RAIZ}/${slug}/scoreboard?dates=${aFecha(new Date())}`);
    if (!r.ok) return [];
    const j = (await r.json()) as { events?: unknown[] };

    return (j.events ?? []).flatMap((crudo) => {
      const e = crudo as {
        id?: string;
        date: string;
        competitions?: {
          status?: { type?: { state?: string; name?: string; completed?: boolean }; displayClock?: string };
          competitors?: {
            homeAway: string;
            score?: string;
            shootoutScore?: number;
            team?: { displayName?: string };
          }[];
        }[];
      };
      const c = e.competitions?.[0];
      const local = c?.competitors?.find((x) => x.homeAway === 'home');
      const visitante = c?.competitors?.find((x) => x.homeAway === 'away');
      if (!local?.team?.displayName || !visitante?.team?.displayName) return [];

      return [
        {
          competicionId,
          local: local.team.displayName,
          visitante: visitante.team.displayName,
          golesLocal: Number(local.score) || 0,
          golesVisitante: Number(visitante.score) || 0,
          estado: estadoDe(c?.status?.type ?? {}),
          minuto: c?.status?.displayClock ? parseInt(c.status.displayClock, 10) || undefined : undefined,
          reloj: c?.status?.displayClock?.replace(/'/g, '') || undefined,
          fecha: e.date,
          idEspn: e.id,
          penalesLocal: Number.isFinite(Number(local.shootoutScore)) ? Number(local.shootoutScore) : undefined,
          penalesVisitante: Number.isFinite(Number(visitante.shootoutScore)) ? Number(visitante.shootoutScore) : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

/**
 * Partidos de hoy. Sin argumentos barre las 36 competiciones importadas, que
 * tarda unos segundos; pasándole una lista corta se refresca solo lo que está
 * en juego, que es lo que permite ir al minuto sin castigar la batería ni los
 * datos del móvil.
 *
 * Se piden de cinco en cinco para no abrir sesenta conexiones a la vez.
 */
export async function partidosDeHoy(
  competiciones?: string[],
): Promise<Map<string, PartidoVivo>> {
  const mapa = new Map<string, PartidoVivo>();
  const ids = (competiciones ?? competicionesImportadas()).filter((id) => LIGAS[id]);

  for (let i = 0; i < ids.length; i += 5) {
    const lote = await Promise.all(ids.slice(i, i + 5).map(deLaCompeticion));
    for (const partidos of lote) {
      for (const p of partidos) mapa.set(claveDelPartido(p.local, p.visitante), p);
    }
  }
  return mapa;
}

/** Solo lo que se está jugando ahora mismo. */
export async function enJuegoAhora(): Promise<PartidoVivo[]> {
  const todos = await partidosDeHoy();
  return [...todos.values()].filter(
    (p) => p.estado === 'en_curso' || p.estado === 'descanso',
  );
}
