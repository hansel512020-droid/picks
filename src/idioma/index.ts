import { getLocales } from 'expo-localization';

/**
 * Idiomas de la app.
 *
 * Los textos viven aquí y no repartidos por las pantallas, para poder
 * traducirlos sin tocar código. El diccionario español es la referencia: si
 * una traducción falta, se cae a él en vez de enseñar la clave cruda, que es
 * lo peor que puede ver un usuario.
 *
 * El idioma se detecta del dispositivo. No hay selector en ajustes a
 * propósito: quien tiene el móvil en inglés quiere la app en inglés, y una
 * pregunta más al arrancar es una pregunta de más.
 */

export type Idioma = 'es' | 'en';

/** Todos los textos de la app, en español, que es el idioma de referencia. */
const ES = {
  // ------------------------------------------------------------- acceso
  'entrar.creaCuenta': 'CREA TU CUENTA',
  'entrar.titulo': 'ENTRA EN GOLDEN',
  'entrar.explicacion':
    'Tu cuenta guarda tus picks, tu rendimiento y las ligas que sigues, y los lleva a cualquier sitio donde entres.',
  'entrar.conGoogle': 'Continuar con Google',
  'entrar.conApple': 'Continuar con Apple',
  'entrar.oCorreo': 'O CON TU CORREO',
  'entrar.pestanaCrear': 'Crear cuenta',
  'entrar.pestanaEntrar': 'Ya tengo cuenta',
  'entrar.correo': 'tucorreo@ejemplo.com',
  'entrar.contrasena': 'Contraseña',
  'entrar.entrar': 'Entrar',
  'entrar.esperando': 'Un momento…',
  'entrar.olvide': 'He olvidado mi contraseña',
  'entrar.correoInvalido': 'Escribe un correo válido.',
  'entrar.claveCorta': 'La contraseña necesita al menos 6 caracteres.',
  'entrar.credencialesMal': 'Correo o contraseña incorrectos',
  'entrar.codigoTitulo': 'ESCRIBE TU CÓDIGO',
  'entrar.codigoExplicacion': 'Te hemos enviado un código de 6 dígitos a {correo}.',
  'entrar.codigoConfirmar': 'Confirmar',
  'entrar.codigoComprobando': 'Comprobando…',
  'entrar.codigoReenviar': 'Reenviar código',
  'entrar.codigoCambiar': 'Cambiar de correo',
  'entrar.codigoSeisDigitos': 'El código tiene 6 dígitos.',

  // ---------------------------------------------------------- pestañas
  'tabs.inicio': 'Inicio',
  'tabs.partidos': 'Partidos',
  'tabs.comunidad': 'Comunidad',
  'tabs.rendimiento': 'Rendimiento',
  'tabs.perfil': 'Perfil',

  // ------------------------------------------------------------ inicio
  'inicio.picksDestacadas': 'Picks destacadas',
  'inicio.enVivo': 'En vivo',
  'inicio.verTodos': 'Ver todos',
  'inicio.analizando': 'Analizando {competicion}…',

  // ---------------------------------------------------------- partidos
  'partidos.titulo': 'Partidos',
  'partidos.todos': 'Todos',
  'partidos.enVivo': 'En vivo',
  'partidos.hoy': 'Hoy',
  'partidos.proximos': 'Próximos',
  'partidos.resultados': 'Resultados',
  'partidos.sinPartidos': 'No hay partidos',
  'partidos.pruebaOtroFiltro': 'Cambia de filtro o de competición.',
  'partidos.descanso': 'DESCANSO',
  'partidos.finalizado': 'FINALIZADO',
  'partidos.enCurso': 'EN CURSO',

  // ------------------------------------------------------------- pick
  'pick.mercadoConPro': 'Mercado y precio con Golden Pro',
  'pick.analisisConPro':
    'Análisis disponible con Golden Pro. Desbloquea el argumento, el precio y la tendencia de los últimos 10 partidos.',
  'pick.ultimos10': 'en los últimos 10 partidos',
  'pick.deVentaja': 'de ventaja',
  'pick.estimado': 'EST',

  // ------------------------------------------------------ rendimiento
  'rendimiento.titulo': 'Mi rendimiento',
  'rendimiento.todos': 'Todos',
  'rendimiento.pendientes': 'Pendientes',
  'rendimiento.ganados': 'Ganados',
  'rendimiento.perdidos': 'Perdidos',
  'rendimiento.acierto': 'Acierto',
  'rendimiento.cuota': 'Precio',
  'rendimiento.quitar': 'Quitar',
  'rendimiento.enJuego': 'EN JUEGO',
  'rendimiento.lleva': 'Lleva {valor}',
  'rendimiento.cumplido': '¡cumplido!',
  'rendimiento.falta': 'falta {n}',
  'rendimiento.faltan': 'faltan {n}',
  'rendimiento.noPasarDe': 'no puede pasar de {n}',

  // -------------------------------------------------------------- pro
  'pro.subtitulo': 'Todo el análisis, todas las competiciones, sin límites.',
  'pro.todasCompeticiones': 'TODAS LAS COMPETICIONES',
  'pro.planesPequenos': 'PLANES MÁS PEQUEÑOS',
  'pro.entraParaSuscribir': 'Entra con tu cuenta para suscribirte',
  'pro.planActivo': 'Plan activo',
  'pro.noDisponible': 'Este plan aún no está disponible',
  'pro.aviso':
    'El cobro lo gestiona PayPal. Puedes cancelar cuando quieras desde tu cuenta de PayPal y mantienes el acceso hasta que termine el periodo pagado.',

  // ----------------------------------------------------------- común
  'comun.mayores18': 'SOLO MAYORES DE 18 AÑOS · JUEGA CON RESPONSABILIDAD',
  'comun.cargando': 'Cargando…',
  'comun.volver': 'Volver',
} as const;

