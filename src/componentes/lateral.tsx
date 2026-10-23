import { router, usePathname, useSegments } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { Pulsable, Txt } from '@/componentes/base';
import { Icono, type NombreIcono } from '@/componentes/iconos';
import { LogoCompeticion } from '@/componentes/imagen';
import { Logo } from '@/componentes/marca';
import { competicion } from '@/datos/competiciones';
import { useAvisos } from '@/estado/avisos';
import { useDerechos } from '@/estado/derechos';
import { useSesion } from '@/estado/sesion';
import { useTienda } from '@/estado/tienda';
import { brillo, C, E, R } from '@/tema';
import { ANCHO_LATERAL, useHayLateral } from '@/utiles/pantalla';

/**
 * El menú lateral del escritorio.
 *
 * En un monitor la barra flotante de abajo era una cápsula de quinientos
 * píxeles en medio de una pantalla de mil cuatrocientos: lejos de todo y con
 * sitio solo para cinco iconos. A la izquierda cabe lo que en el móvil no: el
 * buscador, las secciones con su nombre, las ligas que sigues a un clic y el
 * acceso a Pro, siempre a la vista y en todas las pantallas, también en las
 * fichas.
 *
 * En el teléfono y en ventanas estrechas no sale: allí sigue la barra de abajo.
 */

const SECCIONES: { ruta: string; texto: string; icono: NombreIcono }[] = [
  { ruta: '/', texto: 'Inicio', icono: 'casa' },
  { ruta: '/partidos', texto: 'Partidos', icono: 'balon' },
  { ruta: '/picks', texto: 'Todos los picks', icono: 'estrella' },
  { ruta: '/comunidad', texto: 'Comunidad', icono: 'rayo' },
  { ruta: '/rendimiento', texto: 'Rendimiento', icono: 'grafico' },
  { ruta: '/perfil', texto: 'Perfil', icono: 'usuario' },
];

/** Pantallas sin menú: la presentación y la entrada van a pantalla completa. */
const SIN_MENU = new Set(['bienvenida', 'entrar']);

function Entrada({
  texto,
  icono,
  activa,
  onPress,
  globo,
}: {
  texto: string;
  icono: NombreIcono;
  activa: boolean;
  onPress: () => void;
  globo?: number;
}) {
  return (
    <Pulsable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: E.md,
        paddingHorizontal: E.md,
        height: 42,
        borderRadius: R.md,
        backgroundColor: activa ? C.limaTenue : 'transparent',
      }}
    >
      <Icono nombre={icono} tam={19} color={activa ? C.lima : C.texto2} />
      <Txt v={activa ? 'cuerpoFuerte' : 'cuerpo'} color={activa ? C.lima : C.texto} style={{ flex: 1 }}>
        {texto}
      </Txt>
      {globo ? (
        <View
          style={{
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            paddingHorizontal: 6,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.rojo,
          }}
        >
          <Txt v="mini" color="#FFF">
            {globo > 9 ? '9+' : globo}
          </Txt>
        </View>
      ) : null}
    </Pulsable>
  );
}

function Rotulo({ children }: { children: string }) {
  return (
    <Txt
      v="etiqueta"
      color={C.texto3}
      style={{ paddingHorizontal: E.md, marginTop: E.lg, marginBottom: E.xs }}
    >
      {children}
    </Txt>
  );
}

