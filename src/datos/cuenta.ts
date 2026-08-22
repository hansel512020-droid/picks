import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cuentas de usuario con Supabase Auth, hablando con su API por `fetch`, igual
 * que el resto de la app: sin la librería oficial, que arrastra dependencias
 * que aquí no hacen falta.
 *
 * Tres formas de entrar:
 *   · Google        — en iOS, Android y web.
 *   · Apple         — solo en iPhone, que es donde Apple lo exige.
 *   · Correo        — enlace mágico, sin contraseña que recordar ni que
 *                     guardar. Es también la salida para quien no quiera usar
 *                     ninguna de las dos anteriores.
 *
 * Configuración, en el `.env` de la raíz:
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
 *
 * Los proveedores (Google y Apple) se activan en el panel de Supabase, en
 * Authentication → Providers. Ahí es donde van los identificadores de cliente
 * que dan Google Cloud y Apple Developer.
 */

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
const CLAVE = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** true cuando hay servidor de cuentas configurado. */
export const CUENTAS_ACTIVAS = !!(URL && CLAVE);

const CLAVE_SESION = 'scout-picks/sesion';

export interface Sesion {
  /** Identificador del usuario en Supabase. */
  id: string;
  correo?: string;
  nombre?: string;
  avatar?: string;
  /** Token de acceso, para las llamadas que necesiten identificarse. */
  token: string;
  /** Token de refresco, para renovar sin volver a pedir credenciales. */
  refresco?: string;
  /** Cuándo caduca el token, en milisegundos desde epoch. */
  caduca: number;
}

function cabeceras(token?: string): Record<string, string> {
  return {
    apikey: CLAVE ?? '',
    Authorization: `Bearer ${token ?? CLAVE ?? ''}`,
    'Content-Type': 'application/json',
  };
}

/** Traduce la respuesta de Supabase a la sesión que guarda la app. */
function aSesion(datos: Record<string, any>): Sesion | null {
  const usuario = datos?.user;
  if (!usuario?.id || !datos?.access_token) return null;
  const meta = usuario.user_metadata ?? {};
  return {
    id: usuario.id,
    correo: usuario.email,
    nombre: meta.full_name ?? meta.name,
    avatar: meta.avatar_url ?? meta.picture,
    token: datos.access_token,
    refresco: datos.refresh_token,
    caduca: Date.now() + (Number(datos.expires_in) || 3600) * 1000,
  };
}

// ------------------------------------------------------------ persistencia

export async function sesionGuardada(): Promise<Sesion | null> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_SESION);
    if (!crudo) return null;
    const s = JSON.parse(crudo) as Sesion;
    // Caducada pero con refresco: se renueva sola y el usuario no se entera.
    if (s.caduca <= Date.now() + 60_000 && s.refresco) {
      const nueva = await renueva(s.refresco);
      if (nueva) return nueva;
      return null;
    }
    return s.caduca > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export async function guardaSesion(s: Sesion | null): Promise<void> {
  if (s) await AsyncStorage.setItem(CLAVE_SESION, JSON.stringify(s));
  else await AsyncStorage.removeItem(CLAVE_SESION);
}

/**
 * Cambia el token caducado por uno nuevo con el de refresco.
 *
 * El de acceso dura una hora. Sin esto, pasada esa hora la app seguía creyendo
 * que había sesión —el usuario veía su nombre y todo— pero cada consulta a
 * Supabase respondía 401: los picks guardados no subían y los derechos de Pro
 * no se leían, así que los candados seguían cerrados después de haber pagado.
 * Y no había ni un mensaje, porque un 401 se trataba como "no hay nada".
 */