export type Clave = keyof typeof ES;

/** Traducción al inglés. Lo que falte cae al español. */
const EN: Partial<Record<Clave, string>> = {
  'entrar.creaCuenta': 'CREATE YOUR ACCOUNT',
  'entrar.titulo': 'SIGN IN TO GOLDEN',
  'entrar.explicacion':
    'Your account keeps your picks, your record and the leagues you follow, and takes them anywhere you sign in.',
  'entrar.conGoogle': 'Continue with Google',
  'entrar.conApple': 'Continue with Apple',
  'entrar.oCorreo': 'OR WITH YOUR EMAIL',
  'entrar.pestanaCrear': 'Create account',
  'entrar.pestanaEntrar': 'I have an account',
  'entrar.correo': 'you@example.com',
  'entrar.contrasena': 'Password',
  'entrar.entrar': 'Sign in',
  'entrar.esperando': 'One moment…',
  'entrar.olvide': 'I forgot my password',
  'entrar.correoInvalido': 'Enter a valid email address.',
  'entrar.claveCorta': 'The password needs at least 6 characters.',
  'entrar.credencialesMal': 'Wrong email or password',
  'entrar.codigoTitulo': 'ENTER YOUR CODE',
  'entrar.codigoExplicacion': "We've sent a 6-digit code to {correo}.",
  'entrar.codigoConfirmar': 'Confirm',
  'entrar.codigoComprobando': 'Checking…',
  'entrar.codigoReenviar': 'Resend code',
  'entrar.codigoCambiar': 'Use another email',
  'entrar.codigoSeisDigitos': 'The code has 6 digits.',

  'tabs.inicio': 'Home',
  'tabs.partidos': 'Matches',
  'tabs.comunidad': 'Community',
  'tabs.rendimiento': 'Record',
  'tabs.perfil': 'Profile',

  'inicio.picksDestacadas': 'Featured picks',
  'inicio.enVivo': 'Live',
  'inicio.verTodos': 'See all',
  'inicio.analizando': 'Analysing {competicion}…',

  'partidos.titulo': 'Matches',
  'partidos.todos': 'All',
  'partidos.enVivo': 'Live',
  'partidos.hoy': 'Today',
  'partidos.proximos': 'Upcoming',
  'partidos.resultados': 'Results',
  'partidos.sinPartidos': 'No matches',
  'partidos.pruebaOtroFiltro': 'Try another filter or competition.',
  'partidos.descanso': 'HALF-TIME',
  'partidos.finalizado': 'FULL-TIME',
  'partidos.enCurso': 'LIVE',

  'pick.mercadoConPro': 'Market and odds with Golden Pro',
  'pick.analisisConPro':
    'Analysis available with Golden Pro. Unlock the reasoning, the odds and the last 10 matches.',
  'pick.ultimos10': 'in the last 10 matches',
  'pick.deVentaja': 'edge',
  'pick.estimado': 'EST',

  'rendimiento.titulo': 'My record',
  'rendimiento.todos': 'All',
  'rendimiento.pendientes': 'Pending',
  'rendimiento.ganados': 'Won',
  'rendimiento.perdidos': 'Lost',
  'rendimiento.acierto': 'Hit rate',
  'rendimiento.cuota': 'Price',
  'rendimiento.quitar': 'Remove',
  'rendimiento.enJuego': 'LIVE',
  'rendimiento.lleva': 'On {valor}',
  'rendimiento.cumplido': 'done!',
  'rendimiento.falta': '{n} to go',
  'rendimiento.faltan': '{n} to go',
  'rendimiento.noPasarDe': 'must stay at {n}',

  'pro.subtitulo': 'Every insight, every competition, no limits.',
  'pro.todasCompeticiones': 'ALL COMPETITIONS',
  'pro.planesPequenos': 'SMALLER PLANS',
  'pro.entraParaSuscribir': 'Sign in to subscribe',
  'pro.planActivo': 'Active plan',
  'pro.noDisponible': 'This plan is not available yet',
  'pro.aviso':
    'PayPal handles the payment. You can cancel any time from your PayPal account and keep access until the paid period ends.',

  'comun.mayores18': '18+ ONLY · GAMBLE RESPONSIBLY',
  'comun.cargando': 'Loading…',
  'comun.volver': 'Back',
};

