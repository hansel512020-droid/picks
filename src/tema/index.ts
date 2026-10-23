/**
 * Sistema de diseno de Golden Picks.
 *
 * Todo el aspecto de la app sale de aqui: un fondo casi negro, tarjetas
 * apenas mas claras con borde de un pixel y un lima muy saturado como unico
 * color de marca. Las pantallas nunca escriben un color a mano.
 *
 * Los negros tiran a azul noche y no a gris: con el gris el lima quedaba
 * sobre un fondo apagado, casi de ceniza; sobre azul muy oscuro el lima
 * resalta más y el conjunto se lee como una pantalla de datos, no como un
 * fondo vacío.
 */

export const C = {
  /** Fondo de la app. */
  fondo: '#070A0F',
  /** Fondo de las cabeceras y barras, un punto por encima del fondo. */
  fondo2: '#0C1118',
  /** Tarjetas. */
  carta: '#111720',
  /** Tarjetas dentro de tarjetas (fila de mercado, cajas de stats). */
  carta2: '#18202B',
  /** Superficie pulsada. */
  cartaActiva: '#202A37',
  /** Borde de un pixel de casi todo. */
  borde: '#202A36',
  bordeSuave: '#161E28',
  /** El canto de arriba de las tarjetas, donde da la luz. */
  bordeLuz: '#2E3A4A',

  /** Lima de marca. */
  lima: '#C9FF3D',
  limaOscuro: '#A9E01F',
  /** Lima al 12% para fondos de estado activo. */
  limaTenue: 'rgba(201,255,61,0.12)',
  limaBorde: 'rgba(201,255,61,0.45)',

  texto: '#FFFFFF',
  texto2: '#9AA6B6',
  texto3: '#617084',

  verde: '#2FD35F',
  verdeTenue: 'rgba(47,211,95,0.14)',
  rojo: '#F0524B',
  rojoTenue: 'rgba(240,82,75,0.14)',
  ambar: '#FFA02E',
  ambarTenue: 'rgba(255,160,46,0.16)',
  azul: '#3B9BFF',
  violeta: '#9B7BFF',

  /** Barra L10: acierto / fallo. */
  acierto: '#2FD35F',
  fallo: '#F0524B',
  neutro: '#34404F',

  /** Fondo de una tarjeta cuyo partido se está jugando: la carta teñida de rojo. */
  cartaVivo: '#1C1419',

  /**
   * Detrás de los logos de competición. Vienen dibujados para fondo blanco y
   * varios son oscuros —la Champions azul marino, la Premier morada—: sobre
   * el negro de la app se veían como un círculo vacío.
   */
  papel: '#EEF1F5',

  transparente: 'transparent',
} as const;

export const R = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const E = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

/**
 * Escala tipografica. Los titulos van con letterSpacing negativo porque el
 * original usa una grotesca condensada y el sistema queda mas suelto.
 */
