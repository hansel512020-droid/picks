import { sesionGuardada } from './cuenta';
import { SOLO_RELLENO } from './competiciones';
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
/*
 * Si lo que hay es solo la primera tanda y el resto sigue llegando.
 *
 * Son más de diez mil picks —unos 13 MB— y se pedían de mil en mil, uno
 * detrás de otro, antes de enseñar nada: la portada se quedaba medio minuto en
 * "Trayendo los picks de hoy". Ahora se pinta con la primera tanda, que va
 * ordenada por hora y por tanto trae los de hoy, y el resto llega por detrás.
 */
let parcial = false;
/** Si el último intento de traerlos falló (sin red, servidor caído, tiempo agotado). */
let fallo = false;

/**
 * En qué va la carga, para la pantalla de espera.
 *
 * La portada decía "Trayendo los picks de hoy" con la barra quieta en el 40%
 * pasara lo que pasara: no se sabía si iba lenta, si estaba esperando a la
 * cuenta o si se había quedado colgada. Ahora dice el paso y cuántos van.
 */
export interface EstadoCarga {
  fase: 'esperando' | 'cuenta' | 'pidiendo' | 'preparando' | 'resto' | 'listo' | 'error';
  recibidos: number;
  total?: number;
  /** Cuándo empezó este intento, para decir cuánto lleva. */
  desde: number;
  error?: string;
}
let estadoCarga: EstadoCarga = { fase: 'esperando', recibidos: 0, desde: Date.now() };
/*
 * Oyentes aparte de `avisos`: esos dan la lista por cargada en cuanto suenan,
 * y el progreso suena muchas veces antes de que haya nada.
 */
const oyentesCarga: (() => void)[] = [];

function marcaCarga(cambio: Partial<EstadoCarga>) {
  estadoCarga = { ...estadoCarga, ...cambio };
  for (const avisa of oyentesCarga) avisa();
}

export function estadoDeLaCarga(): EstadoCarga {
  return estadoCarga;
}

export function cuandoAvanceLaCarga(avisa: () => void): () => void {
  oyentesCarga.push(avisa);
  return () => {
    const i = oyentesCarga.indexOf(avisa);
    if (i >= 0) oyentesCarga.splice(i, 1);
  };
}

/** Un respiro para que el navegador pinte el paso antes de un trabajo largo. */
const respira = () => new Promise<void>((ok) => setTimeout(ok, 0));

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

/** Si ya está la lista entera, no solo la primera tanda. */
export function picksCompletos(): boolean {
  return !parcial;
}

/** Si no se pudieron traer: la portada lo dice y ofrece reintentar. */
export function picksFallaron(): boolean {
  return fallo;
}

/**
 * Cuánto se espera a cada tanda. Sin tope, una petición que se queda colgada
 * —una red que no contesta ni falla— dejaba la portada en la pantalla de carga
 * para siempre.
 */
const ESPERA_MAXIMA = 25_000;

/** PostgREST no entrega más de mil filas por petición. */
const TAMANO = 1000;
/** Cuántas tandas se piden a la vez después de la primera. */
const A_LA_VEZ = 4;

/**
 * Una tanda de mil, por orden de hora. Con `contar`, también cuántas hay en
 * total (sale de la cabecera Content-Range: "0-999/10436").
 */
async function tanda(
  token: string,
  desde: number,
  contar = false,
): Promise<{ filas: FilaServidor[]; total?: number }> {
  const corta = new AbortController();
  const reloj = setTimeout(() => corta.abort(), ESPERA_MAXIMA);
  let filas: FilaServidor[];
  let r: Response;
  try {
    r = await fetch(`${URL}/rest/v1/picks_visibles?select=*&order=cuando.asc,id.asc`, {
      headers: {
        apikey: CLAVE ?? '',
        Authorization: `Bearer ${token}`,
        Range: `${desde}-${desde + TAMANO - 1}`,
        ...(contar ? { Prefer: 'count=exact' } : {}),
      },
      signal: corta.signal,
    });
    if (!r.ok) throw new Error(`picks_visibles respondió ${r.status}`);
    filas = (await r.json()) as FilaServidor[];
  } finally {
    clearTimeout(reloj);
  }
  const total = Number(/\/(\d+)$/.exec(r.headers.get('content-range') ?? '')?.[1]);
  return { filas, total: Number.isFinite(total) ? total : undefined };
}

