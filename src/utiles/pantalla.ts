import { useSyncExternalStore } from 'react';
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

/*
 * Si alguna pantalla ha pedido esconder la navegación mientras carga.
 *
 * En el móvil ya se escondía la barra de abajo; en el escritorio el menú
 * lateral seguía a la izquierda de la pantalla de carga, y se veía media app
 * lista y media app cargando. Lo pide la misma `useOcultaPestanas` que esconde
 * la barra.
 */
let lateralOculto = false;
const oyentesLateral = new Set<() => void>();

export function ocultaLateral(oculto: boolean): void {
  if (lateralOculto === oculto) return;
  lateralOculto = oculto;
  for (const avisa of oyentesLateral) avisa();
}

const suscribeLateral = (avisa: () => void) => {
  oyentesLateral.add(avisa);
  return () => {
    oyentesLateral.delete(avisa);
  };
};

/** Si el menú lateral tiene que esconderse ahora (hay una pantalla cargando). */
export function useLateralOculto(): boolean {
  return useSyncExternalStore(
    suscribeLateral,
    () => lateralOculto,
    () => false,
  );
}

/** El ancho que queda para la pantalla, descontado el menú lateral si lo hay. */
export function useAnchoContenido(): number {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESDE ? width - ANCHO_LATERAL - 1 : width;
}