export const T = {
  displayXL: { fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  display: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  titulo: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  subtitulo: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  cuerpoFuerte: { fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  cuerpo: { fontSize: 15, fontWeight: '400', letterSpacing: -0.1 },
  pequeno: { fontSize: 13, fontWeight: '500' },
  pequenoFuerte: { fontSize: 13, fontWeight: '700' },
  mini: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  etiqueta: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
} as const;

/** Sombra suave para las tarjetas que flotan (sheets, badge de fuego). */
export const sombra = {
  shadowColor: '#000',
  shadowOpacity: 0.45,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 8,
};

/**
 * Brillos y sombras en formato `boxShadow`, que React Native y la web entienden
 * igual. El lima brilla solo en lo activo: si todo brilla, nada destaca.
 */
export const brillo = {
  /** Chip, pestaña o botón elegido. */
  lima: '0 0 0 1px rgba(201,255,61,0.10), 0 6px 20px -8px rgba(201,255,61,0.45)',
  /** El botón principal, que es lo que más tiene que llamar. */
  limaFuerte: '0 10px 28px -10px rgba(201,255,61,0.65)',
  /** Punto rojo de "en vivo". */
  rojo: '0 0 10px rgba(240,82,75,0.75)',
} as const;

/**
 * Tiempos del movimiento. Cortos a propósito: la animación acompaña al toque,
 * no lo hace esperar.
 */
export const M = {
  rapido: 160,
  normal: 260,
  lento: 420,
} as const;

/**
 * Cómo se pintan las listas de tarjetas pesadas (picks).
 *
 * Por defecto una lista pinta diez filas de entrada y luego sigue hasta cubrir
 * veintiuna pantallas: en la portada eso eran veinte tarjetas montadas para
 * enseñar dos. Así se pinta lo que se ve y un poco alrededor, y el resto entra
 * al desplazarse.
 */
export const LISTA_LIGERA = {
  initialNumToRender: 4,
  maxToRenderPerBatch: 4,
  windowSize: 7,
  updateCellsBatchingPeriod: 40,
} as const;

/**
 * Altura de la barra de pestañas flotante.
 *
 * Cada pestaña necesita 51: el hueco del icono (28), el nombre (13) y 5 de
 * margen arriba y abajo. Con 62 y los rellenos de la cápsula quedaban 48 y el
 * nombre salía cortado por abajo. Con 66 caben con aire.
 */
export const ALTO_TABS = 66;

/** Separación de la barra flotante con el borde de abajo de la pantalla. */
export const MARGEN_TABS = 12;

/**
 * Lo que tienen que dejar libre abajo las pantallas de pestañas.
 *
 * La barra flota por encima del contenido, así que la lista corre por debajo
 * de ella: sin este hueco la última tarjeta se quedaría tapada sin manera de
 * subirla. Es la barra, su margen y un respiro.
 */
export const HUECO_PESTANAS = ALTO_TABS + MARGEN_TABS + 28;

/**
 * Ancho máximo del lienzo de la app. En móvil y tablet se ocupa la pantalla
 * entera; en el navegador la página usa todo el ancho disponible hasta este
 * tope, que existe solo para que en un monitor ultrapanorámico las líneas de
 * texto no crucen medio metro de pantalla.
 *
 * Vive aquí y no en cada pantalla para que el marco y lo que va dentro midan
 * siempre lo mismo: si no coinciden, el contenido se sale por la derecha.
 */
export const ANCHO_MARCO = 4096;

/**
 * Las dos columnas de la web.
 *
 * El lienzo sigue ocupando la ventana entera —es una página, no un móvil
 * metido en una página—, pero lo que va DENTRO no se estira hasta los bordes:
 * en un monitor de 1440 una fila con la etiqueta en un extremo y el número en
 * el otro, a metro y medio, no se lee, y una tarjeta de pick de 1400 de ancho
 * es una barra.
 *
 * · `lectura`: fichas y ajustes. Una columna cómoda de leer.
 * · `amplia`: las listas de tarjetas, que en pantalla grande van en rejilla.
 *
 * Se aplica al contenido y no al contenedor que se desplaza: así la rueda del
 * ratón sigue moviendo la página aunque el puntero esté en los márgenes.
 *
 * En el móvil no hacen nada: la pantalla es más estrecha que cualquiera de las
 * dos.
 */
export const ANCHO_LECTURA = 880;
export const ANCHO_AMPLIO = 1280;

export const COLUMNA = {
  lectura: { width: '100%', maxWidth: ANCHO_LECTURA, alignSelf: 'center' },
  amplia: { width: '100%', maxWidth: ANCHO_AMPLIO, alignSelf: 'center' },
} as const;

/** Ancho útil del lienzo para el tamaño de ventana dado. */
export function anchoLienzo(anchoVentana: number): number {
  return Math.min(anchoVentana, ANCHO_MARCO);
}
