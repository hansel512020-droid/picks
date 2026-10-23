import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Fuego, Tarjeta, TituloSeccion, Txt, Vacio } from '@/componentes/base';
import { BotonCompeticion } from '@/componentes/carruseles';
import { Aparece } from '@/componentes/movimiento';
import { FundidoInferior, Resplandor } from '@/componentes/marca';
import { TiraChips } from '@/componentes/navegacion';
import { TarjetaPick } from '@/componentes/pick';
import { masGuardados } from '@/datos/comunidad';
import { competicion } from '@/datos/competiciones';
import type { Familia, Pick } from '@/datos/tipos';
import { useComunidad } from '@/estado/comunidad';
import { useTienda } from '@/estado/tienda';
import { usePicksVigentes } from '@/estado/vivo';
import { C, COLUMNA, E, HUECO_PESTANAS, R } from '@/tema';
import { usePicksDelServidor } from '@/utiles/picks';
import { useRejilla } from '@/utiles/rejilla';

/**
 * Lo que esta guardando el resto de la gente. Es la misma lista de picks, pero
 * ordenada por el contador de la llama en vez de por la ventaja.
 */

/**
 * La jornada: lo que se juega en los próximos tres días. Contando todo lo que
 * viene, la cabecera decía "10.661 picks en cartel" y la lista mezclaba
 * partidos de la semana que viene con los de esta tarde.
 */
const JORNADA_MS = 3 * 86_400_000;

/** Cada cuánto se vuelve a pedir la lista de los más guardados. */
const CADA_REFRESCO = 60_000;

const SIN_PICKS: Pick[] = [];

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

  // La misma lista del servidor; aquí se reordena por guardados más abajo.
  const todos = usePicksDelServidor(competicionId);
  const deLaJornada = useMemo(() => {
    if (!todos) return undefined;
    const hasta = Date.now() + JORNADA_MS;
    return todos.filter((p) => Date.parse(p.cuando ?? '') <= hasta);
  }, [todos]);
  // Sin los partidos que ya han empezado: esos ya no se pueden apostar.
  const vigentes = usePicksVigentes(deLaJornada ?? SIN_PICKS);
  const picks = deLaJornada ? vigentes : undefined;

  /*
   * Los más guardados, preguntados al servidor de una vez.
   *
   * El contador de cada tarjeta solo se pide cuando la tarjeta aparece en
   * pantalla, así que de los miles de picks de la jornada la app no sabía
   * cuáles tenían guardados hasta verlos: la pantalla sumaba ceros, decía "0
   * guardados" y ordenaba al azar. Ahora pide directamente el ranking.
   */
  const [ranking, setRanking] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    let vivo = true;
    const trae = () =>
      masGuardados(competicionId, 500).then((filas) => {
        if (vivo) setRanking(new Map(filas.map((f) => [f.pickId, f.total])));
      });
    trae();
    const reloj = setInterval(trae, CADA_REFRESCO);
    return () => {
      vivo = false;
      clearInterval(reloj);
    };
  }, [competicionId]);

  /*
   * Los guardados de verdad, no los que inventa el generador.
   *
   * Esta pantalla se llama "Comunidad" y decía cuánta gente había guardado
   * cada pick sumando un número que sale de una fórmula con azar dentro. Con el
   * contador real detrás, aquí se enseña lo que hay: si nadie ha guardado nada
   * todavía, cero. Un cero honesto vale más que un número inventado.
   *
   * `cuenta` devuelve indefinido cuando no hay servidor detrás; entonces no hay
   * nada que contar y es cero, no un número inventado.
   */
  const comunidad = useComunidad();
  // El mayor de los dos: el ranking puede ir un minuto por detrás de un
  // guardado que el usuario acaba de hacer.
  const guardadosDe = useCallback(
    (p: Pick) => Math.max(ranking.get(p.id) ?? 0, comunidad.cuenta(p.id) ?? 0),
    [comunidad, ranking],
  );

  /*
   * Primero los más guardados y, a igualdad (o si nadie ha guardado nada
   * todavía), los de más probabilidad: los mejores de la jornada, no un
   * orden al azar.
   */
  const visibles = useMemo(
    () =>
      (picks ?? [])
        .filter((p) => filtro === 'todos' || p.familia === filtro)
        .sort((a, b) => guardadosDe(b) - guardadosDe(a) || b.probabilidad - a.probabilidad),
    [picks, filtro, guardadosDe],
  );

  const totalGuardados = useMemo(
    () => (picks ?? []).reduce((a, p) => a + guardadosDe(p), 0),
    [picks, guardadosDe],
  );
  const conApoyo = useMemo(
    () => (picks ?? []).filter((p) => guardadosDe(p) > 0).length,
    [picks, guardadosDe],
  );

  const comp = competicion(competicionId);
  const { columnas, fila, celda, lista } = useRejilla();

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top }}>
      <Resplandor />
      <FlatList
        key={columnas}
        numColumns={columnas}
        columnWrapperStyle={fila}
        data={visibles}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[
          { paddingBottom: HUECO_PESTANAS + insets.bottom, gap: E.md },
          COLUMNA.amplia,
        ]}
        showsVerticalScrollIndicator={false}
        {...lista}
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

            <Tarjeta style={{ marginHorizontal: E.lg, padding: E.lg, gap: E.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.md }}>
                <Fuego n={totalGuardados} grande />
                <View style={{ flex: 1 }}>
                  <Txt v="cuerpoFuerte">Lo que guarda la gente esta jornada</Txt>
                  {/* "Esta jornada" son los próximos tres días: se dice. */}
                  <Txt v="pequeno" color={C.texto3}>
                    en {comp.nombre}
                  </Txt>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: E.sm }}>
                {[
                  { n: totalGuardados, texto: 'guardados', color: C.ambar },
                  { n: conApoyo, texto: 'picks con apoyo', color: C.texto },
                  { n: picks?.length ?? 0, texto: 'picks en 3 días', color: C.texto },
                ].map((d) => (
                  <View
                    key={d.texto}
                    style={{
                      flex: 1,
                      paddingVertical: E.md,
                      alignItems: 'center',
                      gap: 2,
                      borderRadius: R.md,
                      backgroundColor: C.carta2,
                    }}
                  >
                    <Txt v="titulo" color={d.n ? d.color : C.texto3}>
                      {d.n}
                    </Txt>
                    <Txt v="mini" color={C.texto3}>
                      {d.texto}
                    </Txt>
                  </View>
                ))}
              </View>
              <Txt v="mini" color={C.texto3}>
                El número naranja de cada tarjeta es la gente que guardó ese pick. Cuanto más alto, más
                consenso hay detrás.
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
              <TituloSeccion>
                {totalGuardados ? 'Los más guardados 🔥' : 'Los mejores de la jornada'}
              </TituloSeccion>
              {totalGuardados ? null : (
                <Txt v="pequeno" color={C.texto3} style={{ marginTop: 4 }}>
                  Todavía nadie ha guardado picks de estos partidos. Mientras tanto, van primero los de
                  más probabilidad: guarda uno y será el primero de la lista.
                </Txt>
              )}
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <Aparece orden={index} style={[celda ?? { paddingHorizontal: E.lg }, { gap: 6 }]}>
            <Txt v="etiqueta" color={index < 3 ? C.ambar : C.texto3}>
              #{index + 1}
            </Txt>
            <TarjetaPick pick={item} />
          </Aparece>
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
      {/* La lista se desvanece antes de llegar a la barra flotante. */}
      <FundidoInferior />
    </View>
  );
}