const DICCIONARIOS: Record<Idioma, Partial<Record<Clave, string>>> = { es: ES, en: EN };

/**
 * Idioma del dispositivo, resuelto una vez al arrancar.
 *
 * Cualquier idioma que no sea inglés cae al español, que es la lengua de la
 * app: un usuario francés entiende mejor el español que una pantalla llena de
 * claves sin traducir.
 */
function detecta(): Idioma {
  try {
    const codigo = getLocales()[0]?.languageCode?.toLowerCase();
    return codigo === 'en' ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

export const IDIOMA: Idioma = detecta();

/**
 * Traduce una clave. Los huecos `{nombre}` se rellenan con `valores`.
 *
 *   t('rendimiento.lleva', { valor: 3 })  ->  "Lleva 3"
 */
export function t(clave: Clave, valores?: Record<string, string | number>): string {
  const texto = DICCIONARIOS[IDIOMA][clave] ?? ES[clave] ?? clave;
  if (!valores) return texto;
  return texto.replace(/\{(\w+)\}/g, (_, k) => String(valores[k] ?? `{${k}}`));
}

/**
 * Moneda que se enseña.
 *
 * Ojo: esto NO cambia lo que cobra PayPal. Los planes están creados en dólares
 * y PayPal cobra en la moneda del plan, siempre. Esto solo sirve para añadir
 * una equivalencia orientativa —"≈ 92 €"— junto al precio real. Enseñar un
 * precio en euros y cobrar en dólares sería engañar justo en la pantalla de
 * pago; para cobrar de verdad en otra moneda hay que crear planes aparte en
 * PayPal para esa moneda.
 */
export function monedaDelUsuario(): string {
  try {
    return getLocales()[0]?.currencyCode ?? 'USD';
  } catch {
    return 'USD';
  }
}
