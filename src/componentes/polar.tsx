import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Boton, Txt } from './base';
import { C, E } from '@/tema';

/**
 * Pago con Polar: tarjeta desde cualquier país.
 *
 * Payphone solo cobra en Ecuador; Polar cobra en todo el mundo y se encarga de
 * los impuestos de cada país. Se vende lo mismo y de la misma forma que con
 * Payphone —un pago único por el periodo, sin renovación—, así que el resto de
 * la app no distingue por dónde se pagó.
 *
 * ── Cómo va un cobro ────────────────────────────────────────────────────────
 *
 *   1. Se le pide al servidor una sesión de pago (el precio y el token son
 *      cosa del servidor) y se manda al usuario a la página de Polar.
 *   2. Polar lo devuelve a `/pro?pago=polar&checkout_id=…`.
 *   3. `useVueltaDePolar` le pide al servidor que confirme; el servidor le
 *      pregunta a Polar y solo entonces concede.
 *
 * Si la vuelta falla (se cierra la pestaña, se va la red), el aviso firmado
 * que Polar manda al servidor concede igual: aquí no hace falta rescatar nada.
 */

const SUPA = process.env.EXPO_PUBLIC_SUPABASE_URL;

const espera = (ms: number) => new Promise((sigue) => setTimeout(sigue, ms));

/**
 * Si el cobro con Polar está configurado en el servidor.
 *
 * Se pregunta una vez por visita. Mientras no lo esté —sin token o sin los
 * productos creados en Polar—, el botón no sale y se paga con Payphone como
 * hasta ahora. Si la pregunta falla por la red, se vuelve a hacer la próxima
 * vez en vez de dar el "no" por bueno.
 */
let listo: Promise<boolean> | null = null;

function preguntaSiEstaListo(): Promise<boolean> {
  listo ??= fetch(`${SUPA}/functions/v1/polar-crea`)
    .then(async (r) => (r.ok ? !!(await r.json())?.listo : false))
    .catch(() => {
      listo = null;
      return false;
    });
  return listo;
}

export function usePolarListo(): boolean {
  const [si, setSi] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web' || !SUPA) return;
    let vivo = true;
    void preguntaSiEstaListo().then((v) => {
      if (vivo) setSi(v);
    });
    return () => {
      vivo = false;
    };
  }, []);
  return si;
}

/**
 * Le pide al servidor que confirme el pago con Polar.
 *
 * Devuelve el código con el que contestó —200 concedido, 202 "aún no",
 * 400/402/403/404 "esto no va a conceder", `0` no se pudo ni preguntar— y el
 * plan que se concedió.
 */
async function confirmaEnServidor(
  checkout: string,
  token: string,
): Promise<{ estado: number; plan?: string }> {
  try {
    const r = await fetch(`${SUPA}/functions/v1/polar-confirma`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkout }),
    });
    const cuerpo = await r.json().catch(() => null);
    console.log('[polar] confirma ->', r.status, cuerpo);
    return { estado: r.status, plan: typeof cuerpo?.plan === 'string' ? cuerpo.plan : undefined };
  } catch (e) {
    console.log('[polar] confirma: fallo de red', e);
    return { estado: 0 };
  }
}

/**
 * Al volver de Polar: confirma el pago y avisa si quedó concedido.
 *
 * Va aparte del botón y en la pantalla de Pro entera: al volver, el plan que
 * sale marcado puede ser justo el que ya tenías, y entonces el botón no se
 * pinta. Si la confirmación dependiera de él, no se haría.
 */
export function useVueltaDePolar(
  token: string | undefined,
  /** Con el plan concedido: los de ligas a elegir van después a "Mis ligas". */
  onComprado: (plan: string | undefined) => void,
): { confirmando: boolean; mensaje: string | null } {
  const [confirmando, setConfirmando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const onCompradoRef = useRef(onComprado);
  onCompradoRef.current = onComprado;
  /*
   * El token va por referencia: se renueva solo cada cierto tiempo, y si el
   * efecto dependiera de él, una renovación a mitad de la confirmación la
   * cortaría y el botón se quedaría en "Confirmando…" para siempre. Lo único
   * que hace falta esperar es a que haya sesión.
   */
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const hayToken = !!token;
  const yaVisto = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !hayToken || !SUPA) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('pago') !== 'polar') return;
    const checkout = params.get('checkout_id');

    // Se limpia la dirección en cuanto se lee: volver a entrar a Pro no puede
    // repetir la confirmación ni el aviso.
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      /* la confirmación es idempotente: si no se limpia, no pasa nada */
    }
    if (!checkout || yaVisto.current === checkout) return;
    yaVisto.current = checkout;

    let vivo = true;
    (async () => {
      setConfirmando(true);
      setMensaje(null);
      let respuesta = await confirmaEnServidor(checkout, tokenRef.current ?? '');
      // Polar tarda unos segundos en dar por cobrado un pago recién hecho.
      for (let i = 0; (respuesta.estado === 202 || respuesta.estado === 0) && i < 8 && vivo; i++) {
        await espera(2500);
        respuesta = await confirmaEnServidor(checkout, tokenRef.current ?? '');
      }
      if (!vivo) return;
      setConfirmando(false);

      const { estado } = respuesta;
      if (estado === 200) {
        onCompradoRef.current(respuesta.plan);
        return;
      }
      if (estado === 400 || estado === 402 || estado === 403 || estado === 404) {
        setMensaje('El pago no se completó. Si se te cobró, se te devolverá; puedes intentarlo de nuevo.');
        return;
      }
      // Sin verificar todavía: el aviso de Polar lo concederá en cuanto llegue.
      setMensaje('Tu pago se está verificando. Si se cobró, tu Golden Pro se activará solo en unos minutos.');
    })();

    return () => {
      vivo = false;
    };
  }, [hayToken]);

  return { confirmando, mensaje };
}

export function BotonPolar({
  plan,
  token,
  etiqueta,
}: {
  /** El plan elegido: `semanal`, `mensual`, `anual`, `dosligas` o `tresligas`. */
  plan: string;
  /** La sesión de quien compra: el servidor comprueba con ella quién es. */
  token: string;
  etiqueta: string;
}) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function paga() {
    if (cargando) return;
    setError(null);
    setCargando(true);
    try {
      const r = await fetch(`${SUPA}/functions/v1/polar-crea`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, vuelveA: `${window.location.origin}/pro` }),
      });
      const cuerpo = await r.json().catch(() => null);
      console.log('[polar] crea ->', r.status, cuerpo);
      if (r.ok && typeof cuerpo?.url === 'string') {
        // A Polar. `cargando` se queda puesto: la página se va a reemplazar.
        window.location.href = cuerpo.url;
        return;
      }
      setError(cuerpo?.error ?? 'No se pudo iniciar el pago. Inténtalo de nuevo.');
    } catch (e) {
      console.log('[polar] crea: fallo de red', e);
      setError('No se pudo conectar con el pago. Revisa tu conexión e inténtalo de nuevo.');
    }
    setCargando(false);
  }

  return (
    <View style={{ gap: E.sm }}>
      <Boton
        ancho
        icono="mundo"
        texto={cargando ? 'Abriendo el pago…' : etiqueta}
        deshabilitado={cargando}
        onPress={paga}
      />
      {error ? (
        <Txt v="pequeno" color={C.rojo} style={{ textAlign: 'center' }}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}
