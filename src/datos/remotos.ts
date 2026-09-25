import AsyncStorage from '@react-native-async-storage/async-storage';
import { guardaGrande, leeGrande } from './almacen';
import { sesionGuardada } from './cuenta';
import { aplicaDatos, avisaRepintado, fusionaDetalle, sinDetalle } from './importado';
import { aplicaLogos, sinLogosNuevos } from './imagenes';

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
/*
 * El archivo se baja en dos piezas: el núcleo (equipos y partidos de todas las
 * competiciones) y el detalle (jugadores y registros). Cada uno se guarda por
 * separado, para que el arranque cargue primero el núcleo —la mitad— y el
 * detalle entre después sin bloquear.
 */
const CLAVE_NUCLEO = 'scout-picks/nucleo-v1';
const CLAVE_DETALLE = 'scout-picks/detalle-v1';
const CLAVE_SELLO_NUCLEO = 'scout-picks/nucleo-sello';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
const BASE = `${URL}/storage/v1/object/public/datos`;
const RUTA = `${BASE}/importado.json`;
/** El archivo completo comprimido. Es el respaldo si el núcleo no está. */
const RUTA_GZ = `${RUTA}.gz`;
/** Núcleo y detalle, las dos piezas nuevas. */
const RUTA_NUCLEO = `${BASE}/nucleo.json.gz`;
const RUTA_DETALLE = `${BASE}/detalle.json.gz`;
/** Catálogo de escudos y caras. Son solo direcciones: pesa unos cientos de kB. */
const RUTA_LOGOS = `${BASE}/logos.json`;

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

/* -------------------------------------------------------------------------
 * Bajar los datos con la sesión del usuario.
 *
 * ── El problema ───────────────────────────────────────────────────────────
 *
 * Los picks se calculan en el teléfono a partir de este archivo, y el archivo
 * está en una carpeta pública: cualquiera puede bajárselo con la dirección, y
 * con el código —que ahora es público— sacar exactamente los mismos picks sin
 * pagar. El muro de pago tapa la pantalla, no el dato.
 *
 * ── Lo que se puede hacer ─────────────────────────────────────────────────
 *
 * Calcular los picks en un servidor sería lo suyo, pero es rehacer media app.
 * Esto es el paso realista: pedir el archivo **como el usuario que lo pide**,
 * con su sesión, para poder cerrar la carpeta y que deje de estar al alcance de
 * cualquiera con la dirección. La app ya exige cuenta para todo, así que no
 * cambia nada de cara al usuario.
 *
 * Mientras la carpeta siga siendo pública las dos rutas funcionan, así que esto
 * se puede desplegar y comprobar sin romper nada: se intenta con sesión y, si
 * falla, se cae a la pública de siempre. Solo cuando se confirme que la ruta
 * con sesión responde bien se cierra la carpeta, y ese día la pública dejará de
 * valer sin que haya que tocar la app.
 * ------------------------------------------------------------------------- */

/** La misma dirección, pero por la puerta que pide credencial. */
const conSesion = (rutaPublica: string) =>
  rutaPublica.replace('/storage/v1/object/public/', '/storage/v1/object/');

/**
 * Cabeceras con la sesión, si hay. Sin sesión devuelve `null` y quien llama se
 * queda con la ruta pública.
 */
async function credenciales(): Promise<Record<string, string> | null> {
  // La pública del proyecto, la que ya viaja dentro de la app.
  const publicable = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!publicable) return null;
  try {
    const s = await sesionGuardada();
    if (!s?.token) return null;
    return { Authorization: `Bearer ${s.token}`, apikey: publicable };
  } catch {
    return null;
  }
}

/**
 * Pide una ruta del almacén: primero con la sesión del usuario y, si no hay o
 * no cuela, por la pública. Devuelve la respuesta y por dónde entró.
 */