/**
 * Lo que falta después de la primera tanda. Sabiendo el total se piden varias
 * a la vez; sin él (si la cabecera no llega), una detrás de otra como antes.
 */
async function resto(
  token: string,
  total: number | undefined,
  alLlegar: (cuantas: number) => void,
): Promise<FilaServidor[]> {
  if (total === undefined) {
    const filas: FilaServidor[] = [];
    for (let desde = TAMANO; ; desde += TAMANO) {
      const { filas: suyas } = await tanda(token, desde);
      filas.push(...suyas);
      alLlegar(suyas.length);
      if (suyas.length < TAMANO) break;
    }
    return filas;
  }
  const desdes: number[] = [];
  for (let desde = TAMANO; desde < total; desde += TAMANO) desdes.push(desde);
  const tandas: FilaServidor[][] = new Array(desdes.length);
  let siguiente = 0;
  const obrero = async () => {
    while (siguiente < desdes.length) {
      const i = siguiente++;
      tandas[i] = (await tanda(token, desdes[i])).filas;
      alLlegar(tandas[i].length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(A_LA_VEZ, desdes.length) }, obrero));
  return tandas.flat();
}

/**
 * Deja las filas listas para las pantallas.
 *
 * El candado se decide aquí y no en la pantalla. Antes cada tarjeta miraba los
 * derechos del usuario para saber si taparse. Ahora el servidor ya ha decidido
 * —y además solo ha mandado el contenido de lo que toca—, así que `pro` pasa a
 * significar exactamente "esto te llegó vacío".
 */
function aplica(filas: FilaServidor[]) {
  const picks = filas.map((f) => ({ ...f.datos, pro: !f.desbloqueado }) as Pick);

  const porPartido = new Map<string, Pick[]>();
  for (const p of picks) {
    const suyos = porPartido.get(p.partidoId);
    if (suyos) suyos.push(p);
    else porPartido.set(p.partidoId, [p]);
  }

  PICKS = picks;
  PORPARTIDO = porPartido;
  /*
   * El gratis, por su posición: las filas y los picks van en el mismo orden.
   * Antes se buscaba cada pick entre todas las filas, y con diez mil eso eran
   * cien millones de comparaciones con el navegador congelado.
   *
   * Nunca de una competición escondida: el gratis es lo primero que ve quien
   * llega, y un partido del Mundial ahí contradice todo lo demás.
   */
  const i = filas.findIndex((f, k) => f.gratis && !SOLO_RELLENO.has(picks[k].competicionId));
  GRATIS = i >= 0 ? picks[i] : null;
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
      marcaCarga({ fase: 'cuenta', recibidos: 0, total: undefined, desde: Date.now(), error: undefined });
      const sesion = await sesionGuardada();
      if (!sesion?.token) {
        marcaCarga({ fase: 'error', error: 'sin sesión' });
        return;
      }

      marcaCarga({ fase: 'pidiendo' });
      const primera = await tanda(sesion.token, 0, true);
      marcaCarga({ fase: 'preparando', recibidos: primera.filas.length, total: primera.total });
      await respira();
      aplica(primera.filas);

      if (primera.filas.length === TAMANO) {
        // Las pantallas se pintan ya con los de hoy; el resto, por detrás.
        parcial = true;
        intentado = true;
        marcaCarga({ fase: 'resto' });
        for (const repinta of avisos) repinta();
        let recibidos = primera.filas.length;
        const demas = await resto(sesion.token, primera.total, (n) => {
          recibidos += n;
          marcaCarga({ recibidos });
        });
        aplica([...primera.filas, ...demas]);
      }

      cargados = true;
      fallo = false;
      marcaCarga({ fase: 'listo' });
    } catch (e) {
      fallo = true;
      marcaCarga({ fase: 'error', error: e instanceof Error ? e.message : String(e) });
      /*
       * Sin red o con el servidor caído no se rompe nada: quien llame verá la
       * lista vacía y la pantalla dirá que no hay picks, igual que un día sin
       * partidos. Como `cargados` se queda en false, la siguiente llamada lo
       * vuelve a intentar.
       */
    } finally {
      // Si el resto falla, se queda lo que llegó: mejor eso que seguir esperando.
      parcial = false;
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
  // "Todas" son las que se enseñan: ni las de relleno ni el Mundial, que ya acabó.
  if (competicionId === 'todas') return PICKS.filter((p) => !SOLO_RELLENO.has(p.competicionId));
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
