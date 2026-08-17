import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Insignia, Pulsable, Tarjeta, Txt } from '@/componentes/base';
import { Icono } from '@/componentes/iconos';
import { Simbolo } from '@/componentes/marca';
import { BotonPaypal } from '@/componentes/paypal';
import { COMPETICIONES, competicionesVisibles } from '@/datos/competiciones';
import { planDePaypal } from '@/datos/planes';
import { useDerechos } from '@/estado/derechos';
import { useSesion } from '@/estado/sesion';
import { useTienda, type Plan } from '@/estado/tienda';
import { C, E, R } from '@/tema';

/** Pantalla de suscripcion con los planes de Golden Pro. */

interface Oferta {
  id: Plan;
  titulo: string;
  precio: string;
  periodo: string;
  detalle: string;
  ahorro?: string;
}

const COMPLETOS: Oferta[] = [
  {
    id: 'anual',
    titulo: 'Todas las ligas · Anual',
    precio: '$99.99',
    periodo: 'al año',
    detalle: 'Sale a $8.33 al mes',
    // 99,99 frente a 17,99 × 12 = 215,88. El porcentaje se recalcula cada vez
    // que cambian los precios: anunciar un ahorro que no sale es publicidad
    // engañosa, y aquí es fácil olvidarse.
    ahorro: 'AHORRAS UN 54%',
  },
  {
    id: 'mensual',
    titulo: 'Todas las ligas · Mensual',
    precio: '$17.99',
    periodo: 'al mes',
    detalle: 'Cancela cuando quieras',
  },
  {
    id: 'semanal',
    titulo: 'Todas las ligas · Semanal',
    precio: '$5.99',
    periodo: 'a la semana',
    detalle: 'Para una jornada concreta',
  },
];

const PARCIALES: Oferta[] = [
  {
    id: 'dosligas',
    titulo: '2 ligas a elegir',
    precio: '$1.99',
    periodo: 'al mes',
    detalle: 'Eliges dos competiciones',
  },
  {
    id: 'tresligas',
    titulo: '3 ligas a elegir',
    precio: '$2.99',
    periodo: 'al mes',
    detalle: 'Eliges tres competiciones',
  },
  /*
   * Aquí había un "Pase Mundial". Fuera: no hay Mundial en marcha, y vender un
   * pase para un torneo que no se está jugando —y del que la app ni siquiera
   * tiene datos ahora mismo— es cobrar por nada. Cuando vuelva a haber
   * Mundial se añade otra vez, con sus fechas.
   */
];

const VENTAJAS: { icono: Parameters<typeof Icono>[0]['nombre']; texto: string }[] = [
  { icono: 'rayo', texto: 'Todos los picks con ventaja de cada partido' },
  { icono: 'usuario', texto: 'Jugadores y equipos de las ligas bloqueadas' },
  // Se cuentan las descargadas, no el catálogo entero: prometer 61 cuando
  // la mitad no tiene datos es vender humo.
  { icono: 'mundo', texto: `Las ${competicionesVisibles().length} competiciones con datos, no solo las 4 gratis` },
  { icono: 'filtro', texto: 'Filtros avanzados y cortes por contexto' },
  { icono: 'camiseta', texto: 'Alineaciones probables, bajas y sustituciones' },
  { icono: 'grafico', texto: '30+ métricas por jugador y partido' },
  { icono: 'moneda', texto: 'Precios de mercado y comparación por margen' },
];

function TarjetaPlan({
  oferta,
  activo,
  onPress,
}: {
  oferta: Oferta;
  activo: boolean;
  onPress: () => void;
}) {
  return (
    <Pulsable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: E.md,
          padding: E.md,
          borderRadius: R.lg,
          borderWidth: 1.5,
          borderColor: activo ? C.lima : C.borde,
          backgroundColor: activo ? C.limaTenue : C.carta,
        }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: activo ? C.lima : C.borde,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {activo ? (
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.lima }} />
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Txt v="cuerpoFuerte">{oferta.titulo}</Txt>
            {oferta.ahorro ? (
              <Insignia texto={oferta.ahorro} color={C.lima} fondo={C.limaTenue} />
            ) : null}
          </View>
          <Txt v="mini" color={C.texto3}>
            {oferta.detalle}
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt v="subtitulo">{oferta.precio}</Txt>
          <Txt v="mini" color={C.texto3}>
            {oferta.periodo}
          </Txt>
        </View>
      </View>
    </Pulsable>
  );
}