export async function renueva(refresco: string): Promise<Sesion | null> {
  if (!CUENTAS_ACTIVAS) return null;
  try {
    const r = await fetch(`${URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: cabeceras(),
      body: JSON.stringify({ refresh_token: refresco }),
    });
    if (!r.ok) return null;
    const s = aSesion(await r.json());
    if (s) await guardaSesion(s);
    return s;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ correo

/**
 * Manda un enlace de acceso al correo. No hay contraseña: Supabase envía un
 * enlace de un solo uso, y al abrirlo el usuario entra.
 */
export async function enviaEnlace(correo: string, destino: string): Promise<boolean> {
  if (!CUENTAS_ACTIVAS) return false;
  try {
    const r = await fetch(`${URL}/auth/v1/otp`, {
      method: 'POST',
      headers: cabeceras(),
      body: JSON.stringify({ email: correo, create_user: true, options: { email_redirect_to: destino } }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- OAuth

export type Proveedor = 'google' | 'apple';

/** Dirección a la que hay que mandar al usuario para entrar con Google o Apple. */
export function urlDeProveedor(proveedor: Proveedor, destino: string): string | null {
  if (!CUENTAS_ACTIVAS) return null;
  return `${URL}/auth/v1/authorize?provider=${proveedor}&redirect_to=${encodeURIComponent(destino)}`;
}

/**
 * Cierra el círculo: el proveedor devuelve al usuario a la app con los tokens
 * en la dirección, y de ahí sale la sesión.
 */
export async function sesionDesdeTokens(
  acceso: string,
  refresco?: string,
): Promise<Sesion | null> {
  if (!CUENTAS_ACTIVAS) return null;
  try {
    const r = await fetch(`${URL}/auth/v1/user`, { headers: cabeceras(acceso) });
    if (!r.ok) return null;
    const usuario = await r.json();
    const s = aSesion({ user: usuario, access_token: acceso, refresh_token: refresco, expires_in: 3600 });
    if (s) await guardaSesion(s);
    return s;
  } catch {
    return null;
  }
}

/**
 * Si el servidor todavía acepta este token.
 *
 * La fecha de caducidad guardada no basta: un token se puede quedar muerto
 * antes de tiempo —sesión cerrada desde otro sitio, refresco ya consumido— y
 * entonces `caduca` dice que queda media hora mientras Supabase responde 401 a
 * todo. Fiarse del reloj dejaba al usuario dentro de una app que no podía
 * leer ni escribir nada, sin un solo aviso.
 *
 * Ante un fallo de red devuelve `true` a propósito: no poder preguntar no es
 * lo mismo que un no, y echar a alguien por un corte de un segundo sería peor
 * que el problema que esto resuelve.
 */
export async function tokenSigueValido(token: string): Promise<boolean> {
  if (!CUENTAS_ACTIVAS) return true;
  try {
    const r = await fetch(`${URL}/auth/v1/user`, { headers: cabeceras(token) });
    if (r.status === 401 || r.status === 403) return false;
    return true;
  } catch {
    return true;
  }
}

/** Cierra la sesión en el servidor y borra la del teléfono. */
export async function cierraSesion(token?: string): Promise<void> {
  if (CUENTAS_ACTIVAS && token) {
    try {
      await fetch(`${URL}/auth/v1/logout`, { method: 'POST', headers: cabeceras(token) });
    } catch {
      // Aunque falle, en el teléfono se cierra igual.
    }
  }
  await guardaSesion(null);
}

// -------------------------------------------------- picks guardados del usuario

/**
 * Los picks del usuario viven en su cuenta, no solo en el teléfono.
 *
 * Se guarda el pick entero —incluido su desenlace: pendiente, ganado, perdido
 * o nulo— porque el historial es justo lo que da valor a la cuenta: cambiar de
 * móvil y encontrarse el porcentaje de acierto intacto.
 *
 * La tabla y sus permisos están en `supabase/esquema.sql`: cada fila lleva el
 * identificador del dueño y las reglas impiden leer o tocar las de otro.
 */

/** Sube (o actualiza) un pick guardado en la cuenta. */
export async function subePick(
  token: string,
  usuarioId: string,
  pick: Record<string, unknown>,
): Promise<boolean> {
  if (!CUENTAS_ACTIVAS) return false;
  try {
    const r = await fetch(`${URL}/rest/v1/picks_usuario?on_conflict=usuario_id,pick_id`, {
      method: 'POST',
      headers: {
        ...cabeceras(token),
        // Si ya existe, se actualiza: al resolverse un pick cambia su estado.
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({ ...pick, usuario_id: usuarioId }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Borra un pick de la cuenta. */
export async function borraPick(token: string, usuarioId: string, pickId: string): Promise<boolean> {
  if (!CUENTAS_ACTIVAS) return false;
  try {
    const r = await fetch(
      `${URL}/rest/v1/picks_usuario?usuario_id=eq.${usuarioId}&pick_id=eq.${encodeURIComponent(pickId)}`,
      { method: 'DELETE', headers: cabeceras(token) },
    );
    return r.ok;
  } catch {
    return false;
  }
}

/** Todo lo que el usuario tiene guardado, para restaurarlo al entrar. */
export async function picksDeLaCuenta(
  token: string,
  usuarioId: string,
): Promise<Record<string, unknown>[]> {
  if (!CUENTAS_ACTIVAS) return [];
  try {
    const r = await fetch(
      `${URL}/rest/v1/picks_usuario?usuario_id=eq.${usuarioId}&select=*&order=guardado_en.desc`,
      { headers: cabeceras(token) },
    );
    if (!r.ok) return [];
    return (await r.json()) as Record<string, unknown>[];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ derechos

export interface Derecho {
  competicion: string;
  periodo: string;
  caduca?: string | null;
  /** PayPal no pudo cobrar la última renovación. */
  cobro_fallido?: boolean;
  /** Cuántas competiciones puede elegir: solo en los planes parciales. */
  huecos?: number;
}

/**
 * Lo que el usuario tiene comprado y sigue vigente.
 *
 * Se consulta al servidor y no se guarda como verdad en el teléfono a
 * propósito: un plan guardado en el móvil se puede tocar, y entonces el muro
 * de pago no es un muro. Aquí el teléfono solo pregunta.
 *
 * La app no puede escribir en esta tabla —las políticas solo permiten leer—:
 * las altas las hace el webhook de la pasarela con la clave de servicio, que
 * nunca sale del servidor.
 *
 * Devuelve `null` cuando no se ha podido preguntar, que **no** es lo mismo que
 * una lista vacía. Antes las dos cosas salían igual —`[]`— y el proveedor se
 * lo creía: bastaba un 401 de un segundo, con el token a medio renovar, para
 * que los candados se cerraran de golpe delante de alguien que acababa de
 * pagar, y sin un solo mensaje que lo explicara. Quien llama decide qué hacer
 * con el "no se sabe"; aquí no se inventa una respuesta.
 */
export async function derechosDelUsuario(
  token: string,
  usuarioId: string,
): Promise<Derecho[] | null> {
  if (!CUENTAS_ACTIVAS) return [];
  try {
    const r = await fetch(
      `${URL}/rest/v1/derechos?usuario_id=eq.${usuarioId}&select=competicion,periodo,caduca,cobro_fallido,huecos`,
      { headers: cabeceras(token) },
    );
    if (!r.ok) return null;
    const filas = (await r.json()) as Derecho[];
    const ahora = Date.now();
    // Un derecho caducado no desbloquea nada, aunque siga en la tabla.
    return filas.filter((d) => !d.caduca || new Date(d.caduca).getTime() > ahora);
  } catch {
    return null;
  }
}

/**
 * Da de baja la suscripción en PayPal.
 *
 * La app solo manda su sesión: cuál es la suscripción lo averigua el servidor.
 * Si el identificador viajara desde aquí, cambiarlo por otro daría de baja la
 * de un desconocido.
 *
 * No retira el acceso: lo pagado vale hasta que se acabe el periodo, y de eso
 * ya se encarga la columna `caduca`.
 */
export async function cancelaSuscripcion(
  token: string,
): Promise<{ ok: boolean; aviso?: string; error?: string }> {
  if (!URL) return { ok: false, error: 'No hay servidor configurado' };
  try {
    const r = await fetch(`${URL}/functions/v1/paypal-cancela`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const cuerpo = await r.json().catch(() => ({}));
    // El servidor puede dar por buena la petición y aun así tener algo que
    // contar: por ejemplo, que no había ningún cobro activo que parar.
    if (r.ok) return { ok: true, aviso: cuerpo?.aviso };
    return { ok: false, error: cuerpo?.error ?? `No se pudo cancelar (${r.status})` };
  } catch {
    return { ok: false, error: 'No se pudo conectar. Inténtalo de nuevo.' };
  }
}

/** Las competiciones que puede ver, ya resueltas. `*` significa todas. */
export function ligasDesbloqueadas(derechos: Derecho[]): Set<string> {
  const libres = new Set<string>();
  for (const d of derechos) {
    if (d.competicion === 'todas') return new Set(['*']);
    /*
     * `elegidas` no es una competición: es la fila que representa el plan
     * parcial y guarda cuántos huecos se han pagado. Las ligas de verdad son
     * las filas que escribe `paypal-elige` cuando el usuario las escoge. Sin
     * esta línea se colaría una liga fantasma llamada "elegidas".
     */
    if (d.competicion === 'elegidas') continue;
    libres.add(d.competicion);
  }
  return libres;
}

// -------------------------------------------------- correo y contraseña

/**
 * Alta con correo y contraseña.
 *
 * Supabase guarda la contraseña cifrada en su servidor; la app nunca la
 * almacena ni la vuelve a ver después de enviarla. Si el proyecto exige
 * confirmar el correo, la sesión llega vacía y hay que abrir el enlace antes
 * de poder entrar: eso lo distingue `necesitaConfirmar`.
 */
export async function registra(
  correo: string,
  clave: string,
): Promise<{ sesion: Sesion | null; necesitaConfirmar: boolean; error?: string }> {
  if (!CUENTAS_ACTIVAS) return { sesion: null, necesitaConfirmar: false, error: 'Sin servidor' };
  try {
    const r = await fetch(`${URL}/auth/v1/signup`, {
      method: 'POST',
      headers: cabeceras(),
      body: JSON.stringify({ email: correo, password: clave }),
    });
    const datos = await r.json();
    if (!r.ok) {
      return { sesion: null, necesitaConfirmar: false, error: datos?.msg ?? datos?.error_description };
    }
    const s = aSesion(datos);
    if (s) await guardaSesion(s);
    // Sin token pero con usuario: falta confirmar el correo.
    return { sesion: s, necesitaConfirmar: !s && !!datos?.id };
  } catch {
    return { sesion: null, necesitaConfirmar: false, error: 'No se pudo conectar' };
  }
}

/** Entrar con una cuenta que ya existe. */
export async function entraConClave(
  correo: string,
  clave: string,
): Promise<{ sesion: Sesion | null; error?: string }> {
  if (!CUENTAS_ACTIVAS) return { sesion: null, error: 'Sin servidor' };
  try {
    const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: cabeceras(),
      body: JSON.stringify({ email: correo, password: clave }),
    });
    const datos = await r.json();
    if (!r.ok) {
      // El mensaje de Supabase viene en inglés y es el mismo para correo
      // desconocido y contraseña mala, a propósito: no conviene decirle a
      // nadie si un correo está registrado o no.
      return { sesion: null, error: 'Correo o contraseña incorrectos' };
    }
    const s = aSesion(datos);
    if (s) await guardaSesion(s);
    return { sesion: s };
  } catch {
    return { sesion: null, error: 'No se pudo conectar' };
  }
}

/** Manda el correo para restablecer la contraseña. */
export async function olvideLaClave(correo: string, destino: string): Promise<boolean> {
  if (!CUENTAS_ACTIVAS) return false;
  try {
    const r = await fetch(`${URL}/auth/v1/recover`, {
      method: 'POST',
      headers: cabeceras(),
      body: JSON.stringify({ email: correo, options: { redirect_to: destino } }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Confirma el alta con el código de seis dígitos que llega por correo.
 *
 * Se prefiere el código al enlace porque el enlace saca al usuario de la
 * página, obliga a que el correo se abra en el mismo dispositivo y se rompe
 * con cualquier cliente que reescriba las direcciones. El código se teclea y
 * ya está.
 *
 * Para que Supabase mande un código en vez de un enlace hay que editar la
 * plantilla del correo (Authentication → Emails) y poner `{{ .Token }}` donde
 * viene `{{ .ConfirmationURL }}`.
 */
export async function confirmaCodigo(
  correo: string,
  codigo: string,
): Promise<{ sesion: Sesion | null; error?: string }> {
  if (!CUENTAS_ACTIVAS) return { sesion: null, error: 'Sin servidor' };
  try {
    const r = await fetch(`${URL}/auth/v1/verify`, {
      method: 'POST',
      headers: cabeceras(),
      body: JSON.stringify({ email: correo, token: codigo.trim(), type: 'signup' }),
    });
    const datos = await r.json();
    if (!r.ok) return { sesion: null, error: 'Código incorrecto o caducado' };
    const s = aSesion(datos);
    if (s) await guardaSesion(s);
    return { sesion: s };
  } catch {
    return { sesion: null, error: 'No se pudo conectar' };
  }
}

/** Vuelve a mandar el código, por si el primero no llegó. */
export async function reenviaCodigo(correo: string): Promise<boolean> {
  if (!CUENTAS_ACTIVAS) return false;
  try {
    const r = await fetch(`${URL}/auth/v1/resend`, {
      method: 'POST',
      headers: cabeceras(),
      body: JSON.stringify({ email: correo, type: 'signup' }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Guarda qué competiciones elige quien tiene un plan parcial.
 *
 * La app solo manda la lista y su sesión: cuántas puede elegir lo decide el
 * servidor, mirando los huecos que consta que ha pagado. Pedir de más se
 * rechaza allí, no aquí.
 */
export async function eligeCompeticiones(
  token: string,
  competiciones: string[],
): Promise<{ ok: boolean; error?: string }> {
  if (!URL) return { ok: false, error: 'No hay servidor configurado' };
  try {
    const r = await fetch(`${URL}/functions/v1/paypal-elige`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ competiciones }),
    });
    const cuerpo = await r.json().catch(() => ({}));
    if (r.ok) return { ok: true };
    return { ok: false, error: cuerpo?.error ?? `No se pudo guardar (${r.status})` };
  } catch {
    return { ok: false, error: 'No se pudo conectar. Inténtalo de nuevo.' };
  }
}

/** La misma clave que usa el botón de Payphone para el pago a medias. */
const PENDIENTE_PAYPHONE = 'golden-picks/pago-payphone';

/**
 * Rescata pagos de Payphone que quedaron sin confirmar.
 *
 * Es la red de seguridad: si al volver de Payphone la app no llegó a confirmar
 * —se cerró la pestaña, la sesión no se restauró—, el pago queda cobrado y sin
 * conceder. Esto le pide al servidor que revise las compras pendientes y las
 * confirme preguntándole a Payphone por la referencia, sin necesitar el `id` de
 * la vuelta (que es justo lo que se pierde).
 *
 * Solo se molesta si este navegador dejó un pago señalado, para no llamar por
 * cada usuario en cada refresco. Devuelve cuántos accesos se concedieron.
 */
export async function rescataPagosPayphone(token: string): Promise<number> {
  if (typeof window === 'undefined' || !URL || !token) return 0;

  let hayPendiente = false;
  try {
    hayPendiente = !!localStorage.getItem(PENDIENTE_PAYPHONE);
  } catch {
    return 0;
  }
  if (!hayPendiente) return 0;

  try {
    const r = await fetch(`${URL}/functions/v1/payphone-rescata`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!r.ok) return 0;
    const cuerpo = await r.json().catch(() => ({}));
    const concedidos = Number(cuerpo?.concedidos ?? 0);
    // Concedido: este navegador ya no tiene nada que rescatar.
    if (concedidos > 0) {
      try {
        localStorage.removeItem(PENDIENTE_PAYPHONE);
      } catch {
        /* nada que hacer */
      }
    }
    return concedidos;
  } catch {
    return 0;
  }
}
