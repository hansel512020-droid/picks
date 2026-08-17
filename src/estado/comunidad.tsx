import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  anotaGuardado,
  borraGuardado,
  contadores,
  COMUNIDAD_ACTIVA,
} from '@/datos/comunidad';
import { useSesion } from './sesion';

/**
 * Contadores reales de guardados. Mantiene en memoria cuánta gente ha guardado
 * cada pick y los va pidiendo al servidor a medida que las tarjetas aparecen
 * en pantalla, en bloques y sin repetir.
 *
 * Sin servidor configurado todo esto se queda quieto y las tarjetas siguen
 * enseñando el número estimado que calcula el modelo.
 */

interface Comunidad {
  /** true cuando los números vienen de un servidor de verdad. */
  real: boolean;
  /** Guardados de un pick, o `undefined` si todavía no se sabe. */
  cuenta: (pickId: string) => number | undefined;
  /** Apunta que hace falta el contador de estos picks. */
  pide: (pickIds: string[]) => void;
  suma: (pickId: string, competicionId: string) => void;
  resta: (pickId: string) => void;
}

/** Cada cuánto se vuelven a pedir los contadores que el usuario ya ha visto. */
const CADA_REFRESCO = 30_000;

const Contexto = createContext<Comunidad | null>(null);

export function ProveedorComunidad({ children }: { children: ReactNode }) {
  // Quien guarda: con cuenta cuenta una vez, aunque use varios navegadores.
  const { sesion } = useSesion();
  const [cuentas, setCuentas] = useState<Record<string, number>>({});
  // Lo que está esperando a pedirse y lo que ya se pidió alguna vez.
  const pendientes = useRef<Set<string>>(new Set());
  const pedidos = useRef<Set<string>>(new Set());
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const vaciaCola = useCallback(async () => {
    const ids = [...pendientes.current];
    pendientes.current.clear();
    if (!ids.length) return;
    const nuevos = await contadores(ids);
    setCuentas((prev) => {
      const salida = { ...prev };
      // Un pick que nadie ha guardado no viene en la respuesta: es un cero,
      // no un "no se sabe".
      for (const id of ids) salida[id] = nuevos[id] ?? 0;
      return salida;
    });
  }, []);

  const pide = useCallback(
    (pickIds: string[]) => {
      if (!COMUNIDAD_ACTIVA) return;
      let hayNuevos = false;
      for (const id of pickIds) {
        if (pedidos.current.has(id)) continue;
        pedidos.current.add(id);
        pendientes.current.add(id);
        hayNuevos = true;
      }
      if (!hayNuevos) return;
      // Se agrupan las peticiones de un mismo momento en una sola llamada.
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(vaciaCola, 250);
    },
    [vaciaCola],
  );

  useEffect(() => {
    return () => {
      if (temporizador.current) clearTimeout(temporizador.current);
    };
  }, []);

  /*
   * Los contadores se refrescan solos cada poco.
   *
   * Antes se pedían una vez, al abrir la pantalla, y ahí se quedaban: si otra
   * persona guardaba ese mismo pick, el número no se movía hasta recargar la
   * app entera. Un contador de comunidad que solo cambia al recargar no cuenta
   * lo que está pasando, cuenta lo que pasaba cuando entraste.
   *
   * Se repiten solo los que ya se han pedido alguna vez, o sea los que el
   * usuario ha llegado a ver. No es un chat: cada medio minuto sobra para que
   * la cifra se sienta viva sin castigar al servidor.
   */
  useEffect(() => {
    if (!COMUNIDAD_ACTIVA) return;

    const reloj = setInterval(async () => {
      const ids = [...pedidos.current];
      if (!ids.length) return;
      const nuevos = await contadores(ids);
      setCuentas((prev) => {
        const salida = { ...prev };
        for (const id of ids) salida[id] = nuevos[id] ?? 0;
        return salida;
      });
    }, CADA_REFRESCO);

    return () => clearInterval(reloj);
  }, []);

  const suma = useCallback((pickId: string, competicionId: string) => {
    if (!COMUNIDAD_ACTIVA) return;
    // Sube al momento y luego se confirma: la app no espera al servidor.
    setCuentas((prev) => ({ ...prev, [pickId]: (prev[pickId] ?? 0) + 1 }));
    anotaGuardado(pickId, competicionId, sesion?.id).then((bien) => {
      if (!bien) setCuentas((prev) => ({ ...prev, [pickId]: Math.max(0, (prev[pickId] ?? 1) - 1) }));
    });
  }, [sesion?.id]);

  const resta = useCallback((pickId: string) => {
    if (!COMUNIDAD_ACTIVA) return;
    setCuentas((prev) => ({ ...prev, [pickId]: Math.max(0, (prev[pickId] ?? 1) - 1) }));
    borraGuardado(pickId, sesion?.id).then((bien) => {
      if (!bien) setCuentas((prev) => ({ ...prev, [pickId]: (prev[pickId] ?? 0) + 1 }));
    });
  }, [sesion?.id]);

  const valor = useMemo<Comunidad>(
    () => ({
      real: COMUNIDAD_ACTIVA,
      /*
       * El recuento de verdad. Con servidor detrás, un pick que nadie ha
       * guardado vale cero —y cero es un dato, no una ausencia—; sin servidor
       * se devuelve  para que la tarjeta sepa que no hay número
       * real y no enseñe ninguno.
       */
      cuenta: (pickId: string) =>
        COMUNIDAD_ACTIVA ? (cuentas[pickId] ?? 0) : undefined,
      pide,
      suma,
      resta,
    }),
    [cuentas, pide, suma, resta],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useComunidad(): Comunidad {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useComunidad fuera del ProveedorComunidad');
  return ctx;
}
