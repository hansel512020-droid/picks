import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Fuego, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { BotonCompeticion } from '@/componentes/carruseles';
import { TiraChips } from '@/componentes/navegacion';
import { TarjetaPick } from '@/componentes/pick';
import { competicion } from '@/datos/competiciones';
import { picksComunidad } from '@/datos/picks';
import type { Familia } from '@/datos/tipos';
import { useTienda } from '@/estado/tienda';
import { C, E } from '@/tema';
import { useCalculo } from '@/utiles/carga';

/**
 * Lo que esta guardando el resto de la gente. Es la misma lista de picks, pero
 * ordenada por el contador de la llama en vez de por la ventaja.
 */

const FILTROS: { id: Familia | 'todos'; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'goles', texto: 'Goles' },
  { id: 'tiros', texto: 'Tiros' },
  { id: 'resultado', texto: 'Resultado' },
  { id: 'corners', texto: 'Córners' },
  { id: 'tarjetas', texto: 'Tarjetas' },
];

export default function Comunidad() {
  const { ajustes } = useTienda();
  const insets = useSafeAreaInsets();
  const [filtro, setFiltro] = useState<Familia | 'todos'>('todos');
  const competicionId = ajustes.competicionId;

  const picks = useCalculo(
    () => picksComunidad(competicionId, ajustes.casaId, 60),
    [competicionId, ajustes.casaId],
  );

  const visibles = useMemo(
    () => (picks ?? []).filter((p) => filtro === 'todos' || p.familia === filtro),
    [picks, filtro],
  );

  const totalGuardados = useMemo(
    () => (picks ?? []).reduce((a, p) => a + p.fuego, 0),
    [picks],
  );

  const comp = competicion(competicionId);

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top }}>
      <FlatList
        data={visibles}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: E.xxxl, gap: E.md }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: E.lg, marginBottom: E.xs }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: E.lg,
                paddingVertical: E.md,
              }}
            >
              <Txt v="titulo">Comunidad</Txt>
              <BotonCompeticion competicionId={competicionId} />
            </View>

            <Tarjeta style={{ marginHorizontal: E.lg, padding: E.lg, gap: E.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.md }}>
                <Fuego n={totalGuardados} grande />
                <View style={{ flex: 1 }}>
                  <Txt v="cuerpoFuerte">Picks guardados esta jornada</Txt>
                  <Txt v="pequeno" color={C.texto3}>
                    en {comp.nombre}
                  </Txt>
                </View>
              </View>
              <Txt v="pequeno" color={C.texto2}>
                El número naranja de cada tarjeta es la gente que guardó ese pick. Cuanto más alto,
                más consenso hay detrás.
              </Txt>
            </Tarjeta>

            <TiraChips>
              {FILTROS.map((f) => (
                <Chip
                  key={f.id}
                  texto={f.texto}
                  activo={filtro === f.id}
                  // Pulsar el filtro activo lo quita y vuelve a verse todo.
                  onPress={() => setFiltro(filtro === f.id ? 'todos' : f.id)}
                />
              ))}
            </TiraChips>

            <View style={{ paddingHorizontal: E.lg }}>
              <Txt v="subtitulo">Los más guardados 🔥</Txt>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={{ paddingHorizontal: E.lg, gap: 6 }}>
            <Txt v="etiqueta" color={C.texto3}>
              #{index + 1}
            </Txt>
            <TarjetaPick pick={item} />
          </View>
        )}
        ListEmptyComponent={
          picks === undefined ? (
            <View style={{ paddingVertical: E.xxxl, alignItems: 'center', gap: E.md }}>
              <ActivityIndicator color={C.lima} />
              <Txt v="pequeno" color={C.texto3}>
                Contando guardados…
              </Txt>
            </View>
          ) : (
            <Vacio icono="rayo" titulo="Nada por aquí todavía" detalle="Prueba con otro mercado." />
          )
        }
      />
    </View>
  );
}