async function pideArchivo(
  rutaPublica: string,
  cabeceras: Record<string, string>,
): Promise<{ r: Response; privada: boolean } | null> {
  const cred = await credenciales();
  if (cred) {
    try {
      const r = await fetch(conSesion(rutaPublica), {
        cache: 'no-store',
        headers: { ...cabeceras, ...cred },
      });
      // 304 también vale: significa que la puerta con sesión funciona.
      if (r.ok || r.status === 304) return { r, privada: true };
    } catch {
      // Sin red por esa puerta: se prueba la de siempre.
    }
  }
  try {
    const r = await fetch(rutaPublica, { cache: 'no-store', headers: cabeceras });
    return { r, privada: false };
  } catch {
    return null;
  }
}

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
      const intento = await pideArchivo(RUTA_GZ, cabeceras);
      const r = intento?.r;
      if (r?.status === 304) return 'igual';
      if (r?.ok && r.body) {
        const flujo = r.body.pipeThrough(new DecompressionStream('gzip'));
        return { texto: await new Response(flujo).text(), sello: r.headers.get('etag') };
      }
    } catch {
      // Si el comprimido falla se sigue con el normal, sin ruido.
    }
  }

  const intento = await pideArchivo(RUTA, cabeceras);
  if (!intento) return null;
  const { r } = intento;
  if (r.status === 304) return 'igual';
  return r.ok ? { texto: await r.text(), sello: r.headers.get('etag') } : null;
}

/**
 * Baja un `.gz` cualquiera (núcleo o detalle) y lo descomprime.
 *
 * Devuelve `null` si no se puede —no existe, o el navegador no descomprime—,
 * para que quien llame recurra al archivo completo. Estos dos solo están
 * comprimidos, así que sin `DecompressionStream` no hay forma: se usa el
 * respaldo.
 */
async function bajaGz(ruta: string, selloPrevio: string | null): Promise<Bajada> {
  if (typeof DecompressionStream === 'undefined') return null;
  const cabeceras: Record<string, string> = selloPrevio ? { 'If-None-Match': selloPrevio } : {};
  try {
    const intento = await pideArchivo(ruta, cabeceras);
    if (!intento) return null;
    const { r } = intento;
    if (r.status === 304) return 'igual';
    if (r.ok && r.body) {
      const flujo = r.body.pipeThrough(new DecompressionStream('gzip'));
      return { texto: await new Response(flujo).text(), sello: r.headers.get('etag') };
    }
  } catch {
    // Cae a null: el que llama tira del completo.
  }
  return null;
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
    // Primero el núcleo, que es la mitad y hace que la app abra ya. El detalle
    // por jugador se pega después, sin bloquear.
    const nucleo = await leeGrande(CLAVE_NUCLEO);
    if (nucleo) {
      aplicaDatos(JSON.parse(nucleo));
      /*
       * El detalle guardado, ANTES de dar por cargado el arranque.
       *
       * Esto era fuego y olvido: la app abría con los picks de equipo y unos
       * segundos después, al entrar el detalle, se rehacía entera con los de
       * jugador. Se veía montarse por partes. Leer lo que ya está en el disco
       * cuesta poco y se hace mientras se ve la pantalla de carga; lo que no
       * esté guardado ya lo traerá la descarga.
       */
      try {
        const det = await leeGrande(CLAVE_DETALLE);
        if (det) fusionaDetalle(JSON.parse(det));
      } catch {
        // Sin detalle guardado: la app queda con los picks de equipo hasta
        // que la descarga traiga el detalle.
      }
      return true;
    }
    // Respaldo: el archivo completo que guardaba una versión anterior de la app.
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
  /*
   * En cada salida sin descarga se avisa de que el detalle no va a llegar por
   * aquí: o ya está puesto desde el disco, o esta vez no hay. La portada espera
   * a ese aviso para no pintarse a medias, así que olvidarlo la dejaría
   * cargando para siempre.
   */
  if (!URL) {
    sinDetalle();
    sinLogosNuevos();
    return false;
  }

  /*
   * El catálogo de escudos, siempre y cuanto antes: son unos cientos de kB y
   * es lo que decide si la portada sale con escudos o con círculos grises.
   * Antes solo se pedía cuando los datos habían cambiado, así que al abrir con
   * datos de hace un rato la app se dibujaba sin ellos.
   */
  void descargaLogos();

  try {
    if (!forzar) {
      const ultima = Number((await AsyncStorage.getItem(CLAVE_FECHA)) ?? 0);
      if (ultima && Date.now() - ultima < CADA) {
        sinDetalle();
        return false;
      }
    }

    const selloPrevio = await AsyncStorage.getItem(CLAVE_SELLO_NUCLEO);
    const bajada = await bajaGz(RUTA_NUCLEO, selloPrevio);

    // Sin núcleo —no está publicado todavía, o el navegador no descomprime— se
    // tira del archivo completo, como antes de partirlo en dos. Respaldo total.
    if (bajada === null) return descargaCompleto();

    if (bajada === 'igual') {
      await AsyncStorage.setItem(CLAVE_FECHA, String(Date.now()));
      sinDetalle();
      return false;
    }

    // Una respuesta cortada rompería el JSON: se comprueba antes de tocar nada.
    const datos = JSON.parse(bajada.texto);
    if (!datos?.competiciones || !Object.keys(datos.competiciones).length) {
      sinDetalle();
      return false;
    }

    aplicaDatos(datos);
    // Guardar es un extra: si el navegador no tiene sitio, no pasa nada. Se
    // intenta aparte para que un fallo al guardar no descarte los datos buenos.
    guardaSiCabe(CLAVE_NUCLEO, bajada.texto, CLAVE_SELLO_NUCLEO, bajada.sello);
    descargaLogos();

    /*
     * El detalle por jugador, en segundo plano. No bloquea el repintado del
     * núcleo: la app ya se ve con los picks de equipo, y los de jugador
     * aparecen cuando el detalle entra. `fusionaDetalle` avisa para repintar.
     */
    (async () => {
      try {
        const det = await bajaGz(RUTA_DETALLE, null);
        if (det && det !== 'igual') {
          fusionaDetalle(JSON.parse(det.texto));
          guardaSiCabe(CLAVE_DETALLE, det.texto, null, null);
        }
      } catch {
        // Sin detalle: la app se queda con los picks de equipo, que ya es útil.
      } finally {
        // Haya venido o no, ya se sabe a qué atenerse: la portada deja de
        // esperarlo. `sinDetalle` no hace nada si el detalle sí llegó.
        sinDetalle();
      }
    })();

    return true;
  } catch {
    sinDetalle();
    return false;
  }
}

