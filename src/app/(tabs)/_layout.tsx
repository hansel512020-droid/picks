import { Tabs } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icono, type NombreIcono } from '@/componentes/iconos';
import { marca } from '@/componentes/movimiento';
import { ALTO_TABS, C, MARGEN_TABS, R, T } from '@/tema';
import { useHayLateral } from '@/utiles/pantalla';

/**
 * El icono de la pestaña, con una pastilla lima detrás cuando está elegida.
 *
 * Solo con el color, la pestaña activa se distinguía de las demás por un tono
 * de verde en un icono de veinte píxeles. La pastilla se ve de reojo.
 */
function IconoPestana({ nombre, color, activa }: { nombre: NombreIcono; color: string; activa: boolean }) {
  return (
    <View
      {...marca('color')}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 3,
        borderRadius: 999,
        backgroundColor: activa ? C.limaTenue : 'transparent',
      }}
    >
      <Icono nombre={nombre} tam={21} color={color} />
    </View>
  );
}

const PESTANAS: { name: string; titulo: string; icono: NombreIcono }[] = [
  { name: 'index', titulo: 'Inicio', icono: 'casa' },
  { name: 'partidos', titulo: 'Partidos', icono: 'balon' },
  { name: 'comunidad', titulo: 'Comunidad', icono: 'rayo' },
  { name: 'rendimiento', titulo: 'Rendimiento', icono: 'grafico' },
  { name: 'perfil', titulo: 'Perfil', icono: 'usuario' },
];

/**
 * Una pantalla puede pedir que la barra de abajo desaparezca mientras carga.
 *
 * La pantalla de carga de la portada ocupa todo, pero la barra de pestañas vive
 * fuera de ella —la pinta este layout— y se quedaba abajo, encendida, debajo de
 * un "Analizando…". Media app cargando y media app lista es lo que hace que
 * parezca rota; mientras carga, se ve la carga y nada más.
 */
const Ctx = createContext<(cargando: boolean) => void>(() => {});

/*
 * Antes de pintar, no después.
 *
 * Con `useEffect` la orden de esconder la barra llegaba cuando la pantalla ya
 * se había dibujado, así que había un instante —un fotograma, pero se ve— en
 * el que la barra de pestañas aparecía debajo de la pantalla de carga y
 * desaparecía sola. `useLayoutEffect` corre antes de que el navegador pinte,
 * así que la barra no llega a verse.
 *
 * En el servidor no existe layout: durante el prerenderizado de la web no hay
 * nada que pintar y React avisa si se usa, así que allí se queda el normal.
 */
const antesDePintar = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Oculta la barra de pestañas mientras `cargando` sea cierto. */
export function useOcultaPestanas(cargando: boolean) {
  const avisa = useContext(Ctx);
  antesDePintar(() => {
    avisa(cargando);
    // Al salir de la pantalla la barra vuelve, cargue lo que cargue.
    return () => avisa(false);
  }, [avisa, cargando]);
}

export default function LayoutPestanas() {
  /*
   * Empieza escondida.
   *
   * Aunque la orden de esconderla llegue antes de pintar, el primer dibujo de
   * este layout ocurre antes de que exista la pantalla que la pide, así que la
   * barra asomaba un instante al entrar. Naciendo escondida no hay ningún
   * momento en el que se vea con la carga delante.
   *
   * La red de seguridad de abajo es porque no todas las pantallas avisan: si
   * alguien entra directo a Partidos o a Perfil —por un enlace, por ejemplo—,
   * nadie diría nunca "ya está" y la barra se quedaría escondida para siempre.
   */
  const [oculta, setOculta] = useState(true);
  /*
   * La barra flota: una cápsula separada de los bordes, con el contenido
   * pasando por debajo. En el móvil va casi de lado a lado; en un monitor se
   * queda en el centro con el ancho justo para las cinco, en vez de repartirlas
   * a metro y medio unas de otras.
   */
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const lado = Math.max(MARGEN_TABS, (width - 520) / 2);
  // En el escritorio navega el menú lateral: la barra de abajo sobra.
  const conLateral = useHayLateral();
  const avisado = useRef(false);
  const avisa = useCallback((cargando: boolean) => {
    avisado.current = true;
    setOculta(cargando);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!avisado.current) setOculta(false);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <Ctx.Provider value={avisa}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.lima,
          tabBarInactiveTintColor: C.texto3,
          tabBarStyle: oculta || conLateral
            ? { display: 'none' }
            : {
                position: 'absolute',
                left: lado,
                right: lado,
                bottom: Math.max(insets.bottom, MARGEN_TABS),
                height: ALTO_TABS,
                paddingTop: 5,
                paddingBottom: 5,
                paddingHorizontal: 4,
                borderRadius: R.xl,
                borderWidth: 1,
                borderTopWidth: 1,
                borderColor: C.bordeLuz,
                boxShadow: '0 16px 36px -10px rgba(0,0,0,0.85)',
              },
          /*
           * El fondo de la cápsula, casi opaco. Llevaba además un desenfoque de
           * lo de detrás (backdrop-filter), pero el navegador tiene que rehacerlo
           * en cada fotograma del scroll y en ordenadores modestos lo volvía
           * lento; con el fundido de las pantallas no hace falta.
           */
          tabBarBackground: () => (
            <View style={{ flex: 1, borderRadius: R.xl, backgroundColor: 'rgba(14,19,27,0.96)' }} />
          ),
          // Siempre el icono encima del nombre: al lado no cabe en la cápsula.
          tabBarLabelPosition: 'below-icon',
          tabBarLabelStyle: { ...T.mini, fontSize: 10, lineHeight: 13 },
          sceneStyle: { backgroundColor: C.fondo },
        }}
      >
        {PESTANAS.map((p) => (
          <Tabs.Screen
            key={p.name}
            name={p.name}
            options={{
              /*
               * La etiqueta de abajo y el nombre de la ventana son cosas
               * distintas.
               *
               * Esto era `title: p.titulo`, que hace las dos: en la barra ponia
               * "Inicio" —bien— pero tambien mandaba ese texto a la pestaña del
               * navegador, y ahi no dice nada de quien es la app. Con
               * `tabBarLabel` la barra se queda igual y la pestaña conserva el
               * nombre que viene de las opciones comunes.
               */
              tabBarLabel: p.titulo,
              title: 'Golden Picks',
              tabBarIcon: ({ color, focused }) => (
                <IconoPestana nombre={p.icono} color={String(color)} activa={focused} />
              ),
            }}
          />
        ))}
      </Tabs>
    </Ctx.Provider>
  );
}
