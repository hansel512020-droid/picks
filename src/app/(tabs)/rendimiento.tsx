import { seJuegaAhora } from '@/datos/envivo';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Pulsable, Separador, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { Icono } from '@/componentes/iconos';
import { Dato, TiraChips } from '@/componentes/navegacion';
import { Escudo } from '@/componentes/imagen';
import { Avatar } from '@/componentes/pick';
import { temporada } from '@/datos/motor';
import type { PickGuardado, ResultadoPick } from '@/datos/tipos';
import { useTienda } from '@/estado/tienda';
import { usePartidoDelPick, useVivo } from '@/estado/vivo';
import { C, E, R } from '@/tema';

/**
 * Historial de picks guardados y como han salido. El porcentaje de acierto y
 * el retorno se calculan a una unidad por pick, que es la unica forma honesta
 * de comparar picks con cuotas distintas.
 */

type Pestana = 'todos' | 'pendiente' | 'ganado' | 'perdido';

const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'pendiente', texto: 'Pendientes' },
  { id: 'ganado', texto: 'Ganados' },
  { id: 'perdido', texto: 'Perdidos' },
];

type Periodo = 7 | 30 | 90 | 0;

const PERIODOS: { id: Periodo; texto: string }[] = [
  { id: 0, texto: 'Todo el historial' },
  { id: 7, texto: 'Últimos 7 días' },
  { id: 30, texto: 'Últimos 30 días' },
  { id: 90, texto: 'Últimos 90 días' },
];

function Estado({ resultado }: { resultado: ResultadoPick }) {
  const mapa = {
    ganado: { icono: 'check' as const, color: C.verde, fondo: C.verdeTenue },
    perdido: { icono: 'cruz' as const, color: C.rojo, fondo: C.rojoTenue },
    pendiente: { icono: 'menos' as const, color: C.texto3, fondo: C.carta2 },
    nulo: { icono: 'menos' as const, color: C.texto3, fondo: C.carta2 },
  };
  const { icono, color, fondo } = mapa[resultado];
  return (
    /*
     * Es un indicador, no un botón, y hay que dejarlo claro de dos maneras:
     *
     *  · `pointerEvents="none"` para que no se coma el toque de la fila. Un
     *    círculo con un "–" dentro parece un "quitar", y al pulsarlo pasaban
     *    cosas que el usuario no había pedido.
     *  · el pendiente usa un reloj, no un menos: el menos significa "eliminar"
     *    en cualquier interfaz, y esto solo quiere decir "aún no se sabe".
     */
    <View
      pointerEvents="none"
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: fondo,
      }}
    >
      {resultado === 'pendiente' || resultado === 'nulo' ? (
        <Txt v="mini" color={color}>
          {resultado === 'nulo' ? '—' : '⏱'}
        </Txt>
      ) : (
        <Icono nombre={icono} tam={13} color={color} grosor={2.4} />
      )}
    </View>
  );
}

