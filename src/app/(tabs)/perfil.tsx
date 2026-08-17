import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, ScrollView, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Insignia, Pulsable, Separador, Tarjeta, Txt } from '@/componentes/base';
import { Icono, type NombreIcono } from '@/componentes/iconos';
import { LogoCompeticion } from '@/componentes/imagen';
import { Simbolo } from '@/componentes/marca';
import { SelloCasa } from '@/componentes/pick';
import { casa as buscaCasa } from '@/datos/casas';
import { competicion } from '@/datos/competiciones';
import { COMUNIDAD_ACTIVA } from '@/datos/comunidad';
import { AvisoCambiaDePlan, AvisoCobroFallido } from '@/componentes/avisos';
import { COMPETICIONES_IMPORTADAS } from '@/datos/importado';
import { cancelaSuscripcion } from '@/datos/cuenta';
import { useDerechos } from '@/estado/derechos';
import { useSesion } from '@/estado/sesion';
import { calculaRendimiento, useTienda, type Ajustes } from '@/estado/tienda';
import { useVivo } from '@/estado/vivo';
import { C, E, R } from '@/tema';

/** Perfil, ajustes y estado de la suscripcion. */

function Fila({
  icono,
  titulo,
  detalle,
  derecha,
  onPress,
}: {
  icono: NombreIcono;
  titulo: string;
  detalle?: string;
  derecha?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pulsable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: E.md,
        paddingHorizontal: E.md,
        paddingVertical: 13,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.carta2,
        }}
      >
        <Icono nombre={icono} tam={16} color={C.texto2} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt v="cuerpo">{titulo}</Txt>
        {detalle ? (
          <Txt v="mini" color={C.texto3}>
            {detalle}
          </Txt>
        ) : null}
      </View>
      {derecha ?? (onPress ? <Icono nombre="flechaDerecha" tam={15} color={C.texto3} /> : null)}
    </Pulsable>
  );
}

function Interruptor({
  clave,
  titulo,
  detalle,
  icono,
}: {
  clave: keyof Ajustes;
  titulo: string;
  detalle?: string;
  icono: NombreIcono;
}) {
  const { ajustes, cambiaAjuste } = useTienda();
  const valor = ajustes[clave] as boolean;
  return (
    <Fila
      icono={icono}
      titulo={titulo}
      detalle={detalle}
      derecha={
        <Switch
          value={valor}
          onValueChange={(v) => cambiaAjuste(clave, v as never)}
          trackColor={{ false: C.carta2, true: C.limaOscuro }}
          thumbColor={valor ? C.lima : C.texto3}
          ios_backgroundColor={C.carta2}
        />
      }
    />
  );
}

/*
 * El nombre sale del periodo que consta en el servidor, no de un plan guardado
 * en el teléfono. La insignia llegó a poner "Pro · 2 ligas" a alguien que no
 * tenía nada comprado, porque leía un resto local de cuando la app todavía no
 * cobraba de verdad.
 */
/** A dónde escribe el usuario cuando algo falla. */
const CORREO_CONTACTO = 'PicksGolden@proton.me';

const NOMBRES_PLAN: Record<string, string> = {
  semanal: 'Pro · Semanal',
  mensual: 'Pro · Mensual',
  anual: 'Pro · Anual',
  vitalicio: 'Pro · Vitalicio',
};

