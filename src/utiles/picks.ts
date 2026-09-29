import { useEffect, useState } from 'react';
import {
  cargaPicks,
  cuandoLleguenLosPicks,
  hayPicksDelServidor,
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
function usePicks<T>(lee: () => T): T | undefined {
  const [, refresca] = useState(0);
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

  return listo ? lee() : undefined;
}

/** Los de una competición ('todas' para la lista entera). */
export function usePicksDelServidor(competicionId: string): Pick[] | undefined {
  return usePicks(() => picksDeCompeticionServidor(competicionId));
}

/** Los de un partido concreto. */
export function usePicksDelPartido(partidoId: string): Pick[] | undefined {
  return usePicks(() => picksDePartidoServidor(partidoId));
}

/** El gratis de hoy. */
export function usePickGratis(): Pick | null | undefined {
  return usePicks(() => pickGratisDelServidor());
}
