/**
 * Sistema de diseno de Golden Picks.
 *
 * Todo el aspecto de la app sale de aqui: un fondo casi negro, tarjetas
 * apenas mas claras con borde de un pixel y un lima muy saturado como unico
 * color de marca. Las pantallas nunca escriben un color a mano.
 */

export const C = {
  /** Fondo de la app. */
  fondo: '#0A0B0D',
  /** Fondo de las cabeceras y barras, un punto por encima del fondo. */
  fondo2: '#101215',
  /** Tarjetas. */
  carta: '#15171B',
  /** Tarjetas dentro de tarjetas (fila de mercado, cajas de stats). */
  carta2: '#1B1E23',
  /** Superficie pulsada. */
  cartaActiva: '#22262C',
  /** Borde de un pixel de casi todo. */
  borde: '#23262C',
  bordeSuave: '#1A1D21',

  /** Lima de marca. */
  lima: '#C9FF3D',
  limaOscuro: '#A9E01F',
  /** Lima al 12% para fondos de estado activo. */
  limaTenue: 'rgba(201,255,61,0.12)',
  limaBorde: 'rgba(201,255,61,0.45)',

  texto: '#FFFFFF',
  texto2: '#9AA1AA',
  texto3: '#646B75',

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
  neutro: '#3A3F46',

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

/** Altura reservada para la barra de pestanas flotante. */
export const ALTO_TABS = 62;

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

/** Ancho útil del lienzo para el tamaño de ventana dado. */
export function anchoLienzo(anchoVentana: number): number {
  return Math.min(anchoVentana, ANCHO_MARCO);
}