export default function Perfil() {
  const { ajustes, guardados, reinicia } = useTienda();
  // Lo que se ha comprado lo dice el servidor, no el teléfono.
  const { pro, periodo, huecos, libres, refresca: refrescaDerechos } = useDerechos();

  /*
   * Los nombres de las competiciones que tiene elegidas, para enseñarlas bajo
   * la insignia. Vale igual para dos que para tres: se listan las que haya.
   * `*` significa "todas" y ese es otro plan, así que no entra aquí.
   */
  const ligasElegidas = useMemo(
    () =>
      [...libres]
        .filter((c) => c !== '*')
        .map((c) => competicion(c).nombre)
        .sort((a, b) => a.localeCompare(b)),
    [libres],
  );
  const { sesion } = useSesion();
  const { resueltos } = useVivo();

  /*
   * La baja se pide en dos toques.
   *
   * Es una acción que no se deshace —para volver hay que pagar otra vez— y
   * estaba en una lista donde el dedo resbala. Un `Alert` no vale: en web no
   * existe, y esta pantalla se usa desde el navegador.
   */
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [avisoBaja, setAvisoBaja] = useState<string | null>(null);

  const cancela = async () => {
    if (!sesion || cancelando) return;
    setCancelando(true);
    const r = await cancelaSuscripcion(sesion.token);
    setCancelando(false);
    setConfirmando(false);

    if (!r.ok) {
      setAvisoBaja(r.error ?? 'No se pudo cancelar.');
      return;
    }
    /*
     * El acceso sigue vivo hasta que termine el periodo pagado, así que la
     * insignia no cambia y eso confunde: hay que decirlo con palabras.
     */
    setAvisoBaja(
      r.aviso ?? 'Suscripción cancelada. Mantienes el acceso hasta que acabe el periodo pagado.',
    );
    await refrescaDerechos();
  };

  /*
   * El acierto se calcula con los picks ya resueltos en directo, igual que en
   * Rendimiento. Antes esta pantalla usaba el cálculo de la tienda, que no
   * conoce el directo: un pick ganado hace diez minutos salía como pendiente y
   * el perfil decía 0% mientras Rendimiento decía 100%.
   */
  const rendimiento = useMemo(
    () =>
      calculaRendimiento(
        guardados.map((g) => {
          if (g.resultado !== 'pendiente') return g;
          const v = resueltos.get(g.pickId);
          return v ? { ...g, resultado: v.resultado, valorReal: v.valorReal } : g;
        }),
      ),
    [guardados, resueltos],
  );
  const insets = useSafeAreaInsets();
  const casa = buscaCasa(ajustes.casaId);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.fondo }}
      contentContainerStyle={{ paddingTop: insets.top + E.md, paddingBottom: E.xxxl, gap: E.lg }}
      showsVerticalScrollIndicator={false}
    >
      {/* ------------------------------------------------------- identidad */}
      <View style={{ alignItems: 'center', gap: E.sm, paddingHorizontal: E.lg }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.carta,
            borderWidth: 1,
            borderColor: C.borde,
          }}
        >
          <Simbolo tam={34} />
        </View>
        <Txt v="titulo">{ajustes.nombre}</Txt>
        {/*
          Con un plan parcial manda el número de ligas, no el periodo. Poner
          "Pro · Mensual" a quien compró dos ligas no dice lo que tiene: lo que
          quiere saber es cuántas competiciones le caben, y es lo que distingue
          su plan del completo, que también se cobra al mes.
        */}
        <Insignia
          texto={
            huecos
              ? `Pro · ${huecos} ligas`
              : (periodo && NOMBRES_PLAN[periodo]) || (pro ? 'Pro' : 'Gratis')
          }
          color={pro ? C.lima : C.texto2}
          fondo={pro ? C.limaTenue : C.carta2}
        />

        {/*
          Cuáles ha elegido, por su nombre.

          El "Pro · 2 ligas" dice cuántas caben, pero no cuáles son, y eso es lo
          que uno viene a mirar aquí: si el mes que viene quiere cambiar una,
          primero necesita acordarse de las que tiene.
        */}
        {huecos && ligasElegidas.length ? (
          <Txt v="mini" color={C.texto3} style={{ textAlign: 'center' }}>
            {ligasElegidas.join(' · ')}
          </Txt>
        ) : null}
        {huecos && !ligasElegidas.length ? (
          <Pulsable onPress={() => router.push('/mis-ligas')}>
            <Txt v="mini" color={C.lima}>
              Todavía no has elegido tus ligas
            </Txt>
          </Pulsable>
        ) : null}
      </View>

      {/* -------------------------------------------------------- resumen */}
      <View style={{ flexDirection: 'row', gap: E.sm, paddingHorizontal: E.lg }}>
        {[
          { v: `${rendimiento.acierto.toFixed(0)}%`, e: 'Acierto' },
          { v: `${guardados.length}`, e: 'Guardados' },
          {
            v: `${rendimiento.roi >= 0 ? '+' : ''}${rendimiento.roi.toFixed(0)}%`,
            e: 'ROI',
            color: rendimiento.roi >= 0 ? C.verde : C.rojo,
          },
        ].map((d) => (
          <Tarjeta key={d.e} style={{ flex: 1, alignItems: 'center', paddingVertical: E.md, gap: 2 }}>
            <Txt v="subtitulo" color={d.color ?? C.texto}>
              {d.v}
            </Txt>
            <Txt v="mini" color={C.texto3}>
              {d.e}
            </Txt>
          </Tarjeta>
        ))}
      </View>

      {/* Aquí va fijo y sin equis: en el perfil es la ficha de tu suscripción,
          el sitio donde uno viene justamente a mirar cómo está. */}
      <AvisoCobroFallido />

      {/*
        "Cambiar de plan" va aquí arriba, junto a la insignia, y no enterrado
        al final entre la versión y el borrado de datos. Es una decisión sobre
        lo que pagas: su sitio es donde se lee lo que tienes.
      */}
      <AvisoCambiaDePlan />

      {/* ------------------------------------------------------------ pro */}
      {!pro ? (
        <Pulsable onPress={() => router.push('/pro')} style={{ paddingHorizontal: E.lg }}>
          <View
            style={{
              borderRadius: R.lg,
              padding: E.lg,
              gap: 6,
              backgroundColor: C.limaTenue,
              borderWidth: 1,
              borderColor: C.limaBorde,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.sm }}>
              <Icono nombre="rayo" tam={18} color={C.lima} />
              <Txt v="subtitulo" color={C.lima}>
                Golden Pro
              </Txt>
            </View>
            <Txt v="pequeno" color={C.texto2}>
              Todos los picks de las 60 competiciones, filtros avanzados, proyecciones y
              alineaciones sin límite.
            </Txt>
          </View>
        </Pulsable>
      ) : null}

      {/* ------------------------------------------------------ preferencias */}
      <View style={{ gap: E.sm }}>
        <Txt v="pequenoFuerte" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
          PREFERENCIAS
        </Txt>
        {/* Aquí había un selector de casa de apuestas. Se quitó porque la app
            no se apoya en el precio de una casa concreta: el 1X2 sale de la
            cuota publicada que haya, y los mercados de jugador y de equipo los
            tarifica el modelo. Dejar elegir casa daba a entender que el precio
            cambiaba según la que eligieras, y no era cierto. */}
        <Tarjeta style={{ marginHorizontal: E.lg, overflow: 'hidden' }}>
          <Fila
            icono="copa"
            titulo="Competición activa"
            detalle={competicion(ajustes.competicionId).nombre}
            onPress={() => router.push('/competiciones')}
            derecha={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <LogoCompeticion competicionId={ajustes.competicionId} bandera={competicion(ajustes.competicionId).bandera} tam={20} cuadrado />
                <Icono nombre="flechaDerecha" tam={15} color={C.texto3} />
              </View>
            }
          />
          <Separador />
          {/* Solo con un plan parcial: es la pantalla donde se escogen las
              competiciones que se han pagado. */}
          {huecos ? (
            <>
              <Fila
                icono="candado"
                titulo="Mis ligas"
                detalle={`Tus ${huecos} competiciones`}
                onPress={() => router.push("/mis-ligas")}
              />
              <Separador />
            </>
          ) : null}
          <Fila
            icono="estrella"
            titulo="Ligas que sigo"
            detalle={`${ajustes.ligasSeguidas.length} competiciones`}
            onPress={() => router.push('/competiciones?modo=seguir')}
          />
          <Separador />
          <Fila
            icono="guardado"
            titulo="Picks guardados"
            detalle={`${guardados.length} en tu historial`}
            onPress={() => router.push('/rendimiento')}
          />
        </Tarjeta>
      </View>

      {/* ---------------------------------------------------- notificaciones */}
      <View style={{ gap: E.sm }}>
        <Txt v="pequenoFuerte" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
          NOTIFICACIONES
        </Txt>
        <Tarjeta style={{ marginHorizontal: E.lg, overflow: 'hidden' }}>
          <Interruptor
            clave="notificarPicks"
            icono="rayo"
            titulo="Picks con ventaja"
            detalle="Cuando aparece una oportunidad en tus ligas"
          />
          <Separador />
          <Interruptor
            clave="notificarPartidos"
            icono="balon"
            titulo="Inicio de partido"
            detalle="15 minutos antes del pitido inicial"
          />
          <Separador />
          <Interruptor
            clave="notificarResultados"
            icono="check"
            titulo="Resultado de mis picks"
            detalle="En cuanto se resuelve un pick guardado"
          />
        </Tarjeta>
      </View>

      {/* -------------------------------------------------------- la app */}
      <View style={{ gap: E.sm }}>
        <Txt v="pequenoFuerte" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
          LA APP
        </Txt>
        <Tarjeta style={{ marginHorizontal: E.lg, overflow: 'hidden' }}>
          <Fila
            icono="info"
            titulo="Cómo se calculan los picks"
            detalle="Modelo, muestra y ventaja"
            onPress={() => router.push('/metodo')}
          />
          <Separador />
          <Fila
            icono="mundo"
            titulo="Origen de los datos"
            // Sin recuento: la insignia de la derecha ya dice si son reales o
            // simulados, y repetirlo con un número solo añade ruido.
            detalle={COMPETICIONES_IMPORTADAS.length ? undefined : 'Datos simulados'}
            onPress={() => router.push('/metodo')}
            derecha={
              <Insignia
                texto={COMPETICIONES_IMPORTADAS.length ? 'REALES' : 'SIMULADOS'}
                color={COMPETICIONES_IMPORTADAS.length ? C.lima : C.texto2}
                fondo={COMPETICIONES_IMPORTADAS.length ? C.limaTenue : C.carta2}
              />
            }
          />
          <Separador />
          <Fila
            icono="rayo"
            titulo="Contador de la comunidad"
            detalle={COMUNIDAD_ACTIVA ? 'Cuenta guardados reales' : 'Estimado por el modelo'}
            derecha={
              <Insignia
                texto={COMUNIDAD_ACTIVA ? 'REAL' : 'ESTIMADO'}
                color={COMUNIDAD_ACTIVA ? C.lima : C.texto2}
                fondo={COMUNIDAD_ACTIVA ? C.limaTenue : C.carta2}
              />
            }
          />
          <Separador />
          {/*
            Para avisar de fallos. Al tocarlo se abre el correo con la
            dirección y el asunto puestos; si el dispositivo no tiene cliente
            de correo, la dirección se queda a la vista para copiarla, que es
            lo que de verdad hace falta.
          */}
          <Fila
            icono="correo"
            titulo="Informar de un fallo"
            detalle={CORREO_CONTACTO}
            onPress={() => {
              const asunto = encodeURIComponent('Golden Picks · fallo');
              Linking.openURL(`mailto:${CORREO_CONTACTO}?subject=${asunto}`).catch(() => {});
            }}
          />
          <Separador />
          <Fila icono="mundo" titulo="Versión" detalle="Golden Picks 1.0.0" />
          {/*
            Antes esto llamaba a `activaPlan('ninguno')`, que solo borraba un
            valor del teléfono: PayPal seguía cobrando tan tranquilo y el
            acceso volvía en cuanto se releía la tabla. Ahora la baja se pide
            al servidor, que la ejecuta en PayPal de verdad.
          */}
          {pro ? (
            <>
              <Separador />
              <Fila
                icono="recarga"
                titulo={confirmando ? '¿Seguro que quieres cancelar?' : 'Cancelar suscripción'}
                detalle={
                  cancelando
                    ? 'Cancelando…'
                    : confirmando
                      ? 'Toca otra vez para confirmar. Dejará de cobrarse.'
                      : 'Dejas de pagar. Mantienes el acceso hasta que acabe el periodo pagado.'
                }
                onPress={confirmando ? cancela : () => setConfirmando(true)}
              />
              {avisoBaja ? (
                <Txt v="mini" color={C.texto3} style={{ paddingHorizontal: E.md, paddingBottom: E.sm }}>
                  {avisoBaja}
                </Txt>
              ) : null}
            </>
          ) : null}
          <Separador />
          <Fila
            icono="cruz"
            titulo="Borrar mis datos"
            detalle="Picks guardados y ajustes"
            onPress={reinicia}
          />
        </Tarjeta>
      </View>

      <Txt v="mini" color={C.texto3} style={{ paddingHorizontal: E.xl, textAlign: 'center' }}>
        Golden Picks es una app de investigación estadística. No es una casa de apuestas, no acepta
        depósitos y no genera ingresos de casas ni de afiliados. Solo para mayores de 18 años.
      </Txt>
    </ScrollView>
  );
}
