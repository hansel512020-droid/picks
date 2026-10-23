import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Txt, Vacio } from '@/componentes/base';
import { CabeceraAtras, TiraChips } from '@/componentes/navegacion';
import { Aparece, marca } from '@/componentes/movimiento';
import { TarjetaPick } from '@/componentes/pick';
import { competicion } from '@/datos/competiciones';
import { FAMILIAS } from '@/datos/picks';
import type { Familia } from '@/datos/tipos';
import { useTienda } from '@/estado/tienda';
import { C, COLUMNA, E } from '@/tema';
import { usePicksDelServidor } from '@/utiles/picks';
import { useRejilla } from '@/utiles/rejilla';

/** Lista completa de picks de la competicion activa: el "Ver todo" de la portada. */
export default function TodosLosPicks() {
  const { ajustes } = useTienda();
  const insets = useSafeAreaInsets();
  const [familias, setFamilias] = useState<Familia[]>([]);
  const competicionId = ajustes.competicionId;

  const picks = usePicksDelServidor(competicionId);

  const visibles = useMemo(
    () => (picks ?? []).filter((p) => !familias.length || familias.includes(p.familia)),
    [picks, familias],
  );
  const { columnas, fila, celda, lista } = useRejilla();

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      <CabeceraAtras
        titulo="Todos los picks"
        subtitulo={`${competicion(competicionId).nombre} · ${visibles.length} oportunidades`}
        ancho="amplia"
      />
      <TiraChips estilo={[{ marginBottom: E.md }, COLUMNA.amplia]}>
        {FAMILIAS.map((f) => (
          <Chip
            key={f.id}
            texto={f.nombre}
            activo={familias.includes(f.id)}
            onPress={() =>
              setFamilias((prev) =>
                prev.includes(f.id) ? prev.filter((x) => x !== f.id) : [...prev, f.id],
              )
            }
          />
        ))}
      </TiraChips>

      <FlatList
        {...marca('pagina')}
        key={columnas}
        numColumns={columnas}
        columnWrapperStyle={fila}
        data={visibles}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[{ paddingBottom: E.xxxl, gap: E.md }, COLUMNA.amplia]}
        showsVerticalScrollIndicator={false}
        {...lista}
        renderItem={({ item, index }) => (
          <Aparece orden={index} style={celda ?? { paddingHorizontal: E.lg }}>
            <TarjetaPick pick={item} />
          </Aparece>
        )}
        ListEmptyComponent={
          picks === undefined ? (
            <View style={{ paddingVertical: E.xxxl, alignItems: 'center', gap: E.md }}>
              <ActivityIndicator color={C.lima} />
              <Txt v="pequeno" color={C.texto3}>
                Buscando oportunidades…
              </Txt>
            </View>
          ) : (
            <Vacio icono="filtro" titulo="Sin picks con estos filtros" />
          )
        }
      />
    </View>
  );
}
