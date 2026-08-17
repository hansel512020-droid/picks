import AsyncStorage from '@react-native-async-storage/async-storage';
import { aplicaDatos } from './importado';

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

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
const RUTA = `${URL}/storage/v1/object/public/datos/importado.json`;
/** El mismo archivo comprimido: 3,8 MB en vez de 70. */
const RUTA_GZ = `${RUTA}.gz`;

/**
 * Baja el archivo, comprimido si se puede.
 *
 * El comprimido pesa un 94% menos —70 MB contra 3,8—, que en un móvil con
 * datos es la diferencia entre abrir la app y no abrirla. Pero Supabase lo
 * sirve como `application/x-gzip` **sin** la cabecera `Content-Encoding`, así
 * que el navegador no lo descomprime solo: hay que hacerlo aquí.
 *
 * `DecompressionStream` existe en los navegadores modernos, pero no en todas
 * partes. Donde no esté, se baja el archivo sin comprimir: pesa mucho más,
 * pero funciona, y es mejor que dejar la app sin datos por ahorrar megas.
 */
async function bajaArchivo(): Promise<string | null> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const r = await fetch(RUTA_GZ, { cache: 'no-store' });
      if (r.ok && r.body) {
        const flujo = r.body.pipeThrough(new DecompressionStream('gzip'));
        return await new Response(flujo).text();
      }
    } catch {
      // Si el comprimido falla se sigue con el normal, sin ruido.
    }
  }

  const r = await fetch(RUTA, { cache: 'no-store' });
  return r.ok ? await r.text() : null;
}

/** Cada cuánto se vuelve a preguntar, como mucho. */
const CADA = 6 * 60 * 60 * 1000;

/**
 * Carga lo guardado del intento anterior, si lo hay.
 *
 * Se hace antes de pedir nada: son doce megas y en una conexión mala tardan.
 * Mientras llegan, el usuario ya está viendo la app con los datos de ayer.
 */
export async function cargaGuardados(): Promise<boolean> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE);
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

    const texto = await bajaArchivo();
    if (!texto) return false;

    // Una respuesta cortada a medias rompería el JSON y dejaría la app sin
    // datos: se comprueba que se puede leer antes de tocar nada.
    const datos = JSON.parse(texto);
    if (!datos?.competiciones || !Object.keys(datos.competiciones).length) return false;

    aplicaDatos(datos);
    await AsyncStorage.setItem(CLAVE, texto);
    await AsyncStorage.setItem(CLAVE_FECHA, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}
