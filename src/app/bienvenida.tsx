import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Insignia, Pulsable, Tarjeta, Txt } from '@/componentes/base';
import { Icono, type NombreIcono } from '@/componentes/iconos';
import { Simbolo } from '@/componentes/marca';
import { BarraL10, FilaMercado } from '@/componentes/pick';
import { COMPETICIONES } from '@/datos/competiciones';
import { competicionesImportadas } from '@/datos/importado';
import { useTienda } from '@/estado/tienda';
import { C, E, R, anchoLienzo } from '@/tema';

/**
 * Presentacion de la app la primera vez que se abre. Cada pantalla cuenta una
 * de las cosas que hace Golden, con un ejemplo real debajo.
 */

interface Diapositiva {
  titulo: string;
  destacado: string;
  detalle: string;
  contenido: React.ReactNode;
}

function EjemploPick() {
  return (
    <Tarjeta style={{ padding: E.md, gap: E.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.md }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.carta2,
          }}
        >
          <Text style={{ fontSize: 20 }}>🇧🇷</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="subtitulo">Neymar Jr.</Txt>
          <Txt v="pequeno" color={C.texto3}>
            BRA vs COR • Hoy 16:00
          </Txt>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 2,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: R.sm,
            backgroundColor: C.ambarTenue,
          }}
        >
          <Text style={{ fontWeight: '700', fontSize: 13, color: C.ambar }}>42</Text>
          <Text style={{ fontSize: 12 }}>🔥</Text>
        </View>
      </View>
      <Txt v="cuerpo">
        Neymar Jr. superó los 0,5 remates a puerta en 9 de sus últimos 10 partidos (2,3 por partido).
      </Txt>
      <FilaMercado
        mercado="Más de 0.5 remates a puerta"
        cuota={1.22}
        casaId="bet365"
        ventaja={24}
      />
      <BarraL10
        racha={[true, true, true, true, true, true, false, true, true, true]}
        porcentaje={90}
      />
    </Tarjeta>
  );
}

function EjemploRendimiento() {
  return (
    <Tarjeta style={{ padding: E.lg, gap: E.md }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: C.carta2,
          borderRadius: R.md,
          paddingVertical: E.lg,
        }}
      >
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt v="display" style={{ fontSize: 26 }}>
            82.1%
          </Txt>
          <Txt v="pequeno" color={C.texto3}>
            Aciertos
          </Txt>
        </View>
        <View style={{ width: 1, height: 36, backgroundColor: C.borde }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt v="display" style={{ fontSize: 26 }}>
            32
          </Txt>
          <Txt v="pequeno" color={C.texto3}>
            Picks
          </Txt>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: E.md,
          paddingVertical: 12,
          borderRadius: R.md,
          backgroundColor: C.verdeTenue,
        }}
      >
        <Txt v="cuerpo" color={C.verde}>
          Retorno de inversión
        </Txt>
        <Txt v="cuerpoFuerte" color={C.verde}>
          34.7%
        </Txt>
      </View>
    </Tarjeta>
  );
}

function EjemploCompeticiones() {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: E.sm, justifyContent: 'center' }}>
      {COMPETICIONES.slice(0, 16).map((c) => (
        <View
          key={c.id}
          style={{
            width: 62,
            height: 62,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: R.md,
            backgroundColor: C.carta,
            borderWidth: 1,
            borderColor: C.borde,
          }}
        >
          <Text style={{ fontSize: 26 }}>{c.bandera}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Cuántas competiciones se anuncian.
 *
 * Las que tienen datos descargados, no las que hay en el catálogo. Anunciaba 61
 * —todas las que la app sabe dibujar, incluidos el Mundial y la Eurocopa, que
 * no se juegan ahora— mientras enseñaba 36. Es lo primero que lee alguien que
 * va a pagar, y prometer 25 competiciones que no están es una mala forma de
 * empezar a cobrar.
 *
 * Antes de que lleguen los datos no hay nada descargado, así que se cae al
 * catálogo; en cuanto llegan, el árbol se repinta entero y sale el número real.
 */
function cuantasCompeticiones(): number {
  return competicionesImportadas().length || COMPETICIONES.length;
}

function resumen(): { icono: NombreIcono; texto: string }[] { return [
  { icono: 'rayo', texto: 'Picks con ventaja estadística' },
  { icono: 'filtro', texto: 'Filtros avanzados' },
  { icono: 'usuario', texto: 'Qué elige la comunidad' },
  { icono: 'grafico', texto: 'Tu rendimiento partido a partido' },
  { icono: 'mundo', texto: `+${cuantasCompeticiones()} competiciones` },
  { icono: 'moneda', texto: 'Precios y estadísticas en vivo' },
];
}

function diapositivas(): Diapositiva[] { return [
  {
    titulo: 'CONVIERTE DATOS',
    destacado: 'EN DECISIONES',
    detalle: 'Descubre picks con ventaja estadística',
    contenido: <EjemploPick />,
  },
  {
    titulo: 'ANALIZA PARTIDOS',
    destacado: 'EN SEGUNDOS',
    detalle: 'Estadísticas, tendencias y métricas en tiempo real',
    contenido: (
      <Tarjeta style={{ padding: E.lg, gap: E.md }}>
        {[
          ['Precios', 'Compara 10 fuentes del mercado'],
          ['Insights', 'Picks, alineaciones y lesiones'],
          ['Duelo', 'Cara a cara de los dos equipos'],
        ].map(([t, d]) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: E.md }}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: R.sm,
                backgroundColor: C.limaTenue,
              }}
            >
              <Txt v="pequenoFuerte" color={C.lima}>
                {t}
              </Txt>
            </View>
            <Txt v="pequeno" color={C.texto2} style={{ flex: 1 }}>
              {d}
            </Txt>
          </View>
        ))}
      </Tarjeta>
    ),
  },
  {
    titulo: 'MIRA QUÉ ELIGE',
    destacado: 'LA COMUNIDAD 🔥',
    detalle: 'Los picks más guardados por los usuarios',
    contenido: (
      <View style={{ alignItems: 'center', gap: E.lg }}>
        <View
          style={{
            width: 130,
            height: 130,
            borderRadius: 65,
            borderWidth: 2,
            borderColor: C.limaBorde,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: R.md,
              backgroundColor: C.ambarTenue,
            }}
          >
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.ambar }}>42</Text>
            <Text style={{ fontSize: 22 }}>🔥</Text>
          </View>
        </View>
        <Txt v="subtitulo" color={C.texto2} style={{ textAlign: 'center' }}>
          Personas guardaron{'\n'}este pick
        </Txt>
      </View>
    ),
  },
  {
    titulo: 'TU RENDIMIENTO',
    destacado: 'PARTIDO A PARTIDO',
    detalle: 'Consulta tu porcentaje de acierto, picks guardados y actividad',
    contenido: <EjemploRendimiento />,
  },
  {
    titulo: `${cuantasCompeticiones()}`,
    destacado: 'COMPETICIONES.',
    detalle: 'Desde la Champions hasta la Libertadores, cubrimos todas las ligas que sigues.',
    contenido: <EjemploCompeticiones />,
  },
  {
    titulo: 'TODO EN',
    destacado: 'UNA SOLA APP',
    detalle: 'Picks con valor. Análisis en segundos. La comunidad. Tu rendimiento.',
    contenido: (
      <View style={{ gap: E.sm }}>
        {resumen().map((r) => (
          <View
            key={r.texto}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: E.md,
              paddingHorizontal: E.md,
              paddingVertical: 13,
              borderRadius: R.lg,
              backgroundColor: C.carta,
              borderWidth: 1,
              borderColor: C.borde,
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.limaTenue,
              }}
            >
              <Icono nombre={r.icono} tam={13} color={C.lima} />
            </View>
            <Txt v="cuerpo" style={{ flex: 1 }}>
              {r.texto}
            </Txt>
          </View>
        ))}
      </View>
    ),
  },
];
}

