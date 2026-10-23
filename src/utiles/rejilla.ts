import { useWindowDimensions, type ViewStyle } from 'react-native';
import { ANCHO_AMPLIO, E, LISTA_LIGERA } from '@/tema';

/**
 * Cuántas tarjetas de pick caben por fila, y cómo repartirlas.
 *
 * En el móvil, una: la tarjeta se diseñó para ese ancho. En la web, en vez de
 * estirar una sola hasta ocupar el monitor —barras de un metro y el texto
 * perdido en medio—, se ponen dos una al lado de otra.
 *
 * Devuelve también el estilo de la fila y de la celda para la `FlatList`. La
 * celda lleva un tope de ancho para que la última fila, si va incompleta, no
 * estire su tarjeta hasta ocupar el hueco de las que faltan.
 */
/*
 * Cuánto pinta la lista por adelantado cuando va en rejilla.
 *
 * `LISTA_LIGERA` cuenta filas, no tarjetas: con tres por fila pintaba el
 * triple, y la portada en el ordenador llegó a tener 3.700 elementos montados
 * para enseñar seis tarjetas. Aquí se ajusta para que monte más o menos lo
 * mismo que una columna sola.
 */
const LISTA_REJILLA = {
  ...LISTA_LIGERA,
  initialNumToRender: 3,
  maxToRenderPerBatch: 2,
  windowSize: 5,
} as const;

export function useRejilla(): {
  columnas: number;
  fila: ViewStyle | undefined;
  celda: ViewStyle | undefined;
  /** Lo que pinta por adelantado: va a la `FlatList` en vez de `LISTA_LIGERA`. */
  lista: typeof LISTA_LIGERA | typeof LISTA_REJILLA;
} {
  const { width } = useWindowDimensions();
  const util = Math.min(width, ANCHO_AMPLIO) - 2 * E.lg;
  /*
   * Dos como mucho. Con tres, cada palmo de scroll montaba el triple de
   * tarjetas que con una sola columna, y en un portátil normal la portada daba
   * tirones al bajar: montar una tarjeta cuesta lo que cuesta, y con tres por
   * fila se montan muchas más por segundo. Con dos se sigue aprovechando el
   * ancho y la lista va fluida.
   */
  const columnas = util >= 760 ? 2 : 1;
  if (columnas === 1) {
    return { columnas, fila: undefined, celda: undefined, lista: LISTA_LIGERA };
  }
  const ancho = (util - (columnas - 1) * E.md) / columnas;
  return {
    columnas,
    fila: { gap: E.md, paddingHorizontal: E.lg, alignItems: 'flex-start' },
    celda: { flex: 1, maxWidth: ancho },
    lista: LISTA_REJILLA,
  };
}
