import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  cargaPicks,
  cuandoAvanceLaCarga,
  cuandoLleguenLosPicks,
  estadoDeLaCarga,
  type EstadoCarga,
  hayPicksDelServidor,
  picksCompletos,
  picksFallaron,
  picksDeCompeticionServidor,
  picksDePartidoServidor,
  pickGratisDelServidor,
} from '@/datos/picksServidor';
import type { Pick } from '@/datos/tipos';

/**
 * Los picks del servidor, para las pantallas.
 *
 * Pide la lista la primera vez que alguien la necesita y avisa a todas las
 * pantallas cuando llega. Devuelve `undefined` mientras no haya nada todavía,
 * que es lo que distingue "cargando" de "no hay picks hoy": la portada enseña
 * la pantalla de carga con el primero y un "sin picks" con el segundo.
 */
function usePicks<T>(lee: () => T, clave: string): T | undefined {
  const [vuelta, refresca] = useState(0);
  const [listo, setListo] = useState(hayPicksDelServidor());

  useEffect(() => {
    let vivo = true;
    const baja = cuandoLleguenLosPicks(() => {
      if (!vivo) return;
      setListo(true);
      refresca((n) => n + 1);
    });
    cargaPicks().then(() => {
      if (vivo) setListo(hayPicksDelServidor());
    });
    return () => {
      vivo = false;
      baja();
    };
  }, []);

  /*
   * La lectura se guarda hasta que llegan picks nuevos o cambia lo que se pide.
   *
   * Leer filtra la lista entera y devuelve una lista nueva cada vez; las
   * pantallas la tienen de dependencia de sus cálculos, así que cada repintado
   * —por cualquier motivo— volvía a ordenar todos los picks y a pintar la lista
   * de cero aunque no hubiera cambiado nada.
   */
  /*
   * Con solo la primera tanda (los picks más cercanos), un "no hay" puede ser
   * que todavía no han llegado: los de una liga que juega el domingo vienen en
   * las tandas de detrás. En ese caso se sigue cargando en vez de decir que no
   * hay nada.
   */
  return useMemo(() => {
    if (!listo) return undefined;
    const leido = lee();
    const vacio = leido === null || (Array.isArray(leido) && leido.length === 0);
    return vacio && !picksCompletos() ? undefined : leido;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, vuelta, clave]);
}

/** Los de una competición ('todas' para la lista entera). */
export function usePicksDelServidor(competicionId: string): Pick[] | undefined {
  return usePicks(() => picksDeCompeticionServidor(competicionId), competicionId);
}

/** Los de un partido concreto. */
export function usePicksDelPartido(partidoId: string): Pick[] | undefined {
  return usePicks(() => picksDePartidoServidor(partidoId), partidoId);
}

/** Si el último intento de traer los picks falló. Se repinta al reintentar. */
export function usePicksFallaron(): boolean {
  return useSyncExternalStore(cuandoLleguenLosPicks, picksFallaron, () => false);
}

/** En qué va la carga de los picks: paso, cuántos han llegado y desde cuándo. */
export function useEstadoCarga(): EstadoCarga {
  return useSyncExternalStore(cuandoAvanceLaCarga, estadoDeLaCarga, estadoDeLaCarga);
}

/** El gratis de hoy. */
export function usePickGratis(): Pick | null | undefined {
  return usePicks(() => pickGratisDelServidor(), 'gratis');
}
