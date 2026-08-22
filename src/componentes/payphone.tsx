import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Boton, Txt } from './base';
import { C, E } from '@/tema';

/**
 * Botón de pago de Payphone.
 *
 * ── En qué se diferencia de PayPal ──────────────────────────────────────────
 *
 * PayPal cobraba una suscripción que se renovaba sola, y por eso había que
 * poder darla de baja. Payphone cobra **una sola vez**: el servidor concede el
 * acceso con fecha de caducidad y, cuando esa fecha llega, se cierra solo. No
 * vuelve a cobrar nunca por su cuenta, así que no hay nada que cancelar —y el
 * usuario no se lleva un cargo sorpresa al mes siguiente—.
 *
 * ── Cómo va un cobro ────────────────────────────────────────────────────────
 *
 *   1. Se le pide al servidor un enlace de pago (nunca al navegador: el precio
 *      y el token son cosa del servidor).
 *   2. Se manda al usuario a Payphone con `window.location.href`.
 *   3. Payphone lo devuelve a esta misma pantalla (`/pro`) con dos datos en la
 *      dirección: `id` (el pago) y `clientTransactionId` (nuestra referencia).
 *   4. Con esos dos, se le pide al servidor que confirme. El servidor le
 *      pregunta a Payphone si el cobro es real y solo entonces concede.
 *
 * Todo esto solo tiene sentido en web: en la app nativa los pagos in-app pasan
 * por Apple y Google, que es otra historia. Como Golden Picks se usa desde el
 * navegador (también en el móvil), con la web basta.
 */

const SUPA = process.env.EXPO_PUBLIC_SUPABASE_URL;

/**
 * Dónde se apunta la referencia de un pago que está a medias.
 *
 * Se guarda al crear el enlace, antes de mandar al usuario a Payphone. Sirve de
 * rastro por si algo se tuerce: la confirmación de verdad necesita el `id` que
 * Payphone añade a la dirección de vuelta, así que el rescate real vive en esos
 * parámetros, no aquí. Esto es solo para saber que había un pago en marcha.
 */
const PENDIENTE = 'golden-picks/pago-payphone';

function apunta(ref: string) {
  try {
    localStorage.setItem(PENDIENTE, ref);
  } catch {
    // Si el navegador no deja guardar, se sigue: el parámetro de la vuelta manda.
  }
}

function olvida() {
  try {
    localStorage.removeItem(PENDIENTE);
  } catch {
    /* nada que hacer */
  }
}

/** La referencia del pago que este navegador dejó a medias, si la hay. */
function pendiente(): string | null {
  try {
    return localStorage.getItem(PENDIENTE);
  } catch {
    return null;
  }
}

const espera = (ms: number) => new Promise((sigue) => setTimeout(sigue, ms));

/** Quita los parámetros del pago de la barra de direcciones, sin recargar. */
function limpiaUrl() {
  try {
    window.history.replaceState(null, '', window.location.pathname);
  } catch {
    /* si el navegador no deja, no pasa nada: la confirmación es idempotente */
  }
}

/**
 * Le pide al servidor que confirme el pago con Payphone.
 *
 * No concede nada por sí sola: manda los dos identificadores y la sesión, y es
 * la Edge Function quien le pregunta a Payphone y decide. Por eso se puede
 * llamar desde el navegador sin regalar el plan a quien la dispare a mano.
 *
 * Devuelve el código con el que contestó el servidor, no un sí/no: hace falta
 * distinguir el "todavía no" (202, se reintenta) del "esto no va a conceder
 * nunca" (400/402/403/404). `0` es que no se pudo ni preguntar.
 */
async function confirmaEnServidor(
  id: string,
  referencia: string,
  token: string,
): Promise<number> {
  if (!SUPA) return 0;
  try {
    const r = await fetch(`${SUPA}/functions/v1/payphone-confirma`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, referencia }),
    });
    const cuerpo = await r.text();
    // La respuesta queda en la consola: la función dice en el cuerpo en qué
    // punto se plantó, y sin esto habría que ir a los registros del servidor.
    console.log('[payphone] confirma ->', r.status, cuerpo);
    return r.status;
  } catch (e) {
    console.log('[payphone] confirma: fallo de red', e);
    return 0;
  }
}

/** Un 202 es "aún no"; un 400, 402, 403 o 404 no cambian por insistir. */
function noVaAConceder(estado: number): boolean {
  return estado === 400 || estado === 402 || estado === 403 || estado === 404;
}

