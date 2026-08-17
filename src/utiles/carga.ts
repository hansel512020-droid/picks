import { useEffect, useRef, useState } from 'react';

/**
 * Calcula algo pesado (generar una temporada, montar los picks) despues de
 * pintar el primer fotograma, para que la pantalla aparezca al instante y no
 * se quede el toque colgado. Devuelve `undefined` mientras trabaja.
 *
 * Se usa un temporizador y no InteractionManager porque en web las tareas de
 * interaccion pueden no dispararse nunca y la pantalla se quedaba cargando.
 */
export function useCalculo<T>(calcula: () => T, deps: unknown[]): T | undefined {
  const [datos, setDatos] = useState<T | undefined>(undefined);
  /*
   * La primera vez no hay nada que enseñar y toca poner el "cargando". A
   * partir de ahí se recalcula en silencio: se mantiene en pantalla lo que ya
   * había hasta que el resultado nuevo está listo, y entonces se cambia de
   * golpe. Sin esto, cada recálculo borraba la pantalla y dejaba un
   * "Analizando…" parpadeando encima de lo que el usuario estaba leyendo.
   */
  const primera = useRef(true);

  useEffect(() => {
    let vivo = true;
    if (primera.current) setDatos(undefined);
    const temporizador = setTimeout(() => {
      if (!vivo) return;
      const resultado = calcula();
      if (!vivo) return;
      primera.current = false;
      setDatos(resultado);
    }, 16);
    return () => {
      vivo = false;
      clearTimeout(temporizador);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return datos;
}
