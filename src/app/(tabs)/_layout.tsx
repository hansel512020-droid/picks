import { Tabs } from 'expo-router';
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

export default function LayoutPestanas() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.lima,
        tabBarInactiveTintColor: C.texto3,
        tabBarStyle: {
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
            title: p.titulo,
            tabBarIcon: ({ color }) => (
              <Icono nombre={p.icono} tam={22} color={String(color)} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
