import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Los avisos, guardados dentro de la app.
 *
 * Hasta ahora cuando un pick se cumplía se lanzaba una notificación del sistema
 * y ahí moría: en el móvil se va del centro de notificaciones en cuanto se
 * desliza, y **en web no existen siquiera**, así que quien usa la app desde el
 * navegador no se enteraba nunca de nada.
 *
 * Aquí se quedan. Es el historial de lo que ha pasado con tus picks mientras no
 * mirabas, que es justo lo que uno viene a comprobar al abrir la app.
 */

export interface Aviso {
  id: string;
  titulo: string;
  cuerpo: string;
  /** ISO. */
  cuando: string;
  leido: boolean;
  /** A dónde lleva al tocarlo, si va a algún sitio. */
  ruta?: string;
}

const CLAVE = 'scout-picks/avisos';
/** Tope de avisos guardados: más allá es ruido y ocupa sitio. */
const TOPE = 50;

interface Avisos {
  lista: Aviso[];
  /** Cuántos sin leer: es el número del globo rojo. */
  sinLeer: number;
  anota: (aviso: Omit<Aviso, 'id' | 'cuando' | 'leido'>) => void;
  marcaLeidos: () => void;
  borra: () => void;
}

const Contexto = createContext<Avisos | null>(null);

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Aviso[]>([]);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const crudo = await AsyncStorage.getItem(CLAVE);
        if (crudo) setLista(JSON.parse(crudo));
      } catch {
        // Un guardado corrupto no puede impedir abrir la app.
      } finally {
        setCargado(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!cargado) return;
    AsyncStorage.setItem(CLAVE, JSON.stringify(lista)).catch(() => {});
  }, [lista, cargado]);

  const anota = useCallback((aviso: Omit<Aviso, 'id' | 'cuando' | 'leido'>) => {
    setLista((prev) => {
      /*
       * No se repite el mismo aviso.
       *
       * El barrido del directo pasa cada medio minuto y puede volver a
       * encontrar el mismo pick recién cumplido. Sin esto, la campana se
       * llenaría de veinte copias del mismo mensaje.
       */
      if (prev.some((a) => a.titulo === aviso.titulo && a.cuerpo === aviso.cuerpo)) return prev;
      const nuevo: Aviso = {
        ...aviso,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        cuando: new Date().toISOString(),
        leido: false,
      };
      return [nuevo, ...prev].slice(0, TOPE);
    });
  }, []);

  const marcaLeidos = useCallback(() => {
    setLista((prev) => (prev.some((a) => !a.leido) ? prev.map((a) => ({ ...a, leido: true })) : prev));
  }, []);

  const borra = useCallback(() => setLista([]), []);

  const sinLeer = useMemo(() => lista.filter((a) => !a.leido).length, [lista]);

  const valor = useMemo<Avisos>(
    () => ({ lista, sinLeer, anota, marcaLeidos, borra }),
    [lista, sinLeer, anota, marcaLeidos, borra],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAvisos(): Avisos {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useAvisos fuera del ProveedorAvisos');
  return ctx;
}