/** Respaldo: baja el archivo completo de una vez, como antes de partirlo. */
async function descargaCompleto(): Promise<boolean> {
  /*
   * Este camino trae el archivo entero —jugadores incluidos— o no trae nada,
   * así que al terminar el detalle está resuelto en cualquier caso.
   */
  try {
    const selloPrevio = await AsyncStorage.getItem(CLAVE_SELLO);
    const bajada = await bajaArchivo(selloPrevio);
    if (!bajada) return false;
    if (bajada === 'igual') {
      await AsyncStorage.setItem(CLAVE_FECHA, String(Date.now()));
      return false;
    }
    const { texto, sello } = bajada;
    const datos = JSON.parse(texto);
    if (!datos?.competiciones || !Object.keys(datos.competiciones).length) return false;
    aplicaDatos(datos);
    guardaSiCabe(CLAVE, texto, CLAVE_SELLO, sello);
    descargaLogos();
    return true;
  } catch {
    return false;
  } finally {
    sinDetalle();
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
let logosPedidos = false;

async function descargaLogos(): Promise<void> {
  // Una vez por sesión: lo piden varios caminos y el archivo es el mismo.
  if (logosPedidos) return;
  logosPedidos = true;
  try {
    const intento = await pideArchivo(RUTA_LOGOS, {});
    const r = intento?.r;
    if (!r?.ok) return;
    aplicaLogos(await r.json());
    // Con los escudos ya puestos, a repintar: si alguna pantalla se dibujó
    // antes, sus círculos grises pasan a ser escudos.
    avisaRepintado();
  } catch {
    // Sin catálogo nuevo. Se sigue con el que trae la app dentro.
  } finally {
    sinLogosNuevos();
    avisaRepintado();
  }
}

/**
 * Deja copia para la próxima visita, si el navegador la admite.
 *
 * No se comprueba el tamaño por adelantado porque el límite lo pone cada
 * navegador y no hay forma fiable de preguntárselo: se intenta y se acepta el
 * no por respuesta.
 */
async function guardaSiCabe(
  claveDatos: string,
  texto: string,
  claveSello: string | null,
  sello: string | null,
): Promise<void> {
  try {
    // IndexedDB en el navegador: localStorage no admite tantos megas.
    if (!(await guardaGrande(claveDatos, texto))) return;
    await AsyncStorage.setItem(CLAVE_FECHA, String(Date.now()));
    /*
     * El sello se guarda junto al archivo, no antes: solo vale si de verdad
     * quedó guardado. Apuntarlo por adelantado sería peor que no tenerlo —la
     * app diría "ya lo tengo" de algo que no llegó a guardar y se quedaría con
     * los datos viejos sin volver a pedirlos.
     */
    if (claveSello) {
      if (sello) await AsyncStorage.setItem(claveSello, sello);
      else await AsyncStorage.removeItem(claveSello);
    }
  } catch {
    // Sin sitio. La app funciona igual, solo tarda más en arrancar la próxima
    // vez porque vuelve a descargar en lugar de leer lo guardado.
  }
}
