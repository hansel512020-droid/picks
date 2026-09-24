import { useEffect, useRef, useState } from 'react';
import { cuandoLlegueMasDato } from '@/datos/importado';

/*
 * Un contador que sube cada vez que llegan más datos (el detalle por jugador
 * que entra en segundo plano). Los cálculos lo llevan entre sus dependencias
 * para rehacerse cuando eso pasa —y así aparecen los picks de jugador— pero SIN
 * remontar: el `primera` de abajo se queda en false, la pantalla conserva lo
 * que ya tenía y no vuelve a salir el "Analizando…". Antes esto se hacía
 * remontando la pantalla entera, y por eso los picks parecían cargar dos veces.
 */
function useGeneracionDatos(): number {
  const [gen, setGen] = useState(0);
  useEffect(() => cuandoLlegueMasDato(() => setGen((n) => n + 1)), []);
  return gen;
}

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
/**
 * Devuelve dos cosas, y la diferencia importa:
 *
 * · `avance`: lo último que ha entregado el generador, con el trabajo a medias.
 *   Sirve para la barra de carga —cuánto lleva y cuánto queda—.
 * · `final`: el resultado completo, y solo cuando lo está. Es lo que se pinta:
 *   así la lista aparece entera de una vez en vez de ir creciendo y saltando
 *   bajo el dedo mientras alguien la lee.
 *
 * Mientras se recalcula (cambio de competición, datos nuevos), `final` conserva
 * lo anterior: se mantiene en pantalla lo que ya había hasta que lo nuevo está
 * listo, en vez de borrarlo y dejar un "cargando" encima.
 */
export function useCalculoProgresivo<Avance, Final>(
  crear: () => Generator<Avance, Final, void>,
  deps: unknown[],
): { avance: Avance | undefined; final: Final | undefined } {
  const [avance, setAvance] = useState<Avance | undefined>(undefined);
  const [final, setFinal] = useState<Final | undefined>(undefined);
  const primera = useRef(true);
  const gen = useGeneracionDatos();

  useEffect(() => {
    let vivo = true;
    if (primera.current) setFinal(undefined);
    setAvance(undefined);
    const generador = crear();

    const paso = () => {
      if (!vivo) return;
      const { value, done } = generador.next();
      if (!vivo) return;
      if (done) {
        primera.current = false;
        setFinal(value as Final);
        return;
      }
      setAvance(value as Avance);
      // Cero, no dieciséis: solo hace falta ceder el turno, no esperar.
      setTimeout(paso, 0);
    };
    const arranque = setTimeout(paso, 16);

    return () => {
      vivo = false;
      clearTimeout(arranque);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, gen]);

  return { avance, final };
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
  const gen = useGeneracionDatos();

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
  }, [...deps, gen]);

  return datos;
}
