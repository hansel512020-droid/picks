import AsyncStorage from '@react-native-async-storage/async-storage';
import { guardaGrande, leeGrande } from './almacen';
import { aplicaDatos } from './importado';
import { aplicaLogos } from './imagenes';

/**
 * Datos que se descargan del servidor en vez de viajar dentro de la app.
 *
 * ── Por qué ──────────────────────────────────────────────────────────────
 * El archivo de resultados pesa doce megas y cambia todos los días. Metido en
 * el paquete obliga a recompilar y republicar la web cada vez que hay una
 * jornada nueva, y encima cada visitante se lo descarga entero antes de ver
 * nada. Sacándolo fuera, la app se publica una vez y los datos se actualizan
 * solos.
 *
 * ── Cómo se comporta ─────────────────────────────────────────────────────
 * Al arrancar se usa lo que haya en el teléfono —lo guardado la última vez, o
 * el archivo que viene con la app— y **después** se pregunta al servidor. Así
 * la app abre al momento y nunca se queda en blanco esperando una descarga.
 *
 * Si el servidor no responde no pasa nada: se sigue con lo que había. Unos
 * resultados de ayer son infinitamente mejores que una pantalla vacía.
 */

const CLAVE = 'scout-picks/datos-v1';
const CLAVE_FECHA = 'scout-picks/datos-fecha';
/** El sello del archivo que se tiene guardado, para preguntar si cambió. */
const CLAVE_SELLO = 'scout-picks/datos-sello';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
const RUTA = `${URL}/storage/v1/object/public/datos/importado.json`;
/** El mismo archivo comprimido: 3,8 MB en vez de 70. */
const RUTA_GZ = `${RUTA}.gz`;
/** Catálogo de escudos y caras. Son solo direcciones: pesa unos cientos de kB. */
const RUTA_LOGOS = `${URL}/storage/v1/object/public/datos/logos.json`;

/**
 * Baja el archivo, comprimido si se puede.
 *
 * El comprimido pesa un 94% menos —70 MB contra 3,8—, que en un móvil con
 * datos es la diferencia entre abrir la app y no abrirla. Pero Supabase lo
 * sirve como `application/x-gzip` **sin** la cabecera `Content-Encoding`, así
 * que el navegador no lo descomprime solo: hay que hacerlo aquí.
 *
 * `DecompressionStream` existe en los navegadores modernos, pero no en todas
 * partes. Donde no esté se intenta el archivo sin comprimir, que **puede no
 * existir**: pesa 74 MB y el servidor no admite tanto, así que solo estará ahí
 * si alguien lo subió a mano alguna vez. Si no está, esto devuelve null y la
 * app se queda con lo guardado o con los datos que trae dentro. Eso es
 * deliberado: quedarse con resultados de ayer es mejor que una pantalla vacía,
 * y desde luego mejor que tragarse 74 MB en el móvil.
 */
/**
 * Lo que devuelve una bajada: el archivo con su sello, `'igual'` cuando el
 * servidor confirma que no ha cambiado, o `null` si no se pudo.
 */
type Bajada = { texto: string; sello: string | null } | 'igual' | null;

async function bajaArchivo(selloPrevio: string | null): Promise<Bajada> {
  /*
   * Se pregunta con el sello de lo que ya se tiene.
   *
   * Si el archivo no ha cambiado, el servidor responde 304 y **no manda nada**:
   * la comprobación sale gratis. Por eso se puede preguntar a menudo en vez de
   * esperar horas, que era lo que hacía que una liga recién publicada tardara
   * media jornada en aparecer.
   */
  const cabeceras: Record<string, string> = selloPrevio
    ? { 'If-None-Match': selloPrevio }
    : {};

  if (typeof DecompressionStream !== 'undefined') {
    try {
      const r = await fetch(RUTA_GZ, { cache: 'no-store', headers: cabeceras });
      if (r.status === 304) return 'igual';
      if (r.ok && r.body) {
        const flujo = r.body.pipeThrough(new DecompressionStream('gzip'));
        return { texto: await new Response(flujo).text(), sello: r.headers.get('etag') };
      }
    } catch {
      // Si el comprimido falla se sigue con el normal, sin ruido.
    }
  }

  const r = await fetch(RUTA, { cache: 'no-store', headers: cabeceras });
  if (r.status === 304) return 'igual';
  return r.ok ? { texto: await r.text(), sello: r.headers.get('etag') } : null;
}

/**
 * Cada cuánto se vuelve a preguntar, como mucho.
 *
 * Eran seis horas, y con eso una competición o unos resultados recién
 * publicados podían tardar media jornada en llegar al móvil: la app ni
 * preguntaba. Ahora la pregunta lleva el sello de lo que ya se tiene y el
 * servidor contesta 304 sin mandar nada cuando no ha cambiado, así que
 * preguntar a menudo no cuesta ni datos ni batería.
 */
const CADA = 15 * 60 * 1000;

