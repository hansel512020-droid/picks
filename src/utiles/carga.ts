import { useEffect, useRef, useState } from 'react';

/**
 * Calcula algo pesado (generar una temporada, montar los picks) despues de
 * pintar el primer fotograma, para que la pantalla aparezca al instante y no
 * se quede el toque colgado. Devuelve `undefined` mientras trabaja.
 *
 * Se usa un temporizador y no InteractionManager porque en web las tareas de
 * interaccion pueden no dispararse nunca y la pantalla se quedaba cargando.
 */
/**
 * Como `useCalculo`, pero soltando el navegador entre trozo y trozo.
 *
 * ── Por qué hace falta ──────────────────────────────────────────────────────
 *
 * Aplazar el cálculo con un temporizador evita que se congele el toque, pero
 * cuando arranca sigue siendo una sola tanda: JavaScript no tiene hilos y
 * mientras calcula, la página no responde a nada. Con "Todas" activa eso son
 * tres segundos de pantalla muerta —en un móvil, diez o más—, y desde fuera no
 * se distingue de que la app se haya colgado.
 *
 * Aquí el trabajo llega partido en trozos. Entre uno y otro se cede el control
 * al navegador, que aprovecha para responder a los toques y repintar. Tarda lo
 * mismo o un poco más, pero la app sigue viva mientras tanto.
 *
 * Y devuelve lo que va habiendo: los primeros picks aparecen enseguida y la
 * lista se completa sola. Ver diez tarjetas al momento y el resto en un segundo
 * se siente mucho más rápido que verlas todas de golpe tres segundos después,
 * aunque el reloj diga lo contrario.
 */
export function useCalculoProgresivo<T>(
  crear: () => Generator<T, T, void>,
  deps: unknown[],
): T | undefined {
  const [datos, setDatos] = useState<T | undefined>(undefined);
  const primera = useRef(true);

  useEffect(() => {
    let vivo = true;
    if (primera.current) setDatos(undefined);
    const generador = crear();

    const paso = () => {
      if (!vivo) return;
      const { value, done } = generador.next();
      if (!vivo) return;
      if (value !== undefined) {
        primera.current = false;
        setDatos(value);
      }
      // Cero, no dieciséis: solo hace falta ceder el turno, no esperar.
      if (!done) setTimeout(paso, 0);
    };
    const arranque = setTimeout(paso, 16);

    return () => {
      vivo = false;
      clearTimeout(arranque);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return datos;
}

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