export default function Pro() {
  const { plan } = useTienda();
  const { sesion } = useSesion();
  const { refresca: refrescaDerechos } = useDerechos();
  const insets = useSafeAreaInsets();
  const [elegido, setElegido] = useState<Plan>('anual');
  // El plan de PayPal que corresponde a la oferta elegida, si existe.
  const paypal = planDePaypal(elegido);

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + E.lg,
          paddingBottom: E.xxxl,
          gap: E.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: E.lg, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pulsable
            onPress={() => router.back()}
            hitSlop={10}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.carta,
            }}
          >
            <Icono nombre="cruz" tam={15} color={C.texto2} />
          </Pulsable>
        </View>

        <View style={{ alignItems: 'center', gap: E.sm, paddingHorizontal: E.xl }}>
          <Simbolo tam={52} />
          <Txt v="display" style={{ textAlign: 'center' }}>
            Golden <Txt v="display" color={C.lima}>Pro</Txt>
          </Txt>
          <Txt v="cuerpo" color={C.texto2} style={{ textAlign: 'center' }}>
            Todo el análisis, todas las competiciones, sin límites.
          </Txt>
        </View>

        <Tarjeta style={{ marginHorizontal: E.lg, padding: E.md, gap: E.md }}>
          {VENTAJAS.map((v) => (
            <View key={v.texto} style={{ flexDirection: 'row', alignItems: 'center', gap: E.md }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: C.limaTenue,
                }}
              >
                <Icono nombre={v.icono} tam={15} color={C.lima} />
              </View>
              <Txt v="pequeno" color={C.texto} style={{ flex: 1 }}>
                {v.texto}
              </Txt>
            </View>
          ))}
        </Tarjeta>

        <View style={{ paddingHorizontal: E.lg, gap: E.sm }}>
          <Txt v="pequenoFuerte" color={C.texto3}>
            TODAS LAS COMPETICIONES
          </Txt>
          {COMPLETOS.map((o) => (
            <TarjetaPlan
              key={o.id}
              oferta={o}
              activo={elegido === o.id}
              onPress={() => setElegido(o.id)}
            />
          ))}
        </View>

        <View style={{ paddingHorizontal: E.lg, gap: E.sm }}>
          <Txt v="pequenoFuerte" color={C.texto3}>
            PLANES MÁS PEQUEÑOS
          </Txt>
          {PARCIALES.map((o) => (
            <TarjetaPlan
              key={o.id}
              oferta={o}
              activo={elegido === o.id}
              onPress={() => setElegido(o.id)}
            />
          ))}
        </View>

        <View style={{ paddingHorizontal: E.lg, gap: E.sm }}>
          {/*
            El botón de PayPal solo aparece si el plan elegido tiene un plan
            creado en PayPal y el usuario tiene cuenta. Sin cuenta no hay a
            quién dar el acceso: el pago llegaría sin dueño.
          */}
          {paypal && sesion ? (
            <BotonPaypal
              planId={paypal.paypalId}
              usuarioId={sesion.id}
              token={sesion.token}
              competicion={paypal.competicion}
              periodo={paypal.id}
              onComprado={async (confirmado) => {
                /*
                 * El servidor ya ha comprobado la compra con PayPal y ha
                 * escrito el derecho, así que se vuelven a leer antes de salir:
                 * si no, la pantalla anterior tarda hasta tres minutos en
                 * enterarse y el usuario ve los candados todavía cerrados justo
                 * después de pagar.
                 *
                 * Si no se pudo confirmar, se sale igual: el botón ya le ha
                 * dicho que se activará solo, y el webhook lo recogerá.
                 */
                if (confirmado) await refrescaDerechos();

                /*
                 * Los planes parciales no desbloquean nada al pagar: dan huecos
                 * que hay que repartir. Se lleva al usuario directo a elegir sus
                 * ligas, o se quedaría mirando una app igual de bloqueada que
                 * antes, con la sensación de haber pagado por nada.
                 */
                if (confirmado && paypal.competicion === 'elegidas') {
                  router.replace('/mis-ligas');
                  return;
                }

                //  falla si se abrió Pro escribiendo la dirección: no hay
                // pantalla anterior. Se comprueba antes y, si no la hay, se va a
                // Inicio, que es donde se ven los candados abrirse.
                if (router.canGoBack()) router.back();
                else router.replace('/');
              }}
            />
          ) : (
            <Boton
              ancho
              texto={
                !sesion
                  ? 'Entra con tu cuenta para suscribirte'
                  : plan === elegido
                    ? 'Plan activo'
                    : 'Este plan aún no está disponible'
              }
              deshabilitado={!!sesion}
              onPress={() => router.push('/entrar')}
            />
          )}

          <Txt v="mini" color={C.texto3} style={{ textAlign: 'center' }}>
            El cobro lo gestiona PayPal. Puedes cancelar cuando quieras desde tu cuenta de
            PayPal y mantienes el acceso hasta que termine el periodo pagado.
          </Txt>
        </View>
      </ScrollView>
    </View>
  );
}
