import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pulsable, Separador, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { Icono } from '@/componentes/iconos';
import { CabeceraAtras } from '@/componentes/navegacion';
import { useAvisos } from '@/estado/avisos';
import { C, E } from '@/tema';

/** Historial de avisos: qué ha pasado con tus picks mientras no mirabas. */

/** "hace 3 min", "ayer"… Una hora exacta aquí no aporta nada. */
function cuandoFue(iso: string): string {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return 'ahora mismo';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'ayer' : `hace ${dias} días`;
}

export default function Avisos() {
  const insets = useSafeAreaInsets();
  const { lista, marcaLeidos, borra } = useAvisos();

  /*
   * Se dan por leídos al entrar, no al tocar cada uno: si estás mirando la
   * lista, ya los has visto. Dejar el globo rojo puesto después de leerlos solo
   * enseña a ignorarlo.
   */
  useEffect(() => {
    marcaLeidos();
  }, [marcaLeidos]);

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      <CabeceraAtras
        titulo="Avisos"
        subtitulo={lista.length ? `${lista.length} en el historial` : undefined}
      />

      {!lista.length ? (
        <Vacio
          icono="campana"
          titulo="Todavía no hay avisos"
          detalle="Aquí aparecerán tus picks en cuanto se cumplan o se caigan, y los partidos a punto de empezar."
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: E.xxxl, gap: E.sm }}>
          <Tarjeta style={{ marginHorizontal: E.lg, overflow: 'hidden' }}>
            {lista.map((a, i) => (
              <View key={a.id}>
                {i > 0 ? <Separador /> : null}
                <Pulsable
                  onPress={() => {
                    if (a.ruta) router.push(a.ruta as never);
                  }}
                  style={{ padding: E.md, gap: 3 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.sm }}>
                    <Txt v="cuerpoFuerte" style={{ flex: 1 }}>
                      {a.titulo}
                    </Txt>
                    <Txt v="mini" color={C.texto3}>
                      {cuandoFue(a.cuando)}
                    </Txt>
                  </View>
                  <Txt v="pequeno" color={C.texto2}>
                    {a.cuerpo}
                  </Txt>
                </Pulsable>
              </View>
            ))}
          </Tarjeta>

          <Pulsable onPress={borra} style={{ padding: E.md, alignItems: 'center' }}>
            <Txt v="pequeno" color={C.texto3}>
              Borrar el historial
            </Txt>
          </Pulsable>
        </ScrollView>
      )}
    </View>
  );
}