/**
 * Carga lo guardado del intento anterior, si lo hay.
 *
 * Se hace antes de pedir nada: son doce megas y en una conexión mala tardan.
 * Mientras llegan, el usuario ya está viendo la app con los datos de ayer.
 */
export async function cargaGuardados(): Promise<boolean> {
  try {
    const crudo = await leeGrande(CLAVE);
    if (!crudo) return false;
    aplicaDatos(JSON.parse(crudo));
    return true;
  } catch {
    // Un guardado corrupto no puede impedir abrir la app: se ignora y se usa
    // el archivo que viene dentro, que siempre está.
    return false;
  }
}

/**
 * Pregunta al servidor si hay datos nuevos y los aplica.
 *
 * Devuelve `true` solo si ha cambiado algo, para que quien llame sepa si tiene
 * que repintar. `forzar` salta la espera entre consultas: es para el gesto de
 * tirar hacia abajo, donde el usuario ha pedido explícitamente mirar ahora.
 */
export async function descargaDatos(forzar = false): Promise<boolean> {
  if (!URL) return false;

  try {
    if (!forzar) {
      const ultima = Number((await AsyncStorage.getItem(CLAVE_FECHA)) ?? 0);
      if (ultima && Date.now() - ultima < CADA) return false;
    }

    const selloPrevio = await AsyncStorage.getItem(CLAVE_SELLO);
    const bajada = await bajaArchivo(selloPrevio);
    if (!bajada) return false;
    if (bajada === 'igual') {
      // Sin novedad: se apunta la hora para no volver a preguntar enseguida.
      await AsyncStorage.setItem(CLAVE_FECHA, String(Date.now()));
      return false;
    }
    const { texto, sello } = bajada;

    // Una respuesta cortada a medias rompería el JSON y dejaría la app sin
    // datos: se comprueba que se puede leer antes de tocar nada.
    const datos = JSON.parse(texto);
    if (!datos?.competiciones || !Object.keys(datos.competiciones).length) return false;

    aplicaDatos(datos);

    /*
     * Guardar es un extra, no parte del trabajo.
     *
     * Antes iba en el mismo `try` y arruinaba todo: el archivo son 76 MB, el
     * navegador no guarda más de 10, y al reventar caía en el `catch` que
     * devolvía `false`. Los datos buenos ya estaban aplicados, pero quien
     * llamaba entendía "no hay nada nuevo" y no repintaba. Resultado: la web
     * descargaba los resultados de verdad y seguía enseñando los de relleno,
     * cada vez, para todo el mundo.
     *
     * Ahora se intenta aparte y si falla no pasa nada: se pierde el arranque
     * rápido de la próxima visita, no los datos de esta.
     */
    guardaSiCabe(texto, sello);
    // Las caras van aparte y son pequeñas. Que fallen no debe tocar los datos.
    descargaLogos();
    return true;
  } catch {
    return false;
  }
}

/**
 * Trae el catálogo de escudos y caras que dejó el robot.
 *
 * Va suelto y no dentro del archivo de datos porque son cosas distintas: los
 * resultados cambian cada cuatro horas y las imágenes casi nunca, y juntarlos
 * obligaría a rebajar 4 MB para actualizar un puñado de fotos.
 *
 * Si falla no se avisa a nadie: sin catálogo la app enseña las iniciales del
 * jugador en un círculo, que es exactamente lo que hacía antes.
 */
async function descargaLogos(): Promise<void> {
  try {
    const r = await fetch(RUTA_LOGOS, { cache: 'no-store' });
    if (!r.ok) return;
    aplicaLogos(await r.json());
  } catch {
    // Sin catálogo nuevo. Se sigue con el que trae la app dentro.
  }
}

/**
 * Deja copia para la próxima visita, si el navegador la admite.
 *
 * No se comprueba el tamaño por adelantado porque el límite lo pone cada
 * navegador y no hay forma fiable de preguntárselo: se intenta y se acepta el
 * no por respuesta.
 */
async function guardaSiCabe(texto: string, sello: string | null): Promise<void> {
  try {
    // IndexedDB en el navegador: localStorage no admite 76 MB.
    if (!(await guardaGrande(CLAVE, texto))) return;
    await AsyncStorage.setItem(CLAVE_FECHA, String(Date.now()));
    /*
     * El sello se guarda junto al archivo, no antes: solo vale si de verdad
     * quedó guardado. Apuntarlo por adelantado sería peor que no tenerlo —la
     * app diría "ya lo tengo" de algo que no llegó a guardar y se quedaría con
     * los datos viejos sin volver a pedirlos.
     */
    if (sello) await AsyncStorage.setItem(CLAVE_SELLO, sello);
    else await AsyncStorage.removeItem(CLAVE_SELLO);
  } catch {
    // Sin sitio. La app funciona igual, solo tarda más en arrancar la próxima
    // vez porque vuelve a descargar en lugar de leer lo guardado.
  }
}