function FilaGuardado({ g, onQuitar }: { g: PickGuardado; onQuitar: () => void }) {
  // Cómo va ahora mismo, si su partido se está jugando.
  const { progreso } = useVivo();
  const marcha = progreso.get(g.pickId);
  const enVivo = usePartidoDelPick(g);
  const jugando = seJuegaAhora(enVivo?.estado);

  /*
   * Los nombres se resuelven al dibujar, no se leen de lo guardado. Un pick
   * guardado hace días trae el texto de entonces —"ATP vs RBB"—, y así también
   * los viejos salen con el club entero: "Athletico-PR vs Red Bull
   * Bragantino".
   */
  const delPartido = useMemo(() => {
    try {
      const t = temporada(g.competicionId);
      const p = t.porPartido.get(g.partidoId);
      if (!p) return null;
      const local = t.porEquipo.get(p.localId);
      const visitante = t.porEquipo.get(p.visitanteId);
      if (!local || !visitante) return null;
      return {
        enfrentamiento: `${local.nombre} vs ${visitante.nombre}`,
        fecha: p.fecha,
        local: local.nombre,
        visitante: visitante.nombre,
      };
    } catch {
      return null;
    }
  }, [g.competicionId, g.partidoId]);

  /*
   * Cuántos goles lleva el equipo del pick, sacado del marcador en vivo.
   *
   * Un "1-0" a secas no responde a la pregunta que tiene el usuario delante:
   * si el pick es "menos de 1.5 goles del equipo" de The Strongest, hace falta
   * saber si ese gol es suyo o del rival. Para los goles no hay que pedir el
   * acta: basta con mirar de qué lado juega.
   */
  const golesDelSujeto = useMemo(() => {
    if (!enVivo || !delPartido || g.sujeto !== 'equipo') return null;
    if (!g.pickId.includes('-goles-')) return null;
    const suyoEsLocal = g.titulo === delPartido.local;
    return suyoEsLocal ? enVivo.golesLocal : enVivo.golesVisitante;
  }, [enVivo, delPartido, g.sujeto, g.pickId, g.titulo]);

  // El título de un pick de partido es el enfrentamiento; el de jugador o
  // equipo es el nombre del sujeto y ese no hay que rehacerlo.
  const titulo =
    g.sujeto === 'partido' && delPartido ? delPartido.enfrentamiento : g.titulo;

  const cuando = delPartido
    ? new Date(delPartido.fecha).toLocaleString('es', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const contexto = delPartido
    ? `${g.sujeto === 'partido' ? '' : `${delPartido.enfrentamiento} · `}${cuando}`
    : g.contexto;

  /*
   * El color de la tarjeta cuenta el desenlace de un vistazo: verde si está
   * ganado, rojo si está perdido. Mientras se juega se queda neutra, que un
   * pick a medias no es ninguna de las dos cosas.
   */
  const borde =
    g.resultado === 'ganado' ? C.verde : g.resultado === 'perdido' ? C.rojo : undefined;
  const fondo =
    g.resultado === 'ganado' ? '#111A14' : g.resultado === 'perdido' ? '#1A1315' : undefined;

  return (
    <Tarjeta
      style={{
        marginHorizontal: E.lg,
        overflow: 'hidden',
        ...(borde ? { borderColor: borde, borderWidth: 1.5, backgroundColor: fondo } : null),
      }}
    >
      {/* La franja sale en cuanto el partido está en juego, no cuando llega el
          acta: antes dependía de una consulta extra al detalle del partido y
          un pick de un partido en marcha se quedaba sin marcar. El "lleva X"
          se añade en cuanto ese detalle está, unos segundos después. */}
      {jugando ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: E.md,
            paddingVertical: 6,
            backgroundColor: C.rojo,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' }} />
          <Txt v="etiqueta" color="#FFF">
            {enVivo?.estado === 'descanso'
              ? 'DESCANSO'
              : (enVivo?.reloj ?? enVivo?.minuto)
                ? `${enVivo.reloj ?? enVivo.minuto}'`
                : 'EN JUEGO'}
          </Txt>
          <Txt v="pequenoFuerte" color="#FFF">
            {enVivo?.golesLocal}-{enVivo?.golesVisitante}
          </Txt>
          <View style={{ flex: 1 }} />
          {/* En palabras, no en jerga de mercado: "0 de -2.5" no se entiende.
              La línea es medio punto, así que para superar 1.5 hacen falta 2,
              y para no pasar de 2.5 el tope real son 2. */}
          {(() => {
            // El acta manda; si aún no ha llegado, para los goles vale el
            // marcador, que ya lo tenemos.
            const valor = marcha?.valor ?? golesDelSujeto;
            if (valor === null || valor === undefined) return null;
            const linea = marcha?.linea ?? Number(g.pickId.split('-').slice(-2)[0]);
            const sentido = marcha?.sentido ?? (g.pickId.endsWith('-mas') ? 'mas' : 'menos');
            if (!Number.isFinite(linea)) return null;

            const falta = Math.max(0, Math.ceil(linea) - valor);
            const texto =
              sentido === 'mas'
                ? falta === 0
                  ? `Lleva ${valor} · ¡cumplido!`
                  : `Lleva ${valor} · ${falta === 1 ? 'falta 1' : `faltan ${falta}`}`
                : `Lleva ${valor} · no puede pasar de ${Math.floor(linea)}`;
            return (
              <Txt v="pequenoFuerte" color="#FFF">
                {texto}
              </Txt>
            );
          })()}
        </View>
      ) : null}

      {/* Toda la fila abre el pick: desde el historial se quiere volver al
          análisis, y antes no había forma de llegar. */}
      <Pulsable
        onPress={() =>
          router.push(
            `/pick/${encodeURIComponent(g.pickId)}?comp=${g.competicionId}&partido=${encodeURIComponent(g.partidoId)}`,
          )
        }
        style={{ flexDirection: 'row', alignItems: 'center', gap: E.md, padding: E.md }}
      >
        <Avatar imagen={g.imagen} tam={34} nombres={g.nombres} sujeto={g.sujeto} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Txt v="cuerpoFuerte" numberOfLines={1} style={{ flexShrink: 1 }}>
              {titulo}
            </Txt>
            {/* El club junto al nombre, igual que en la tarjeta del pick. */}
            {g.equipo ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  maxWidth: '46%',
                }}
              >
                <Escudo nombre={g.equipo} tam={13} />
                <Txt v="mini" color={C.texto2} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {g.equipo}
                </Txt>
              </View>
            ) : null}
          </View>
          <Txt v="pequeno" color={C.texto2} numberOfLines={1}>
            {g.mercado}
          </Txt>
          <Txt v="mini" color={C.texto3} numberOfLines={1}>
            {contexto}
            {g.valorReal !== undefined ? ` · resultado: ${g.valorReal}` : ''}
          </Txt>
        </View>
        <Estado resultado={g.resultado} />
      </Pulsable>
      <Separador />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: E.md,
          paddingVertical: 10,
          backgroundColor: C.carta2,
        }}
      >
        <Txt v="pequeno" color={C.texto2}>
          Cuota <Txt v="pequenoFuerte" color={C.texto}>{`@${g.cuota.toFixed(2)}`}</Txt>
        </Txt>
        <Pulsable onPress={onQuitar} hitSlop={8}>
          <Txt v="pequeno" color={C.texto3}>
            Quitar
          </Txt>
        </Pulsable>
      </View>
    </Tarjeta>
  );
}

