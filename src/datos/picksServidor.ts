import { sesionGuardada } from './cuenta';
import type { Pick } from './tipos';

/**
 * Los picks, pedidos ya hechos al servidor.
 *
 * ── Por qué ────────────────────────────────────────────────────────────────
 *
 * Se calculaban aquí, en el teléfono, a partir del archivo de datos. Y ese
 * archivo se le entrega a cualquiera que tenga cuenta, así que con él y el
 * código —que es público— cualquiera reproducía los picks de todas las ligas
 * sin pagar ninguna: el muro de pago tapaba la pantalla, no el dato.
 *
 * Ahora los cocina el bot y los deja en una tabla. La vista `picks_visibles`
 * decide fila por fila qué manda: el pick entero a quien ha pagado esa liga
 * (y el gratis del día a todo el mundo), y a los demás la versión vaciada
 * —nombre y partido, sin mercado, sin línea, sin argumento y sin números—
 * para que la tarjeta con candado siga existiendo y se vea qué se compra.
 *
 * O sea que lo que no es tuyo ya no viaja hasta tu teléfono.
 *
 * ── Qué cambia para la app ─────────────────────────────────────────────────
 *
 * Una petición al abrir en vez de analizar cien partidos, y hace falta
 * conexión para ver picks nuevos. Lo ya descargado se queda en memoria
 * mientras la app viva.
 */

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
const CLAVE = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Una fila de la vista, tal como llega. */
interface FilaServidor {
  id: string;
  competicion: string;
  partido_id: string;
  cuando: string;
  pro: boolean;
  gratis: boolean;
  /** Si a este usuario le toca el pick entero. */
  desbloqueado: boolean;
  datos: Pick;
}

let PICKS: Pick[] = [];
let PORPARTIDO = new Map<string, Pick[]>();
let GRATIS: Pick | null = null;
let cargados = false;
/*
 * Si ya se ha intentado, aunque saliera mal.
 *
 * Va aparte de `cargados` para que un fallo no deje la pantalla girando: sin
 * esto, una petición que falla nunca marca nada y la portada se queda en la
 * pantalla de carga para siempre. Con esto se pinta "no hay picks", que es
 * feo pero honesto, y el siguiente intento vuelve a probar.
 */
let intentado = false;
let cargando: Promise<void> | null = null;

const avisos: (() => void)[] = [];

/** Se apunta aquí quien tenga que repintar cuando lleguen los picks. */
export function cuandoLleguenLosPicks(repinta: () => void): () => void {
  avisos.push(repinta);
  return () => {
    const i = avisos.indexOf(repinta);
    if (i >= 0) avisos.splice(i, 1);
  };
}

/** Si ya se han pedido alguna vez, con éxito o sin él. */
export function hayPicksDelServidor(): boolean {
  return intentado;
}

/**
 * Los trae del servidor. Se pide de mil en mil porque PostgREST no entrega
 * más de golpe, y una liga con sus partidos de diez días pasa de eso.
 */
async function pide(token: string): Promise<FilaServidor[]> {
  const filas: FilaServidor[] = [];
  const TAMANO = 1000;
  for (let desde = 0; ; desde += TAMANO) {
    const r = await fetch(
      `${URL}/rest/v1/picks_visibles?select=*&order=cuando.asc`,
      {
        headers: {
          apikey: CLAVE ?? '',
          Authorization: `Bearer ${token}`,
          Range: `${desde}-${desde + TAMANO - 1}`,
        },
      },
    );
    if (!r.ok) throw new Error(`picks_visibles respondió ${r.status}`);
    const tanda = (await r.json()) as FilaServidor[];
    filas.push(...tanda);
    if (tanda.length < TAMANO) break;
  }
  return filas;
}

/**
 * Descarga los picks del usuario. Se puede llamar las veces que haga falta:
 * si ya se están pidiendo, se espera a esa misma petición.
 */
export async function cargaPicks(forzar = false): Promise<void> {
  if (!URL || !CLAVE) return;
  if (cargados && !forzar) return;
  if (cargando) return cargando;

  cargando = (async () => {
    try {
      const sesion = await sesionGuardada();
      if (!sesion?.token) return;

      const filas = await pide(sesion.token);

      /*
       * El candado se decide aquí y no en la pantalla.
       *
       * Antes cada tarjeta miraba los derechos del usuario para saber si
       * taparse. Ahora el servidor ya ha decidido —y además solo ha mandado
       * el contenido de lo que toca—, así que `pro` pasa a significar
       * exactamente "esto te llegó vacío".
       */
      const picks = filas.map((f) => ({ ...f.datos, pro: !f.desbloqueado }) as Pick);

      const porPartido = new Map<string, Pick[]>();
      for (const p of picks) {
        const suyos = porPartido.get(p.partidoId);
        if (suyos) suyos.push(p);
        else porPartido.set(p.partidoId, [p]);
      }

      PICKS = picks;
      PORPARTIDO = porPartido;
      GRATIS = picks.find((p) => filas.find((f) => f.id === p.id)?.gratis) ?? null;
      cargados = true;
      for (const repinta of avisos) repinta();
    } catch {
      /*
       * Sin red o con el servidor caído no se rompe nada: quien llame verá la
       * lista vacía y la pantalla dirá que no hay picks, igual que un día sin
       * partidos. Como `cargados` se queda en false, la siguiente llamada lo
       * vuelve a intentar.
       */
    } finally {
      intentado = true;
      cargando = null;
      for (const repinta of avisos) repinta();
    }
  })();

  return cargando;
}

/** Todos los que le tocan a este usuario, ya ordenados por fecha. */
export function picksDelServidor(): Pick[] {
  return PICKS;
}

/** Los de una competición. `todas` devuelve la lista entera. */
export function picksDeCompeticionServidor(competicionId: string): Pick[] {
  if (competicionId === 'todas') return PICKS;
  return PICKS.filter((p) => p.competicionId === competicionId);
}

/** Los de un partido concreto. */
export function picksDePartidoServidor(partidoId: string): Pick[] {
  return PORPARTIDO.get(partidoId) ?? [];
}

/** Uno por su identificador. */
export function pickDelServidor(id: string): Pick | undefined {
  return PICKS.find((p) => p.id === id);
}

/** El gratis de hoy, el mismo para todo el mundo. */
export function pickGratisDelServidor(): Pick | null {
  return GRATIS;
}
