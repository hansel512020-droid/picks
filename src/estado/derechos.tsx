import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { competicionOpcional } from '@/datos/competiciones';
import { derechosDelUsuario, ligasDesbloqueadas, type Derecho } from '@/datos/cuenta';
import { useSesion } from './sesion';

/**
 * Qué tiene desbloqueado el usuario.
 *
 * La fuente de verdad es la tabla `derechos` del servidor, no el teléfono. Un
 * plan guardado en el móvil se edita desde la consola del navegador en diez
 * segundos, así que el muro de pago dejaría de serlo. Aquí solo se consulta.
 *
 * Se relee cada pocos minutos porque el acceso llega de forma asíncrona: el
 * usuario paga, PayPal avisa al webhook, el webhook escribe la fila. Entre
 * pulsar "pagar" y tener el acceso pasan unos segundos, y sin este refresco el
 * usuario tendría que cerrar y abrir la app para ver lo que acaba de comprar.
 */

const CADA = 3 * 60_000;

/**
 * Si la consulta falla se reintenta mucho antes que el ciclo normal: quien
 * está mirando la pantalla puede acabar de pagar, y tres minutos de candados
 * cerrados después de cobrarle es una eternidad.
 */
const SI_FALLA = 20_000;

interface Derechos {
  /** Las competiciones compradas. `*` significa todas. */
  libres: Set<string>;
  /** Falso hasta la primera consulta: evita parpadeos de candados. */
  cargado: boolean;
  /** Si hay algún plan de pago vigente, según el servidor. */
  pro: boolean;
  /** El periodo de lo comprado: `semanal`, `mensual`, `anual`, `vitalicio`. */
  periodo: string | null;
  /**
   * PayPal no ha podido cobrar la última renovación. El acceso sigue vivo
   * hasta `caducaEl`, pero después se apaga si no se arregla el pago.
   */
  cobroFallido: boolean;
  /** Cuándo se acaba el acceso, en ISO. Nulo si es vitalicio o no hay plan. */
  caducaEl: string | null;
  /** Competiciones que puede elegir con su plan parcial. Cero si no tiene. */
  huecos: number;
  /** Si esta competición se puede ver entera. */
  tieneAcceso: (competicionId: string) => boolean;
  /** Vuelve a preguntar ahora, tras una compra. */
  refresca: () => Promise<void>;
}

const Contexto = createContext<Derechos | null>(null);

export function ProveedorDerechos({ children }: { children: ReactNode }) {
  const { sesion } = useSesion();
  const [lista, setLista] = useState<Derecho[]>([]);
  const [cargado, setCargado] = useState(false);
  /** Intentos seguidos que no han podido leer la tabla. */
  const [fallos, setFallos] = useState(0);

  const refresca = useCallback(async () => {
    if (!sesion) {
      setLista([]);
      setFallos(0);
      setCargado(true);
      return;
    }

    const filas = await derechosDelUsuario(sesion.token, sesion.id);
    /*
     * `null` es "no se ha podido preguntar", no "no ha comprado nada". Se
     * conserva lo último que sí se supo en vez de vaciar la lista: si no, un
     * 401 pasajero —el token de acceso dura una hora y se renueva en segundo
     * plano— hacía desaparecer el Pro recién comprado hasta la siguiente
     * vuelta. No abre nada que no estuviera ya abierto: al arrancar la app la
     * lista empieza vacía, así que sin respuesta del servidor no se concede
     * nada.
     */
    if (filas) {
      setLista(filas);
      setFallos(0);
    } else {
      setFallos((n) => n + 1);
    }
    setCargado(true);
  }, [sesion]);

  useEffect(() => {
    refresca();
    const reloj = setInterval(refresca, CADA);
    return () => clearInterval(reloj);
  }, [refresca]);

  // Mientras la consulta siga fallando se insiste cada pocos segundos. El
  // contador sube en cada intento fallido, y eso es lo que vuelve a disparar
  // este efecto: con un booleano solo se habría reintentado una vez.
  useEffect(() => {
    if (!fallos) return;
    const espera = setTimeout(refresca, SI_FALLA);
    return () => clearTimeout(espera);
  }, [fallos, refresca]);

  const libres = useMemo(() => ligasDesbloqueadas(lista), [lista]);

  const tieneAcceso = useCallback(
    (competicionId: string) => {
      // Las gratuitas se ven siempre, se haya pagado o no.
      if (competicionOpcional(competicionId)?.gratis) return true;
      return libres.has('*') || libres.has(competicionId);
    },
    [libres],
  );

  /*
   * `lista` ya viene sin lo caducado, así que basta con que traiga algo. El
   * periodo se toma del primer derecho: hoy solo se vende un plan a la vez.
   */
  const pro = lista.length > 0;
  const periodo = lista[0]?.periodo ?? null;
  // Basta con que falle uno: lo que importa es avisar de que hay un cobro roto.
  const cobroFallido = lista.some((d) => d.cobro_fallido);
  const caducaEl = lista[0]?.caduca ?? null;
  /*
   * Los huecos viven en la fila `elegidas`, la del plan parcial.
   *
   * Con el plan completo no cuentan, aunque la fila siga en la tabla: quien
   * pasa de dos ligas al de todas ya no elige nada. Sin esta comprobación, tras
   * cambiar de plan la app seguía diciendo "Pro · 2 ligas" y pidiendo escoger
   * competiciones que ya tenía todas.
   */
  const huecos = libres.has('*')
    ? 0
    : (lista.find((x) => x.competicion === 'elegidas')?.huecos ?? 0);

  const valor = useMemo<Derechos>(
    () => ({ libres, cargado, pro, periodo, cobroFallido, caducaEl, huecos, tieneAcceso, refresca }),
    [libres, cargado, pro, periodo, cobroFallido, caducaEl, huecos, tieneAcceso, refresca],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDerechos(): Derechos {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useDerechos fuera del ProveedorDerechos');
  return ctx;
}