export default function Rendimiento() {
  const { guardados: crudos, quitar } = useTienda();
  const { resueltos: enVivo } = useVivo();

  // Un pick que ESPN ya ha resuelto no espera a la próxima importación para
  // aparecer aquí como ganado o perdido.
  const guardados = useMemo(
    () =>
      crudos.map((g) => {
        if (g.resultado !== 'pendiente') return g;
        const v = enVivo.get(g.pickId);
        return v ? { ...g, resultado: v.resultado, valorReal: v.valorReal } : g;
      }),
    [crudos, enVivo],
  );
  const insets = useSafeAreaInsets();
  const [pestana, setPestana] = useState<Pestana>('todos');
  const [periodo, setPeriodo] = useState<Periodo>(0);
  const [menu, setMenu] = useState(false);

  const delPeriodo = useMemo(() => {
    if (!periodo) return guardados;
    const desde = Date.now() - periodo * 86400000;
    return guardados.filter((g) => new Date(g.guardadoEn).getTime() >= desde);
  }, [guardados, periodo]);

  const resumen = useMemo(() => {
    const ganados = delPeriodo.filter((g) => g.resultado === 'ganado');
    const perdidos = delPeriodo.filter((g) => g.resultado === 'perdido');
    const resueltos = ganados.length + perdidos.length;
    const beneficio = ganados.reduce((a, g) => a + (g.cuota - 1), 0) - perdidos.length;
    return {
      acierto: resueltos ? (ganados.length / resueltos) * 100 : 0,
      total: delPeriodo.length,
      roi: resueltos ? (beneficio / resueltos) * 100 : 0,
      beneficio,
      resueltos,
    };
  }, [delPeriodo]);

  const visibles = useMemo(
    () => (pestana === 'todos' ? delPeriodo : delPeriodo.filter((g) => g.resultado === pestana)),
    [delPeriodo, pestana],
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top }}>
      <FlatList
        data={visibles}
        keyExtractor={(g) => g.pickId}
        contentContainerStyle={{ paddingBottom: E.xxxl, gap: E.sm }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: E.lg, marginBottom: E.sm }}>
            <View style={{ paddingHorizontal: E.lg, paddingVertical: E.md }}>
              <Txt v="titulo">Mi rendimiento</Txt>
            </View>

            <Tarjeta style={{ marginHorizontal: E.lg, padding: E.lg, gap: E.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Txt v="subtitulo">Rendimiento</Txt>
                <Pulsable
                  onPress={() => setMenu((v) => !v)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    borderRadius: R.sm,
                    borderWidth: 1,
                    borderColor: C.borde,
                    backgroundColor: C.carta2,
                  }}
                >
                  <Icono nombre="calendario" tam={14} color={C.texto2} />
                  <Txt v="pequeno" color={C.texto2}>
                    {PERIODOS.find((p) => p.id === periodo)?.texto}
                  </Txt>
                  <Icono nombre={menu ? 'flechaArriba' : 'flechaAbajo'} tam={13} color={C.texto2} />
                </Pulsable>
              </View>

              {menu ? (
                <View style={{ borderRadius: R.md, backgroundColor: C.carta2, overflow: 'hidden' }}>
                  {PERIODOS.map((p) => (
                    <Pulsable
                      key={p.id}
                      onPress={() => {
                        setPeriodo(p.id);
                        setMenu(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingHorizontal: E.md,
                        paddingVertical: 11,
                      }}
                    >
                      <Txt v="cuerpo" color={p.id === periodo ? C.lima : C.texto}>
                        {p.texto}
                      </Txt>
                      {p.id === periodo ? <Icono nombre="check" tam={14} color={C.lima} /> : null}
                    </Pulsable>
                  ))}
                </View>
              ) : null}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: C.carta2,
                  borderRadius: R.md,
                  paddingVertical: E.lg,
                }}
              >
                <Dato ancho valor={`${resumen.acierto.toFixed(1)}%`} etiqueta="Aciertos" />
                <View style={{ width: 1, height: 36, backgroundColor: C.borde }} />
                <Dato ancho valor={`${resumen.total}`} etiqueta="Picks" />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: E.md,
                  paddingVertical: 12,
                  borderRadius: R.md,
                  backgroundColor: resumen.roi >= 0 ? C.verdeTenue : C.rojoTenue,
                }}
              >
                <Txt v="cuerpo" color={resumen.roi >= 0 ? C.verde : C.rojo}>
                  Retorno de inversión
                </Txt>
                <Txt v="cuerpoFuerte" color={resumen.roi >= 0 ? C.verde : C.rojo}>
                  {resumen.roi >= 0 ? '+' : ''}
                  {resumen.roi.toFixed(1)}%
                </Txt>
              </View>

              {resumen.resueltos > 0 ? (
                <Txt v="mini" color={C.texto3}>
                  {resumen.resueltos} picks resueltos · beneficio de{' '}
                  {resumen.beneficio >= 0 ? '+' : ''}
                  {resumen.beneficio.toFixed(2)} unidades a 1 unidad por pick.
                </Txt>
              ) : null}
            </Tarjeta>

            <TiraChips>
              {PESTANAS.map((p) => (
                <Chip
                  key={p.id}
                  texto={p.texto}
                  activo={pestana === p.id}
                  onPress={() => setPestana(p.id)}
                />
              ))}
            </TiraChips>
          </View>
        }
        renderItem={({ item }) => <FilaGuardado g={item} onQuitar={() => quitar(item.pickId)} />}
        ListEmptyComponent={
          guardados.length === 0 ? (
            <View style={{ gap: E.lg, alignItems: 'center' }}>
              <Vacio
                icono="guardar"
                titulo="Aún no has guardado ningún pick"
                detalle="Guarda picks con el marcador de las tarjetas y aquí verás tu porcentaje de acierto y tu retorno."
              />
              <Pulsable
                onPress={() => router.push('/')}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: R.md,
                  backgroundColor: C.lima,
                }}
              >
                <Text style={{ fontWeight: '700', color: '#0A0B0D' }}>Ver picks destacados</Text>
              </Pulsable>
            </View>
          ) : (
            <Vacio icono="grafico" titulo="Nada en esta pestaña" />
          )
        }
      />
    </View>
  );
}