export default function Bienvenida() {
  const { terminaOnboarding } = useTienda();
  const insets = useSafeAreaInsets();
  const [pagina, setPagina] = useState(0);
  const scroll = useRef<ScrollView>(null);

  /*
   * Se arman al pintar, no al cargar el módulo, porque el número de
   * competiciones sale de los datos y esos llegan después. Cuando llegan, el
   * árbol entero se repinta y esto se rehace con la cifra buena.
   */
  const DIAPOSITIVAS = useMemo(diapositivas, []);

  /*
   * Cada diapositiva ocupa el ancho del lienzo, no el de la ventana. En un
   * navegador de escritorio la app vive dentro de una columna más estrecha:
   * si se midiera la ventana, la página se dibujaría más ancha que la columna,
   * las tarjetas saldrían cortadas por la derecha y el botón Siguiente
   * desplazaría a un punto que no es el principio de la diapositiva.
   *
   * Con useWindowDimensions se recalcula solo al girar el móvil o al cambiar
   * el tamaño de la ventana.
   */
  const ancho = anchoLienzo(useWindowDimensions().width);

  const ultima = pagina === DIAPOSITIVAS.length - 1;

  /*
   * Los puntos siguen al desplazamiento, no al final del gesto: en el
   * navegador `onMomentumScrollEnd` no llega a dispararse al arrastrar con el
   * ratón ni con la rueda, y los puntos se quedaban clavados en el primero.
   */
  const alDeslizar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!ancho) return;
    const cual = Math.round(e.nativeEvent.contentOffset.x / ancho);
    setPagina(Math.max(0, Math.min(DIAPOSITIVAS.length - 1, cual)));
  };

  const avanza = () => {
    if (ultima) {
      terminaOnboarding();
      router.replace('/');
      return;
    }
    scroll.current?.scrollTo({ x: (pagina + 1) * ancho, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: E.lg,
          paddingVertical: E.md,
        }}
      >
        <Simbolo tam={30} />
        <Pulsable
          onPress={() => {
            terminaOnboarding();
            router.replace('/');
          }}
          hitSlop={10}
        >
          <Txt v="pequeno" color={C.texto3}>
            Saltar
          </Txt>
        </Pulsable>
      </View>

      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={alDeslizar}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {DIAPOSITIVAS.map((d, i) => (
          <ScrollView
            key={i}
            style={{ width: ancho }}
            contentContainerStyle={{ paddingHorizontal: E.lg, paddingBottom: E.xl, gap: E.lg }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: E.sm, paddingTop: E.lg }}>
              <Txt v="displayXL" style={{ textAlign: 'center', fontSize: 32 }}>
                {d.titulo}
              </Txt>
              <Txt v="displayXL" color={C.lima} style={{ textAlign: 'center', fontSize: 32 }}>
                {d.destacado}
              </Txt>
              <Txt v="cuerpo" color={C.texto2} style={{ textAlign: 'center' }}>
                {d.detalle}
              </Txt>
            </View>
            {d.contenido}
          </ScrollView>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: E.lg, paddingBottom: insets.bottom + E.lg, gap: E.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {DIAPOSITIVAS.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === pagina ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === pagina ? C.lima : C.borde,
              }}
            />
          ))}
        </View>
        <Boton ancho texto={ultima ? 'Empezar' : 'Siguiente'} onPress={avanza} />
        <View style={{ alignItems: 'center' }}>
          <Insignia texto="SOLO MAYORES DE 18 AÑOS · CONTENIDO INFORMATIVO" />
        </View>
      </View>
    </View>
  );
}
