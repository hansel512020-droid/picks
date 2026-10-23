import { Platform, useWindowDimensions } from 'react-native';

/** Ancho del menú lateral del escritorio. */
export const ANCHO_LATERAL = 248;

/** Desde qué ancho de ventana sale el menú lateral en vez de la barra de abajo. */
const DESDE = 1100;

/** Si se pinta el menú lateral (y por tanto no la barra de abajo). */
export function useHayLateral(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESDE;
}

/** El ancho que queda para la pantalla, descontado el menú lateral si lo hay. */
export function useAnchoContenido(): number {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESDE ? width - ANCHO_LATERAL - 1 : width;
}
