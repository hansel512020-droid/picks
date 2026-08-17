import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Pulsable, Txt } from './base';
import { Icono } from './iconos';
import { competicionesVisibles } from '@/datos/competiciones';
import { useDerechos } from '@/estado/derechos';
import { C, E, R } from '@/tema';

/**
 * Avisos que el usuario tiene que ver sí o sí.
 *
 * Viven en un componente aparte porque el de cobro fallido sale en dos sitios
 * —Inicio y Perfil— y un mensaje sobre dinero duplicado a mano acaba diciendo
 * cosas distintas en cada pantalla.
 */

/**
 * "Tienes 2 ligas · Cambia al plan completo".
 *
 * Para quien compró un plan parcial. Va donde el de cobro fallido y con la
 * misma forma —flotante abajo y con equis— porque es el mismo tipo de mensaje:
 * algo sobre tu plan que conviene que veas, pero que no debe secuestrarte la
 * pantalla.
 *
 * Cede el sitio al de cobro fallido: si a alguien no le han podido cobrar, eso
 * es lo urgente y no una oferta para gastar más.
 */
/** Cuántas competiciones tiene la app con datos: el contraste del mensaje. */
const NUM_COMPETICIONES = competicionesVisibles().length;

export function AvisoCambiaDePlan({ flotante }: { flotante?: boolean }) {
  const { pro, huecos, periodo, cobroFallido } = useDerechos();
  const [cerrado, setCerrado] = useState(false);

  /*
   * Sale con cualquier plan, no solo con los parciales.
   *
   * Antes solo aparecía si había huecos, y quien tenía el plan completo se
   * quedaba sin ninguna forma visible de cambiar de periodo o bajar de plan: la
   * única salida era cancelar. Cambiar lo que pagas tiene que estar siempre a
   * la vista de quien paga.
   */
  if (!pro || cobroFallido || cerrado) return null;

  const detalle = huecos
    ? `Tienes ${huecos} de ${NUM_COMPETICIONES} competiciones. Pasa al plan completo y deja de elegir.`
    : `Tienes todas las competiciones${periodo ? ` con el plan ${periodo}` : ''}. Cambia de periodo cuando quieras.`;

  const tarjeta = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: E.sm,
        borderRadius: R.lg,
        padding: E.md,
        backgroundColor: flotante ? C.carta : C.limaTenue,
        borderWidth: 1,
        borderColor: C.lima,
        ...(flotante
          ? {
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }
          : null),
      }}
    >
      <Pulsable onPress={() => router.push('/pro')} style={{ flex: 1, gap: 4 }}>
        <Txt v="pequenoFuerte" color={C.lima}>
          Cambiar de plan
        </Txt>
        <Txt v="mini" color={C.texto2}>
          {detalle}
        </Txt>
      </Pulsable>

      {flotante ? (
        <Pulsable onPress={() => setCerrado(true)} hitSlop={12}>
          <Icono nombre="cruz" tam={14} color={C.texto3} />
        </Pulsable>
      ) : null}
    </View>
  );

  if (!flotante) return <View style={{ paddingHorizontal: E.lg }}>{tarjeta}</View>;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: E.md,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: E.lg,
      }}
    >
      {tarjeta}
    </View>
  );
}

/**
 * "No se ha podido cobrar tu suscripción".
 *
 * Sale **solo cuando PayPal ha intentado cobrar y no ha podido**, nunca cuando
 * el usuario se da de baja él mismo. Al principio se mezclaban los dos casos y
 * a quien cancelaba le saltaba una alarma roja diciéndole que no se le había
 * podido cobrar: falso y además alarmante.
 *
 * Aparece mientras al usuario **todavía le queda acceso**, que es cuando aún
 * puede arreglarlo. Sin esto, los candados le volvían un día cualquiera sin una
 * palabra: había pagado, de pronto ya no, y sin forma de saber por qué.
 *
 * `flotante` lo pone sobre el contenido y con una equis para cerrarlo, que es
 * como va en Inicio: ahí el usuario viene a mirar picks, no a que le tapen la
 * pantalla. El cierre dura lo que la app esté abierta y vuelve a salir al
 * siguiente arranque — es una deuda con fecha límite, no una notificación
 * cualquiera, y desaparecer para siempre de un toque sería un flaco favor.
 */
export function AvisoCobroFallido({ flotante }: { flotante?: boolean }) {
  const { pro, cobroFallido, caducaEl } = useDerechos();
  const [cerrado, setCerrado] = useState(false);

  if (!pro || !cobroFallido || cerrado) return null;

  const hasta = caducaEl
    ? new Date(caducaEl).toLocaleDateString('es', { day: 'numeric', month: 'long' })
    : null;

  const tarjeta = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: E.sm,
        borderRadius: R.lg,
        padding: E.md,
        backgroundColor: flotante ? C.carta : C.rojoTenue,
        borderWidth: 1,
        borderColor: C.rojo,
        // Flotando hay que despegarlo del fondo, o se lee como parte de la lista.
        ...(flotante
          ? {
              shadowColor: '#000',
              shadowOpacity: 0.35,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }
          : null),
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Txt v="pequenoFuerte" color={C.rojo}>
          No se ha podido cobrar tu suscripción
        </Txt>
        <Txt v="mini" color={C.texto2}>
          {hasta
            ? `Mantienes el acceso hasta el ${hasta}. Revisa tu cuenta de PayPal para no perderlo.`
            : 'Revisa el método de pago en tu cuenta de PayPal para no perder el acceso.'}
        </Txt>
      </View>

      {flotante ? (
        <Pulsable onPress={() => setCerrado(true)} hitSlop={12}>
          <Icono nombre="cruz" tam={14} color={C.texto3} />
        </Pulsable>
      ) : null}
    </View>
  );

  if (!flotante) return <View style={{ paddingHorizontal: E.lg }}>{tarjeta}</View>;

  return (
    <View
      // `pointerEvents="box-none"` para que la capa no se coma los toques de lo
      // que hay debajo: solo debe capturarlos la propia tarjeta.
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        // Abajo, no arriba: arriba tapa la cabecera y el carrusel de partidos,
        // que es lo primero que se viene a mirar. Con un hueco para no pegarse
        // a la barra de pestañas.
        bottom: E.md,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: E.lg,
      }}
    >
      {tarjeta}
    </View>
  );
}
