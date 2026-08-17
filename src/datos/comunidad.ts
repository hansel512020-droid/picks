import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Contador real de guardados. Cada vez que alguien guarda un pick se escribe
 * una fila en Supabase, y el numero naranja de la tarjeta es el recuento de
 * esas filas: la llama deja de ser un adorno y pasa a decir cuanta gente
 * eligio ese pick de verdad.
 *
 * Si no hay servidor configurado la app sigue funcionando igual: se queda con
 * el numero que calcula el generador y no intenta ninguna llamada.
 *
 * Configuracion, en un archivo `.env` en la raiz del proyecto:
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
 *
 * El SQL de las tablas esta en `supabase/esquema.sql`.
 */

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
const CLAVE = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** true cuando hay servidor detras y los contadores son reales. */
export const COMUNIDAD_ACTIVA = !!(URL && CLAVE);

const CLAVE_DISPOSITIVO = 'scout-picks/dispositivo';

let dispositivoEnMemoria: string | null = null;

/**
 * Identificador anonimo del movil. No lleva ningun dato personal: solo sirve
 * para que un mismo telefono cuente una vez y pueda deshacer su guardado.
 */
export async function idDispositivo(): Promise<string> {
  if (dispositivoEnMemoria) return dispositivoEnMemoria;
  let guardado = await AsyncStorage.getItem(CLAVE_DISPOSITIVO);
  if (!guardado) {
    guardado = `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(CLAVE_DISPOSITIVO, guardado);
  }
  dispositivoEnMemoria = guardado;
  return guardado;
}

function cabeceras(extra: Record<string, string> = {}) {
  return {
    apikey: CLAVE!,
    Authorization: `Bearer ${CLAVE}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** Nunca revienta la pantalla: si el servidor falla, se sigue sin contadores. */
async function pide<T>(ruta: string, opciones: RequestInit, porDefecto: T): Promise<T> {
  if (!COMUNIDAD_ACTIVA) return porDefecto;
  try {
    const r = await fetch(`${URL}/rest/v1/${ruta}`, opciones);
    if (!r.ok) return porDefecto;
    const texto = await r.text();
    return texto ? (JSON.parse(texto) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

/**
 * Cuantas veces se ha guardado cada pick. Se piden en bloques porque la lista
 * de la portada puede traer 80 ids y no cabe en una URL.
 */
export async function contadores(pickIds: string[]): Promise<Record<string, number>> {
  if (!COMUNIDAD_ACTIVA || !pickIds.length) return {};
  const salida: Record<string, number> = {};
  const bloque = 40;

  for (let i = 0; i < pickIds.length; i += bloque) {
    const trozo = pickIds.slice(i, i + bloque);
    const lista = trozo.map((id) => `"${id.replace(/"/g, '')}"`).join(',');
    const filas = await pide<{ pick_id: string; total: number }[]>(
      `conteo_guardados?select=pick_id,total&pick_id=in.(${encodeURIComponent(lista)})`,
      { headers: cabeceras() },
      [],
    );
    for (const f of filas) salida[f.pick_id] = Number(f.total) || 0;
  }
  return salida;
}

/** Los picks mas guardados de una competicion, con su recuento. */
export async function masGuardados(
  competicionId: string,
  limite = 40,
): Promise<{ pickId: string; total: number }[]> {
  const filas = await pide<{ pick_id: string; total: number }[]>(
    `conteo_guardados?select=pick_id,total&competicion=eq.${encodeURIComponent(competicionId)}` +
      `&order=total.desc&limit=${limite}`,
    { headers: cabeceras() },
    [],
  );
  return filas.map((f) => ({ pickId: f.pick_id, total: Number(f.total) || 0 }));
}

/**
 * Suma un guardado. Repetir no cuenta dos veces: la clave es pick + móvil.
 *
 * ── Por qué no se usa `resolution=ignore-duplicates` ──────────────────────
 * Parecía lo natural —"si ya está, no hagas nada"— y era justo lo que impedía
 * que esto funcionara **nunca**. Ese `Prefer` hace que PostgREST ejecute un
 * `ON CONFLICT DO NOTHING`, y para saber si hay conflicto Postgres tiene que
 * leer la fila que ya existe. Pero la política de lectura de `guardados` es
 * `using (false)` a propósito, para que nadie pueda sacar los identificadores
 * de los demás móviles. Resultado: cada guardado se rechazaba con un
 * "new row violates row-level security policy", la app se lo tragaba en
 * silencio y la tabla llevaba vacía desde el primer día. Por eso no aparecía
 * ni un solo contador en ninguna tarjeta.
 *
 * Ahora se inserta sin más y el duplicado se resuelve donde toca: un 409 es la
 * clave primaria diciendo que este móvil ya lo tenía guardado, que es
 * exactamente el resultado que se buscaba. Se cuenta como éxito.
 */
export async function anotaGuardado(
  pickId: string,
  competicionId: string,
  usuarioId?: string,
): Promise<boolean> {
  if (!COMUNIDAD_ACTIVA) return false;
  const dispositivo = await idDispositivo();
  try {
    const r = await fetch(`${URL}/rest/v1/guardados`, {
      method: 'POST',
      headers: cabeceras({ Prefer: 'return=minimal' }),
      /*
       * Con sesión se cuenta por cuenta; sin ella, por móvil.
       *
       * Contando solo por dispositivo, la misma persona inflaba el número
       * abriendo la app en dos navegadores: pasó en las pruebas y el contador
       * marcó 2 con un solo usuario. Quien ha entrado con su cuenta cuenta una
       * vez, use el aparato que use.
       */
      body: JSON.stringify([
        { pick_id: pickId, competicion: competicionId, dispositivo, usuario_id: usuarioId ?? null },
      ]),
    });
    // 409 = ya estaba guardado por este móvil. No es un fallo.
    return r.ok || r.status === 409;
  } catch {
    return false;
  }
}

/** Deshace el guardado de este movil. */
export async function borraGuardado(pickId: string, usuarioId?: string): Promise<boolean> {
  if (!COMUNIDAD_ACTIVA) return false;
  /*
   * Se borra por el mismo criterio con el que se guardó: por cuenta si la
   * había, y por móvil si no. Filtrando siempre por dispositivo, quien guardó
   * con su cuenta desde otro aparato no podía deshacerlo.
   */
  const filtro = usuarioId
    ? `usuario_id=eq.${encodeURIComponent(usuarioId)}`
    : `dispositivo=eq.${encodeURIComponent(await idDispositivo())}`;

  const r = await pide<unknown>(
    `guardados?pick_id=eq.${encodeURIComponent(pickId)}&${filtro}`,
    { method: 'DELETE', headers: cabeceras({ Prefer: 'return=minimal' }) },
    null,
  );
  return r !== null;
}
