import { Tabs } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Icono, type NombreIcono } from '@/componentes/iconos';
import { C, T } from '@/tema';

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

/** Oculta la barra de pestañas mientras `cargando` sea cierto. */
export function useOcultaPestanas(cargando: boolean) {
  const avisa = useContext(Ctx);
  useEffect(() => {
    avisa(cargando);
    // Al salir de la pantalla la barra vuelve, cargue lo que cargue.
    return () => avisa(false);
  }, [avisa, cargando]);
}

export default function LayoutPestanas() {
  const [oculta, setOculta] = useState(false);
  const avisa = useCallback((cargando: boolean) => setOculta(cargando), []);

  return (
    <Ctx.Provider value={avisa}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: C.lima,
          tabBarInactiveTintColor: C.texto3,
          tabBarStyle: oculta
            ? { display: 'none' }
            : {
                backgroundColor: C.fondo2,
                borderTopColor: C.bordeSuave,
                borderTopWidth: 1,
                height: Platform.OS === 'ios' ? 84 : 64,
                paddingTop: 8,
              },
          tabBarLabelStyle: { ...T.mini, fontSize: 10 },
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
              tabBarIcon: ({ color }) => (
                <Icono nombre={p.icono} tam={22} color={String(color)} />
              ),
            }}
          />
        ))}
      </Tabs>
    </Ctx.Provider>
  );
}
