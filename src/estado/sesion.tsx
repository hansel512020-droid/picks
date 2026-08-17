import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import {
  CUENTAS_ACTIVAS,
  cierraSesion,
  renueva,
  sesionDesdeTokens,
  sesionGuardada,
  tokenSigueValido,
  type Sesion,
} from '@/datos/cuenta';

/**
 * Quien está usando la app.
 *
 * Mientras no haya servidor de cuentas configurado (`EXPO_PUBLIC_SUPABASE_*`
 * en el `.env`), la app funciona igual que antes y no pide entrar: así se
 * puede seguir desarrollando y probando sin depender de nada externo.
 */

interface Cuenta {
  sesion: Sesion | null;
  /** Falso hasta que se ha leído lo guardado en el teléfono. */
  cargada: boolean;
  /** Si hay que pasar por la pantalla de acceso. */
  exigeCuenta: boolean;
  entra: (s: Sesion) => void;
  sal: () => Promise<void>;
}

const Contexto = createContext<Cuenta | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargada, setCargada] = useState(false);

  /*
   * Renovación del token, en segundo plano.
   *
   * El de acceso dura una hora. Pasada esa hora la app seguía enseñando al
   * usuario como conectado, pero Supabase respondía 401 a todo: los picks no
   * subían y los derechos de Pro no se podían leer, así que los candados
   * seguían cerrados aunque hubiera pagado. Y sin ningún aviso, porque un 401
   * se estaba tratando como "no hay nada".
   *
   * Se comprueba cada minuto y se cambia cuando le quedan menos de cinco, que
   * da margen aunque el reloj del dispositivo vaya algo desviado. También al
   * volver a la ventana: con el portátil suspendido no corren los relojes, y
   * al despertar el token puede llevar horas muerto.
   */
  useEffect(() => {
    if (!sesion) return;

    const revisa = async (aFondo: boolean) => {
      const caducadoPorReloj = sesion.caduca - Date.now() <= 5 * 60_000;

      /*
       * El reloj guardado es solo la primera señal, y miente: un token se
       * queda muerto antes de tiempo si la sesión se cerró en otro sitio o si
       * el refresco ya se consumió. Entonces `caduca` decía que quedaba media
       * hora mientras Supabase respondía 401 a todo, y como esta revisión
       * salía por la puerta de atrás, nadie lo arreglaba nunca.
       *
       * Por eso en las revisiones a fondo —al abrir y al volver a la ventana—
       * se le pregunta al servidor. Cada minuto sería gastar por gusto.
       */
      const rechazado =
        aFondo && !caducadoPorReloj ? !(await tokenSigueValido(sesion.token)) : false;

      if (!caducadoPorReloj && !rechazado) return;

      const nueva = sesion.refresco ? await renueva(sesion.refresco) : null;
      if (nueva) {
        setSesion(nueva);
        return;
      }

      /*
       * No se ha podido renovar. Mientras al token le quede validez no se hace
       * nada: puede ser un corte de red de un segundo, y echar al usuario por
       * eso sería peor que reintentar dentro de un minuto.
       *
       * Pero una vez caducado, dejarlo "dentro" es la peor de las opciones.
       * Antes se salía sin más —`if (!sesion?.refresco) return`— y una sesión
       * sin token de refresco no se renovaba jamás: la app seguía enseñando al
       * usuario como conectado mientras Supabase respondía 401 a todo. Los
       * picks no subían, los derechos no se leían, y no aparecía ni un aviso.
       * Es mejor pedirle que entre otra vez que fingir que sigue dentro.
       *
       * Solo se cierra si consta que el token está muerto: o el reloj dice que
       * ya caducó, o el servidor lo ha rechazado a la cara. Un fallo de red no
       * cuenta —`tokenSigueValido` responde `true` cuando no puede preguntar—.
       */
      if (sesion.caduca <= Date.now() || rechazado) {
        await cierraSesion(sesion.token);
        setSesion(null);
      }
    };

    revisa(true);
    const reloj = setInterval(() => revisa(false), 60_000);

    const alVolver = () => {
      revisa(true);
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', alVolver);
    }

    return () => {
      clearInterval(reloj);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('focus', alVolver);
      }
    };
  }, [sesion]);

  useEffect(() => {
    (async () => {
      /*
       * Vuelta de Google en el navegador.
       *
       * En web no hay ventana emergente que devuelva la respuesta: el proveedor
       * redirige a la propia página y la app se recarga de cero, con los tokens
       * colgando de la dirección en `#access_token=...`. Si no se recogen aquí,
       * al arrancar, se pierden y el usuario vuelve a la pantalla de acceso
       * como si no hubiera entrado — que es justo lo que pasaba.
       *
       * Después se limpia la barra de direcciones: un token de acceso a la
       * vista se copia, se comparte y acaba en el historial del navegador.
       */
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const acceso = params.get('access_token');
        if (acceso) {
          const s = await sesionDesdeTokens(acceso, params.get('refresh_token') ?? undefined);
          window.history.replaceState(null, '', window.location.pathname);
          if (s) {
            setSesion(s);
            setCargada(true);
            return;
          }
        }
      }

      setSesion(await sesionGuardada());
      setCargada(true);
    })();
  }, []);

  const entra = useCallback((s: Sesion) => setSesion(s), []);

  const sal = useCallback(async () => {
    await cierraSesion(sesion?.token);
    setSesion(null);
  }, [sesion?.token]);

  const valor = useMemo<Cuenta>(
    () => ({ sesion, cargada, exigeCuenta: CUENTAS_ACTIVAS && !sesion, entra, sal }),
    [sesion, cargada, entra, sal],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): Cuenta {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useSesion fuera del ProveedorSesion');
  return ctx;
}
