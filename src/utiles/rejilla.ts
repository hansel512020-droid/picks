import { useWindowDimensions, type ViewStyle } from 'react-native';
import { ANCHO_AMPLIO, E } from '@/tema';

/**
 * Cuántas tarjetas de pick caben por fila, y cómo repartirlas.
 *
 * En el móvil, una: la tarjeta se diseñó para ese ancho. En la web, en vez de
 * estirar una sola hasta ocupar el monitor —barras de un metro y el texto
 * perdido en medio—, se ponen dos o tres del mismo tamaño que en el móvil, que
 * es como mejor se leen.
 *
 * Devuelve también el estilo de la fila y de la celda para la `FlatList`. La
 * celda lleva un tope de ancho para que la última fila, si va incompleta, no
 * estire su tarjeta hasta ocupar el hueco de las que faltan.
 */
export function useRejilla(): {
  columnas: number;
  fila: ViewStyle | undefined;
  celda: ViewStyle | undefined;
} {
  const { width } = useWindowDimensions();
  const util = Math.min(width, ANCHO_AMPLIO) - 2 * E.lg;
  const columnas = util >= 1080 ? 3 : util >= 700 ? 2 : 1;
  if (columnas === 1) return { columnas, fila: undefined, celda: undefined };
  const ancho = (util - (columnas - 1) * E.md) / columnas;
  return {
    columnas,
    fila: { gap: E.md, paddingHorizontal: E.lg, alignItems: 'flex-start' },
    celda: { flex: 1, maxWidth: ancho },
  };
}
