import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Txt } from './base';
import { C, E } from '@/tema';

/**
 * Botón de suscripción de PayPal.
 *
 * El código que da PayPal en su panel crea la suscripción y ya está: no dice
 * quién la compró. Aquí se añade `custom_id` con
 * `usuarioId|competicion|periodo`, que PayPal devuelve intacto en cada aviso
 * del webhook. Sin eso, el pago entra pero la Edge Function no sabe a quién
 * darle el acceso — es la pieza que une el cobro con la cuenta.
 *
 * Solo funciona en web. En iOS y Android los pagos in-app tienen que pasar por
 * Apple y Google, que es otra historia y otro código.
 */

const CLIENTE = process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID;

/**
 * Dónde se apunta la suscripción que está a medias.
 *
 * El identificador se guarda **al crearla**, antes de que el usuario se vaya a
 * la ventana de PayPal, y no al volver. La diferencia importa: si cierra esa
 * ventana un segundo antes de tiempo, `onApprove` no llega a dispararse y sin
 * esta nota nadie sabría qué suscripción confirmar. Ha pasado: el pago quedó
 * aprobado en PayPal y la app no se enteró, con el usuario mirando una pantalla
 * que no cambiaba.
 */
const PENDIENTE = 'scout-picks/suscripcion-pendiente';

function apunta(id: string) {
  try {
    localStorage.setItem(PENDIENTE, id);
  } catch {
    // Si el navegador no deja guardar, se sigue: queda el webhook de red.
  }
}

function pendiente(): string | null {
  try {
    return localStorage.getItem(PENDIENTE);
  } catch {
    return null;
  }
}

function olvida() {
  try {
    localStorage.removeItem(PENDIENTE);
  } catch {
    /* nada que hacer */
  }
}

/** Carga el SDK una sola vez, aunque haya varios botones en la pantalla. */
let cargando: Promise<void> | null = null;

function cargaSdk(): Promise<void> {
  if (typeof window === 'undefined' || !CLIENTE) return Promise.reject();
  if ((window as any).paypal) return Promise.resolve();
  if (cargando) return cargando;

  cargando = new Promise((listo, falla) => {
    const s = document.createElement('script');
    // `vault=true&intent=subscription` es obligatorio para suscripciones.
    s.src = `https://www.paypal.com/sdk/js?client-id=${CLIENTE}&vault=true&intent=subscription`;
    s.onload = () => listo();
    s.onerror = () => falla();
    document.body.appendChild(s);
  });
  return cargando;
}

/**
 * Le pide al servidor que confirme la suscripción con PayPal.
 *
 * Esto no concede nada por sí solo: manda un identificador y la sesión, y es la
 * Edge Function quien pregunta a PayPal y decide. Por eso se puede llamar desde
 * el navegador sin regalar el plan a quien lo dispare desde la consola.
 *
 * Devuelve el código con el que contestó el servidor, no un sí o un no: quien
 * llama necesita distinguir "todavía no" —hay que reintentar— de "esta
 * suscripción no va a conceder nunca", y con un booleano las dos cosas eran
 * indistinguibles. `0` es que no se pudo ni preguntar.
 */
async function confirmaEnServidor(subscriptionID: string, token: string): Promise<number> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) return 0;
  try {
    const r = await fetch(`${url}/functions/v1/paypal-confirma`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionID }),
    });
    const cuerpo = await r.text();
    // La respuesta queda en la consola del navegador. La función dice en el
    // cuerpo en qué punto se plantó —sesión, PayPal, plan o escritura—, y sin
    // esta línea hay que ir a los registros del servidor para verlo.
    console.log('[paypal] confirma ->', r.status, cuerpo);

    /*
     * Solo un 200 concede el acceso.
     *
     * El 202 —la suscripción existe pero aún no está activa— también pasaba el
     * `r.ok`, así que la app daba la compra por buena: refrescaba unos derechos
     * que nadie había escrito y salía de la pantalla sin avisar. El usuario
     * había pagado y no veía ni el acceso ni el mensaje de que faltaba
     * activarlo, que es justo el caso que este camino venía a resolver.
     */
    return r.status;
  } catch (e) {
    console.log('[paypal] confirma: fallo de red', e);
    return 0;
  }
}

/** Un `202` es "aún no"; un 400, 403 o 404 no van a cambiar por insistir. */
function noVaAConceder(estado: number): boolean {
  return estado === 400 || estado === 403 || estado === 404;
}