export function BotonPayphone({
  plan,
  token,
  etiqueta,
  onComprado,
}: {
  /** El plan elegido: `semanal`, `mensual`, `anual`, `dosligas` o `tresligas`. */
  plan: string;
  /** La sesión de quien compra: el servidor comprueba con ella quién es. */
  token: string;
  /** Texto del botón, p. ej. "Pagar $17.99". */
  etiqueta: string;
  /** `confirmado` dice si el acceso ya quedó concedido o si habrá que esperar. */
  onComprado: (confirmado: boolean) => void;
}) {
  const [cargando, setCargando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * El token y el aviso de compra van por referencia, no por dependencia: el
   * token cambia cada vez que se renueva la sesión y `onComprado` se crea nueva
   * en cada render, y no queremos rehacer el efecto de la vuelta por eso.
   */
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const onCompradoRef = useRef(onComprado);
  onCompradoRef.current = onComprado;

  /*
   * Al volver de Payphone.
   *
   * El usuario aterriza en `/pro?id=…&clientTransactionId=…`. Se leen esos dos
   * datos y se confirma. El efecto depende del token porque la sesión tarda un
   * instante en hidratarse tras la redirección: mientras no hay token no se
   * puede confirmar, así que se espera a tenerlo. `yaVisto` evita procesar dos
   * veces la misma referencia si el token cambia.
   */
  const yaVisto = useRef<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !token) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') ?? params.get('Id');
    const referencia = params.get('clientTransactionId') ?? params.get('clientTxId');
    if (!id || !referencia) return;

    /*
     * Se limpia la dirección en cuanto se leen los datos.
     *
     * Antes solo se limpiaba al confirmar bien, así que un pago cancelado —o
     * cualquier vuelta a medias— dejaba los parámetros pegados y CADA vez que
     * se entraba a /pro se reintentaba y reaparecía el aviso de "el pago se
     * hizo". Se limpia ya: los datos ya están leídos y no hacen falta más.
     */
    limpiaUrl();
    if (yaVisto.current === referencia) return;
    yaVisto.current = referencia;

    /*
     * Solo se procesa la vuelta si este mismo navegador inició el pago (guardó
     * la referencia al crear el enlace). Si no coincide, son parámetros viejos
     * o de otro dispositivo: no se confirma nada ni se enseña ningún aviso
     * —que es lo que hacía saltar "el pago se hizo" a quien solo entró y salió—.
     * Los pagos que este navegador no vio los recoge el respaldo del servidor.
     */
    if (pendiente() !== referencia) return;

    let vivo = true;
    (async () => {
      setConfirmando(true);
      setError(null);

      let estado = await confirmaEnServidor(id, referencia, token);
      /*
       * Un 202 es "el pago existe, pero aún no se pudo verificar". Se insiste un
       * poco: va la diferencia entre que el usuario vea los candados abrirse
       * recién pagado o que se vaya con un "ya se activará".
       */
      for (let i = 0; estado === 202 && i < 4 && vivo; i++) {
        await espera(2500);
        estado = await confirmaEnServidor(id, referencia, token);
      }
      if (!vivo) return;
      setConfirmando(false);

      if (estado === 200) {
        olvida();
        onCompradoRef.current(true);
        return;
      }

      if (noVaAConceder(estado)) {
        // El pago no salió o no era de esta cuenta.
        olvida();
        setError('El pago no se pudo completar. Si se te cobró, se te devolverá; puedes intentarlo de nuevo.');
        onCompradoRef.current(false);
        return;
      }

      /*
       * 202 tras los reintentos, 500 o fallo de red: no se pudo verificar
       * ahora. Se deja el rastro (`pendiente`) para que el respaldo del
       * servidor lo confirme, y se avisa sin afirmar un pago que no consta.
       */
      setError('Tu pago se está verificando. Si se cobró, el acceso se activará solo en unos minutos.');
      onCompradoRef.current(false);
    })();

    return () => {
      vivo = false;
    };
  }, [token]);

  /** Crea el enlace de pago en el servidor y manda al usuario a Payphone. */
  async function paga() {
    if (cargando || confirmando) return;
    setError(null);
    setCargando(true);
    try {
      // A dónde vuelve el usuario tras pagar. Tiene que ser el dominio que está
      // dado de alta en Payphone; el servidor comprueba que sea de los nuestros.
      const vuelveA = `${window.location.origin}/pro`;
      const r = await fetch(`${SUPA}/functions/v1/payphone-crea`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, vuelveA }),
      });
      const cuerpo = await r.json().catch(() => null);
      console.log('[payphone] crea ->', r.status, cuerpo);

      const destino = typeof cuerpo?.url === 'string' ? cuerpo.url : null;
      if (r.ok && destino) {
        apunta(String(cuerpo.referencia ?? ''));
        // Nos vamos a Payphone. No se apaga `cargando`: la página se va a
        // reemplazar entera, y así el botón no vuelve a quedar activo un instante.
        window.location.href = destino;
        return;
      }

      setError(cuerpo?.error ?? 'No se pudo iniciar el pago. Inténtalo de nuevo.');
      setCargando(false);
    } catch (e) {
      console.log('[payphone] crea: fallo de red', e);
      setError('No se pudo conectar con el pago. Revisa tu conexión e inténtalo de nuevo.');
      setCargando(false);
    }
  }

  if (Platform.OS !== 'web') {
    return (
      <Txt v="pequeno" color={C.texto3}>
        La suscripción se contrata desde la web.
      </Txt>
    );
  }

  if (!SUPA) {
    return (
      <Txt v="pequeno" color={C.texto3}>
        Falta EXPO_PUBLIC_SUPABASE_URL en el .env.
      </Txt>
    );
  }

  return (
    <View style={{ gap: E.sm }}>
      <Boton
        ancho
        icono="moneda"
        texto={cargando ? 'Abriendo el pago…' : confirmando ? 'Confirmando tu pago…' : etiqueta}
        deshabilitado={cargando || confirmando}
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