function Menu() {
  const ruta = usePathname();
  const { ajustes, cambiaAjuste } = useTienda();
  const { pro } = useDerechos();
  const { sinLeer } = useAvisos();

  const ligas = ajustes.ligasSeguidas.flatMap((id) => {
    try {
      return [competicion(id)];
    } catch {
      return [];
    }
  });
  const enInicio = ruta === '/';

  return (
    <View
      style={{
        width: ANCHO_LATERAL,
        backgroundColor: C.fondo2,
        borderRightWidth: 1,
        borderRightColor: C.bordeSuave,
      }}
    >
      <ScrollView
        contentContainerStyle={{ padding: E.md, paddingTop: E.xl, gap: 2, minHeight: '100%' }}
        showsVerticalScrollIndicator={false}
      >
        <Pulsable
          onPress={() => router.navigate('/')}
          plano
          style={{ paddingHorizontal: E.sm, marginBottom: E.lg }}
        >
          <Logo tam={19} />
        </Pulsable>

        {/* Parece un campo, pero abre el buscador entero: ahí está la lista. */}
        <Pulsable
          onPress={() => router.push('/buscar')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: E.sm,
            height: 40,
            paddingHorizontal: E.md,
            marginBottom: E.md,
            borderRadius: R.md,
            borderWidth: 1,
            borderColor: C.borde,
            backgroundColor: C.carta,
          }}
        >
          <Icono nombre="buscar" tam={16} color={C.texto3} />
          <Txt v="pequeno" color={C.texto3}>
            Equipos, jugadores, ligas…
          </Txt>
        </Pulsable>

        {SECCIONES.map((s) => (
          <Entrada
            key={s.ruta}
            texto={s.texto}
            icono={s.icono}
            activa={s.ruta === '/' ? enInicio : ruta.startsWith(s.ruta)}
            onPress={() => router.navigate(s.ruta as never)}
          />
        ))}
        <Entrada
          texto="Avisos"
          icono="campana"
          activa={ruta.startsWith('/avisos')}
          onPress={() => router.push('/avisos')}
          globo={sinLeer}
        />

        <Rotulo>TUS LIGAS</Rotulo>
        <Pulsable
          onPress={() => {
            cambiaAjuste('competicionId', 'todas');
            router.navigate('/');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: E.md,
            paddingHorizontal: E.md,
            height: 38,
            borderRadius: R.md,
            backgroundColor: enInicio && ajustes.competicionId === 'todas' ? C.carta2 : 'transparent',
          }}
        >
          <View style={{ width: 22, alignItems: 'center' }}>
            <Icono nombre="mundo" tam={17} color={C.texto2} />
          </View>
          <Txt v="pequeno" color={C.texto}>
            Todas
          </Txt>
        </Pulsable>
        {ligas.map((c) => {
          const activa = enInicio && ajustes.competicionId === c.id;
          return (
            <Pulsable
              key={c.id}
              onPress={() => {
                cambiaAjuste('competicionId', c.id);
                router.navigate('/');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: E.md,
                paddingHorizontal: E.md,
                height: 38,
                borderRadius: R.md,
                backgroundColor: activa ? C.carta2 : 'transparent',
              }}
            >
              <LogoCompeticion competicionId={c.id} bandera={c.bandera} tam={22} />
              <Txt v="pequeno" color={activa ? C.lima : C.texto} numberOfLines={1} style={{ flex: 1 }}>
                {c.nombre}
              </Txt>
            </Pulsable>
          );
        })}
        <Pulsable
          onPress={() => router.push('/competiciones')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: E.md,
            paddingHorizontal: E.md,
            height: 36,
          }}
        >
          <View style={{ width: 22, alignItems: 'center' }}>
            <Icono nombre="ajustes" tam={16} color={C.texto3} />
          </View>
          <Txt v="pequeno" color={C.texto3}>
            Todas las competiciones
          </Txt>
        </Pulsable>

        <View style={{ flex: 1, minHeight: E.xl }} />

        {pro ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: E.sm,
              padding: E.md,
              borderRadius: R.lg,
              backgroundColor: C.carta,
              borderWidth: 1,
              borderColor: C.borde,
            }}
          >
            <Icono nombre="estrella" tam={16} color={C.lima} />
            <Txt v="pequenoFuerte" color={C.lima}>
              Golden Pro activo
            </Txt>
          </View>
        ) : (
          <Pulsable
            onPress={() => router.push('/pro')}
            marcas="eleva brillo"
            style={{
              padding: E.lg,
              gap: 6,
              borderRadius: R.lg,
              borderWidth: 1,
              borderColor: C.limaBorde,
              backgroundColor: C.limaTenue,
              boxShadow: brillo.lima,
            }}
          >
            <Txt v="cuerpoFuerte" color={C.lima}>
              Hazte Pro
            </Txt>
            <Txt v="mini" color={C.texto2}>
              Todos los picks abiertos, en todas tus ligas.
            </Txt>
          </Pulsable>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Envuelve la app: menú a la izquierda y las pantallas al lado. Sin sitio, o
 * en una pantalla sin menú, solo las pantallas.
 */
export function ConLateral({ children }: { children: React.ReactNode }) {
  const hay = useHayLateral();
  const segmentos = useSegments();
  const { cargado, onboarding } = useTienda();
  const { cargada, exigeCuenta } = useSesion();
  // Mientras abre, o antes de tener cuenta, la pantalla va sola.
  const listo = cargado && cargada && onboarding && !exigeCuenta;
  if (!hay || !listo || SIN_MENU.has(segmentos[0] ?? '')) return <>{children}</>;
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <Menu />
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}