export function BotonPaypal({
  planId,
  usuarioId,
  token,
  competicion,
  periodo,
  onComprado,
}: {
  planId: string;
  usuarioId: string;
  /** La sesión de quien compra: el servidor comprueba con ella quién es. */
  token: string;
  /** `todas`, `elegidas` o el id de una competición concreta. */
  competicion: string;
  /*
   * Va en el `custom_id` solo como referencia para leer los avisos de PayPal.
   * No decide nada: lo que se concede sale de la tabla `PLANES` del servidor,
   * a partir del plan que PayPal cobró de verdad.
   */
  periodo: string;
  /** `confirmado` dice si el acceso ya está concedido o si habrá que esperar. */
  onComprado: (confirmado: boolean) => void;
}) {
  const caja = useRef<View | null>(null);
  const [error, setError] = useState<string | null>(null);

  /*
   * El token y el aviso de compra van por referencia, no por dependencia.
   *
   * `onComprado` se crea nueva en cada render de la pantalla, y el token cambia
   * cada vez que se renueva la sesión. Teniéndolos en las dependencias, el
   * efecto se rehacía constantemente: el botón de PayPal se destruía y se
   * volvía a montar sin parar, y el SDK acababa lanzando
   * `paypal_js_sdk_v5_unhandled_exception`. El botón se monta una vez y lee el
   * valor de ahora cuando le hace falta.
   */
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const onCompradoRef = useRef(onComprado);
  onCompradoRef.current = onComprado;

  useEffect(() => {
    if (Platform.OS !== 'web' || !CLIENTE) return;
    let vivo = true;

    cargaSdk()
      .then(() => {
        if (!vivo || !caja.current) return;
        const nodo = caja.current as unknown as HTMLElement;
        nodo.innerHTML = '';

        (window as any).paypal
          .Buttons({
            style: { shape: 'rect', color: 'gold', layout: 'vertical', label: 'subscribe' },
            createSubscription: async (_: unknown, acciones: any) => {
              const id = await acciones.subscription.create({
                plan_id: planId,
                // Aquí viaja quién compra y qué compra. El webhook lo lee.
                custom_id: `${usuarioId}|${competicion}|${periodo}`,
              });
              // Se apunta antes de mandar al usuario a PayPal, no después.
              apunta(id);
              return id;
            },
            onApprove: async (datos: any) => {
              /*
               * El acceso no se da aquí: este callback lo puede disparar
               * cualquiera desde la consola del navegador. Lo que se hace es
               * avisar al servidor de que hay una suscripción que mirar, y es
               * él quien le pregunta a PayPal si es real y está activa.
               *
               * Antes esto no existía y todo dependía de que PayPal nos mandara
               * el aviso del webhook. Cuando ese aviso se retrasa o se pierde,
               * el usuario ha pagado y se queda sin nada, mirando una pantalla
               * que no cambia. Ahora el camino normal es este —inmediato— y el
               * webhook queda de red de seguridad para las renovaciones y las
               * bajas, que ocurren con la app cerrada.
               */
              // Primera pista cuando no pasa nada tras pagar: si esta línea no
              // sale en la consola, el problema está antes: PayPal no llegó a
              // aprobar la suscripción y no hay nada que confirmar.
              console.log('[paypal] onApprove', datos?.subscriptionID);

              let estado = await confirmaEnServidor(datos?.subscriptionID, tokenRef.current);

              /*
               * Un 202 es "aprobada, pero PayPal todavía no la ha activado", y
               * eso se resuelve en un par de segundos. Se insiste un poco antes
               * de darla por pendiente: va la diferencia entre que el usuario
               * vea los candados abrirse ahí mismo, recién pagado, o que se
               * vaya con un "ya se activará" y tenga que volver a mirar.
               *
               * Cuatro intentos y se para. Si para entonces PayPal no la ha
               * activado, no se gana nada esperando delante de la pantalla: lo
               * recogerá el webhook, o el rescate al volver a esta pantalla.
               */
              for (let i = 0; estado === 202 && i < 4; i++) {
                await new Promise((sigue) => setTimeout(sigue, 2500));
                estado = await confirmaEnServidor(datos?.subscriptionID, tokenRef.current);
              }

              const ok = estado === 200;
              if (ok) olvida();
              else {
                setError(
                  'El pago se hizo, pero aún no se ha podido activar. Se activará solo en unos minutos.',
                );
              }
              onCompradoRef.current(ok);
            },
            onError: () => setError('No se pudo completar el pago. Inténtalo de nuevo.'),
          })
          .render(nodo);
      })
      .catch(() => setError('No se pudo cargar PayPal.'));

    return () => {
      vivo = false;
    };
  }, [planId, usuarioId, competicion, periodo]);

  /*
   * Rescate de una compra que se quedó a medias.
   *
   * Si el usuario cierra la ventana de PayPal justo después de aprobar,
   * `onApprove` nunca se ejecuta: la suscripción queda pagada y aprobada, y la
   * app no se entera. Pasó de verdad, y el único arreglo era ir a mano a la
   * base de datos.
   *
   * El identificador se apuntó al crear la suscripción, así que aquí se
   * reintenta: al abrir la pantalla, y cada vez que esta ventana recupera el
   * foco —que es exactamente lo que ocurre cuando se cierra la de PayPal—.
   *
   * Esto no regala nada: el servidor vuelve a preguntarle a PayPal si la
   * suscripción existe, está aprobada y es de quien dice la sesión.
   */
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    let mirando = false;

    const rescata = async () => {
      const id = pendiente();
      // Sin sesión no hay a quién dársela: ya se reintentará con el foco.
      if (!id || mirando || !tokenRef.current) return;

      mirando = true;
      const estado = await confirmaEnServidor(id, tokenRef.current);
      mirando = false;

      if (estado === 200) {
        olvida();
        onCompradoRef.current(true);
        return;
      }
      // Insistir con estas tres no la va a activar: se deja de arrastrar.
      if (noVaAConceder(estado)) olvida();
    };

    rescata();
    window.addEventListener('focus', rescata);
    return () => window.removeEventListener('focus', rescata);
  }, []);

  if (Platform.OS !== 'web') {
    return (
      <Txt v="pequeno" color={C.texto3}>
        La suscripción se contrata desde la web.
      </Txt>
    );
  }

  if (!CLIENTE) {
    return (
      <Txt v="pequeno" color={C.texto3}>
        Falta EXPO_PUBLIC_PAYPAL_CLIENT_ID en el .env.
      </Txt>
    );
  }

  return (
    <View style={{ gap: E.sm, alignItems: 'center' }}>
      {/*
        El SDK de PayPal pinta sus botones con el ancho que le dé el contenedor
        y los deja pegados a la izquierda. Con un ancho máximo y centrado
        quedan alineados con el resto de la pantalla en vez de descolgados en
        una esquina.
      */}
      <View ref={caja} style={{ minHeight: 50, width: '100%', maxWidth: 420 }} />
      {error ? (
        <Txt v="pequeno" color={C.rojo} style={{ textAlign: 'center' }}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}
