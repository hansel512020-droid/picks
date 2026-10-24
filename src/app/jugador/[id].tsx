import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Insignia, Pulsable, Separador, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { Icono } from '@/componentes/iconos';
import { Cara, Escudo } from '@/componentes/imagen';
import { Resplandor } from '@/componentes/marca';
import { marca } from '@/componentes/movimiento';
import { CabeceraAtras, FilaDato, Segmentado, TiraChips } from '@/componentes/navegacion';
import { BarraL10 } from '@/componentes/pick';
import { competicion } from '@/datos/competiciones';
import { registrosDelJugador, temporada } from '@/datos/motor';
import { coma, linea as formatoLinea, METRICAS_JUGADOR } from '@/datos/picks';
import type { RegistroJugador } from '@/datos/tipos';
import { useTienda } from '@/estado/tienda';
import { C, COLUMNA, E, R } from '@/tema';
import { useCalculo } from '@/utiles/carga';
import { paisEnEspanol } from '@/utiles/paises';

/**
 * Ficha del jugador: mas de 30 metricas por partido, filtros de contexto
 * (fuera de casa, tras derrota, contra este rival) y la tabla de props con la
 * tasa de acierto de cada linea.
 */

type Vista = 'resumen' | 'registros' | 'props';
type Contexto = 'todos' | 'local' | 'visitante' | 'trasDerrota' | 'ultimos5' | 'titular';

const CONTEXTOS: { id: Contexto; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'ultimos5', texto: 'Últimos 5' },
  { id: 'local', texto: 'En casa' },
  { id: 'visitante', texto: 'Fuera' },
  { id: 'trasDerrota', texto: 'Tras derrota' },
  { id: 'titular', texto: 'De titular' },
];

const POSICIONES = { POR: 'Portero', DEF: 'Defensa', MED: 'Centrocampista', DEL: 'Delantero' };

/**
 * Las 30+ metricas que se muestran en el resumen, agrupadas como en la app.
 * Cada fila es [etiqueta, como se saca del registro, decimales, sufijo].
 */
type FilaMetrica = [string, (r: RegistroJugador) => number, number?, string?];

/** Lo que solo tiene sentido en un portero: a un delantero no se le cuentan goles encajados. */
const SOLO_PORTERO = new Set(['Paradas', 'Goles encajados']);

const GRUPOS: { titulo: string; filas: FilaMetrica[] }[] = [
  {
    titulo: 'Ataque',
    filas: [
      ['Goles', (r) => r.goles, 2],
      ['Asistencias', (r) => r.asistencias, 2],
      ['Remates', (r) => r.remates, 1],
      ['Remates a puerta', (r) => r.rematesPuerta, 1],
      ['Remates fuera', (r) => r.rematesFuera, 1],
      ['Remates bloqueados', (r) => r.rematesBloqueados, 1],
      ['xG', (r) => r.xg, 2],
      ['xA', (r) => r.xa, 2],
      ['Toques en el área', (r) => r.toquesArea, 1],
    ],
  },
  {
    titulo: 'Creación',
    filas: [
      ['Pases clave', (r) => r.pasesClave, 1],
      ['Pases intentados', (r) => r.pases, 0],
      ['Pases completados', (r) => r.pasesCompletados, 0],
      ['Precisión de pase', (r) => (r.pases ? (r.pasesCompletados / r.pases) * 100 : 0), 0, '%'],
      ['Centros', (r) => r.centros, 1],
      ['Centros completados', (r) => r.centrosCompletados, 1],
      ['Regates completados', (r) => r.regates, 1],
      ['Regates intentados', (r) => r.regatesIntentados, 1],
      ['Toques', (r) => r.toques, 0],
    ],
  },
  {
    titulo: 'Defensa y duelos',
    filas: [
      ['Entradas', (r) => r.entradas, 1],
      ['Intercepciones', (r) => r.intercepciones, 1],
      ['Despejes', (r) => r.despejes, 1],
      ['Duelos ganados', (r) => r.duelosGanados, 1],
      ['Duelos disputados', (r) => r.duelosTotales, 1],
      ['% de duelos ganados', (r) => (r.duelosTotales ? (r.duelosGanados / r.duelosTotales) * 100 : 0), 0, '%'],
      ['Paradas', (r) => r.paradas, 1],
      ['Goles encajados', (r) => r.golesEncajados, 1],
    ],
  },
  {
    titulo: 'Disciplina y minutos',
    filas: [
      ['Faltas cometidas', (r) => r.faltasCometidas, 1],
      ['Faltas recibidas', (r) => r.faltasRecibidas, 1],
      ['Tarjetas amarillas', (r) => r.amarillas, 2],
      ['Minutos', (r) => r.minutos, 0, 'min por partido'],
      ['Nota media', (r) => r.nota, 1, 'sobre 10'],
    ],
  },
];

export default function PantallaJugador() {
  const { id, comp } = useLocalSearchParams<{ id: string; comp: string }>();
  const { ajustes } = useTienda();
  const insets = useSafeAreaInsets();
  const competicionId = comp ?? ajustes.competicionId;
  const jugadorId = decodeURIComponent(id ?? '');

  const [vista, setVista] = useState<Vista>('resumen');
  const [contexto, setContexto] = useState<Contexto>('todos');

  const datos = useCalculo(() => {
    const t = temporada(competicionId);
    const jugador = t.porJugador.get(jugadorId);
    if (!jugador) return null;
    const equipo = t.porEquipo.get(jugador.equipoId)!;
    // Con "Todas", los de todas sus competiciones: Liga y Champions juntas.
    const registros = registrosDelJugador(t, jugadorId).filter((r) => r.minutos > 0);
    // Para "tras derrota" hace falta saber como acabo el partido anterior.
    const suyos = (t.partidosPorEquipo.get(equipo.id) ?? [])
      .filter((p) => p.estado === 'finalizado')
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    const trasDerrota = new Set<string>();
    suyos.forEach((p, i) => {
      const anterior = suyos[i - 1];
      if (!anterior) return;
      const perdio =
        anterior.localId === equipo.id
          ? anterior.golesLocal < anterior.golesVisitante
          : anterior.golesVisitante < anterior.golesLocal;
      if (perdio) trasDerrota.add(p.id);
    });
    /*
     * El próximo partido de verdad: el más cercano que no se ha jugado. Antes
     * era el primero marcado como "previa" en el orden del archivo, que podía
     * ser uno de hace semanas que se quedó sin actualizar.
     */
    const corte = new Date(Date.now() - 2.25 * 3_600_000).toISOString();
    const proximo = (t.partidosPorEquipo.get(equipo.id) ?? [])
      .filter((p) => p.estado === 'previa' && p.fecha >= corte)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
    /*
     * El rival se compara con los de SU competición, la del partido. Con
     * "Todas" se comparaba con los 1.800 equipos de todas las ligas a la vez:
     * "su defensa es la 1059ª de 1804" no dice nada.
     */
    const tc = proximo?.competicionId && proximo.competicionId !== competicionId
      ? temporada(proximo.competicionId)
      : t;
    const defensas = [...tc.equipos].sort((a, b) => b.defensa - a.defensa);
    /*
     * Qué publica la fuente en los partidos de este jugador.
     *
     * ESPN no da pases, regates, entradas, duelos ni xG, y la ficha los
     * enseñaba todos a 0,0 —media pantalla de ceros, y unos props de "pases
     * completados" al 0 % con cuota de 94—. Se mira en todos los jugadores de
     * sus partidos, no solo en él: un defensa que no ha marcado tiene sus 0
     * goles, que es un dato; una métrica que nadie tiene en esos partidos es
     * que no se publica, y no se enseña.
     */
    const deSusPartidos = registros.flatMap((r) => t.registrosPorPartido.get(r.partidoId) ?? []);
    const publicada = (f: (r: RegistroJugador) => number) => deSusPartidos.some((r) => f(r) > 0);
    return {
      jugador,
      equipo,
      registros,
      trasDerrota,
      publicada,
      rivales: t.porEquipo,
      partidos: t.porPartido,
      rankingDefensa: new Map(defensas.map((e, i) => [e.id, i + 1])),
      totalEquipos: tc.equipos.length,
      competicionRival: competicion(tc.competicionId).corto,
      proximo,
    };
  }, [competicionId, jugadorId]);

  const filtrados = useMemo(() => {
    if (!datos) return [];
    switch (contexto) {
      case 'local':
        return datos.registros.filter((r) => r.local);
      case 'visitante':
        return datos.registros.filter((r) => !r.local);
      case 'trasDerrota':
        return datos.registros.filter((r) => datos.trasDerrota.has(r.partidoId));
      case 'ultimos5':
        return datos.registros.slice(0, 5);
      case 'titular':
        return datos.registros.filter((r) => r.titular);
      default:
        return datos.registros;
    }
  }, [datos, contexto]);

  if (datos === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.lima} />
      </View>
    );
  }
  if (datos === null) {
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.md }}>
        <CabeceraAtras titulo="Jugador" />
        <Vacio icono="usuario" titulo="No encontramos ese jugador" />
      </View>
    );
  }

  const { jugador, equipo } = datos;
  const nacionalidad = paisEnEspanol(jugador.bandera, jugador.pais);
  const media = (f: (r: RegistroJugador) => number) =>
    filtrados.length ? filtrados.reduce((a, r) => a + f(r), 0) / filtrados.length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      <Resplandor />
      <CabeceraAtras titulo={jugador.nombre} subtitulo={`${equipo.nombre} · ${competicion(competicionId).corto}`} />

      <ScrollView
        {...marca('pagina')}
        contentContainerStyle={[{ paddingBottom: E.xxxl, gap: E.lg }, COLUMNA.lectura]}
        showsVerticalScrollIndicator={false}
      >
        {/* ----------------------------------------------------- identidad */}
        <View style={{ paddingHorizontal: E.lg }}>
          <Tarjeta style={{ padding: E.lg, gap: E.lg, overflow: 'hidden' }}>
            {/* El color de su club, de fondo, detrás de la cara. */}
            <View
              style={{
                pointerEvents: 'none',
                position: 'absolute',
                top: -70,
                left: -50,
                width: 240,
                height: 240,
                borderRadius: 120,
                backgroundColor: equipo.color || C.lima,
                opacity: 0.14,
              }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.lg }}>
              <Cara
                nombre={jugador.nombre}
                bandera={jugador.bandera}
                equipo={equipo.nombre}
                tam={84}
                estilo={{ borderColor: C.limaBorde, borderWidth: 2 }}
              />
              <View style={{ flex: 1, gap: 6 }}>
                <Txt v="display" titular numberOfLines={2}>
                  {jugador.nombre}
                </Txt>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {nacionalidad ? (
                    <Insignia texto={`${jugador.bandera} ${nacionalidad.toUpperCase()}`} />
                  ) : null}
                  <Insignia texto={POSICIONES[jugador.posicion].toUpperCase()} />
                  {jugador.dorsal ? <Insignia texto={`#${jugador.dorsal}`} /> : null}
                  {/* Sin edad conocida no se pone: un "0 AÑOS" parece un fallo. */}
                  {jugador.edad > 0 ? <Insignia texto={`${jugador.edad} AÑOS`} /> : null}
                  <Insignia
                    texto={jugador.rol === 'titular' ? 'TITULAR' : jugador.rol.toUpperCase()}
                    color={jugador.rol === 'titular' ? C.lima : C.texto2}
                    fondo={jugador.rol === 'titular' ? C.limaTenue : C.carta2}
                  />
                </View>
              </View>
            </View>

            {/* Su club, que lleva a la ficha del equipo. */}
            <Pulsable
              onPress={() => router.push(`/equipo/${encodeURIComponent(equipo.id)}?comp=${competicionId}`)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: E.md,
                padding: E.md,
                borderRadius: R.md,
                backgroundColor: C.carta2,
              }}
            >
              <Escudo nombre={equipo.nombre} id={equipo.id} bandera={equipo.bandera} corto={equipo.corto} tam={30} />
              <View style={{ flex: 1 }}>
                <Txt v="cuerpoFuerte">{equipo.nombre}</Txt>
                <Txt v="mini" color={C.texto3}>
                  {datos.registros.length} partidos con minutos ·{' '}
                  {(datos.registros.reduce((a, r) => a + r.minutos, 0) / Math.max(1, datos.registros.length)).toFixed(0)}{' '}
                  min de media
                </Txt>
              </View>
              <Icono nombre="flechaDerecha" tam={15} color={C.texto3} />
            </Pulsable>

            {/*
              Sus últimos partidos de un vistazo: la nota de cada uno, con un
              punto lima si marcó o dio una asistencia. El más reciente, a la
              derecha.
            */}
            {datos.registros.length ? (
              <View style={{ gap: 8 }}>
                <Txt v="mini" color={C.texto3}>
                  ÚLTIMOS {Math.min(10, datos.registros.length)} PARTIDOS
                </Txt>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {datos.registros
                    .slice(0, 10)
                    .reverse()
                    .map((r) => {
                      const color = r.nota >= 7.5 ? C.verde : r.nota >= 6.5 ? C.texto : r.nota >= 6 ? C.texto2 : C.rojo;
                      return (
                        <View
                          key={r.partidoId}
                          style={{
                            flex: 1,
                            maxWidth: 52,
                            alignItems: 'center',
                            gap: 4,
                            paddingVertical: 6,
                            borderRadius: R.sm,
                            backgroundColor: C.carta2,
                            borderWidth: 1,
                            borderColor: r.goles + r.asistencias > 0 ? C.limaBorde : C.borde,
                          }}
                        >
                          <Txt v="pequenoFuerte" color={color}>
                            {r.nota.toFixed(1)}
                          </Txt>
                          <View style={{ flexDirection: 'row', gap: 2, height: 5 }}>
                            {Array.from({ length: Math.min(3, r.goles + r.asistencias) }).map((_, k) => (
                              <View
                                key={k}
                                style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.lima }}
                              />
                            ))}
                          </View>
                        </View>
                      );
                    })}
                </View>
              </View>
            ) : null}
          </Tarjeta>
        </View>

        <View style={{ paddingHorizontal: E.lg }}>
          <Segmentado
            valor={vista}
            onCambia={setVista}
            opciones={[
              { id: 'resumen', texto: 'Resumen' },
              { id: 'props', texto: 'Props' },
              { id: 'registros', texto: 'Partidos' },
            ]}
          />
        </View>

        <TiraChips>
          {CONTEXTOS.map((c) => (
            <Chip key={c.id} texto={c.texto} activo={contexto === c.id} onPress={() => setContexto(c.id)} />
          ))}
        </TiraChips>

        {filtrados.length === 0 ? (
          <Vacio icono="filtro" titulo="Sin partidos en este contexto" />
        ) : null}

        {/* ------------------------------------------------------- resumen */}
        {vista === 'resumen' && filtrados.length > 0 ? (
          <View style={{ gap: E.lg }}>
            <View style={{ flexDirection: 'row', gap: E.sm, paddingHorizontal: E.lg }}>
              {[
                { v: filtrados.length.toString(), e: 'Partidos' },
                { v: String(filtrados.reduce((a, r) => a + r.goles, 0)), e: 'Goles' },
                { v: String(filtrados.reduce((a, r) => a + r.asistencias, 0)), e: 'Asistencias' },
                /*
                  Por cada 90 minutos de verdad: antes era la media por partido
                  con la etiqueta "/ 90", y un suplente de diez minutos contaba
                  lo mismo que un titular.
                */
                {
                  v: coma(
                    (filtrados.reduce((a, r) => a + r.goles + r.asistencias, 0) /
                      Math.max(1, filtrados.reduce((a, r) => a + r.minutos, 0))) *
                      90,
                    2,
                  ),
                  e: 'G+A / 90',
                },
                { v: coma(media((r) => r.nota), 1), e: 'Nota' },
              ].map((d) => (
                <Tarjeta key={d.e} style={{ flex: 1, alignItems: 'center', paddingVertical: E.md, gap: 2 }}>
                  <Txt v="titulo" titular>
                    {d.v}
                  </Txt>
                  <Txt v="mini" color={C.texto3}>
                    {d.e}
                  </Txt>
                </Tarjeta>
              ))}
            </View>

            {datos.proximo ? (
              <View style={{ paddingHorizontal: E.lg }}>
                <Tarjeta style={{ padding: E.md, gap: 6 }}>
                  <Txt v="cuerpoFuerte">Fuerza del emparejamiento</Txt>
                  {(() => {
                    const rivalId =
                      datos.proximo!.localId === equipo.id
                        ? datos.proximo!.visitanteId
                        : datos.proximo!.localId;
                    const rival = datos.rivales.get(rivalId);
                    const puesto = datos.rankingDefensa.get(rivalId) ?? 0;
                    const facil = puesto > datos.totalEquipos / 2;
                    return (
                      <>
                        <Txt v="pequeno" color={C.texto2}>
                          Próximo rival: {rival?.nombre}. Su defensa es la {puesto}ª de{' '}
                          {datos.totalEquipos} en {datos.competicionRival}.
                        </Txt>
                        <Insignia
                          texto={facil ? 'EMPAREJAMIENTO FAVORABLE' : 'EMPAREJAMIENTO DURO'}
                          color={facil ? C.verde : C.ambar}
                          fondo={facil ? C.verdeTenue : C.ambarTenue}
                        />
                      </>
                    );
                  })()}
                </Tarjeta>
              </View>
            ) : null}

            {GRUPOS.map((g) => ({
              ...g,
              filas: g.filas.filter(
                ([etiqueta, f]) =>
                  (!SOLO_PORTERO.has(etiqueta) || jugador.posicion === 'POR') && datos.publicada(f),
              ),
            }))
              .filter((g) => g.filas.length > 0)
              .map((g) => (
              <View key={g.titulo} style={{ gap: E.sm }}>
                <Txt v="pequenoFuerte" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
                  {g.titulo.toUpperCase()}
                </Txt>
                <Tarjeta style={{ marginHorizontal: E.lg, paddingHorizontal: E.md }}>
                  {g.filas.map(([etiqueta, f, dec, sufijo], i) => (
                    <View key={etiqueta}>
                      {i > 0 ? <Separador /> : null}
                      <FilaDato
                        etiqueta={etiqueta}
                        valor={coma(media(f), dec ?? 1)}
                        sufijo={sufijo ?? 'por partido'}
                      />
                    </View>
                  ))}
                </Tarjeta>
              </View>
            ))}
          </View>
        ) : null}

        {/* --------------------------------------------------------- props */}
        {vista === 'props' && filtrados.length > 0 ? (
          <View style={{ gap: E.sm, paddingHorizontal: E.lg }}>
            <Txt v="pequeno" color={C.texto3}>
              Cada línea con cuántas veces la superó en la muestra seleccionada.
            </Txt>
            {METRICAS_JUGADOR.filter(
              (m) =>
                (!m.posiciones || m.posiciones.includes(jugador.posicion)) &&
                datos.publicada(m.extractor),
            ).map((m) => {
              const valores = filtrados.map(m.extractor);
              const mediaMetrica = valores.reduce((a, b) => a + b, 0) / valores.length;
              return (
                <Tarjeta key={m.clave} style={{ padding: E.md, gap: E.sm }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Txt v="cuerpoFuerte">{m.etiqueta}</Txt>
                    <Txt v="pequeno" color={C.texto2}>
                      {coma(mediaMetrica, 2)} de media
                    </Txt>
                  </View>
                  {m.lineas.map((l) => {
                    const aciertos = valores.filter((v) => v > l).length;
                    const tasa = (aciertos / valores.length) * 100;
                    return (
                      <View
                        key={l}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: E.sm,
                          backgroundColor: C.carta2,
                          borderRadius: R.sm,
                          paddingHorizontal: E.md,
                          paddingVertical: 9,
                        }}
                      >
                        <Txt v="pequeno" style={{ width: 74 }}>
                          Más de {formatoLinea(l)}
                        </Txt>
                        <View style={{ flex: 1 }}>
                          <BarraL10
                            compacta
                            etiqueta={`${valores.length}`}
                            racha={valores.slice(0, 10).map((v) => v > l)}
                            porcentaje={tasa}
                          />
                        </View>
                        <Txt
                          v="pequenoFuerte"
                          color={tasa >= 70 ? C.lima : C.texto2}
                          style={{ width: 42, textAlign: 'right' }}
                        >
                          {/* Aquí iba un precio estimado; ahora, las veces que la superó. */}
                          {aciertos}/{valores.length}
                        </Txt>
                      </View>
                    );
                  })}
                </Tarjeta>
              );
            })}
          </View>
        ) : null}

        {/* ------------------------------------------------------ registros */}
        {vista === 'registros' && filtrados.length > 0 ? (
          <View style={{ paddingHorizontal: E.lg, gap: E.sm }}>
            {filtrados.map((r) => {
              const rival = datos.rivales.get(r.rivalId);
              const partido = datos.partidos.get(r.partidoId);
              return (
                <Pulsable
                  key={r.partidoId}
                  onPress={() =>
                    router.push(`/partido/${encodeURIComponent(r.partidoId)}?comp=${competicionId}`)
                  }
                >
                  <Tarjeta style={{ padding: E.md, gap: E.sm }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Txt v="mini" color={C.texto3}>
                          {r.local ? 'vs' : '@'}
                        </Txt>
                        <Escudo nombre={rival?.nombre ?? ""} id={rival?.id} bandera={rival?.bandera} corto={rival?.corto} tam={22} />
                        {/* El nombre entero: en una lista de partidos, "RIP"
                            no dice contra quién se jugó. */}
                        <Txt v="cuerpoFuerte" numberOfLines={1} style={{ flexShrink: 1 }}>
                          {rival?.nombre}
                        </Txt>
                        {partido ? (
                          <Txt v="pequeno" color={C.texto2}>
                            {r.local
                              ? `${partido.golesLocal}-${partido.golesVisitante}`
                              : `${partido.golesVisitante}-${partido.golesLocal}`}
                          </Txt>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Txt v="mini" color={C.texto3}>
                          {new Date(r.fecha).toLocaleDateString('es', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </Txt>
                        <Insignia
                          texto={r.nota.toFixed(1)}
                          color={r.nota >= 7 ? C.verde : r.nota >= 6 ? C.texto : C.rojo}
                          fondo={C.carta2}
                        />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {(
                        [
                          [`${r.minutos}'`, 'min', null],
                          [`${r.goles}`, 'gol', null],
                          [`${r.asistencias}`, 'asis', null],
                          [`${r.remates}`, 'rem', (x: RegistroJugador) => x.remates],
                          [`${r.rematesPuerta}`, 'a puerta', (x: RegistroJugador) => x.rematesPuerta],
                          [`${r.pasesClave}`, 'p. clave', (x: RegistroJugador) => x.pasesClave],
                          [`${r.regates}`, 'reg', (x: RegistroJugador) => x.regates],
                          [`${r.entradas}`, 'ent', (x: RegistroJugador) => x.entradas],
                          [`${r.duelosGanados}`, 'duelos', (x: RegistroJugador) => x.duelosGanados],
                          [`${r.pasesCompletados}`, 'pases', (x: RegistroJugador) => x.pasesCompletados],
                        ] as const
                      )
                        .filter(([, , f]) => !f || datos.publicada(f))
                        .map(([v, e]) => (
                        <View
                          key={e}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'baseline',
                            gap: 3,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: R.xs,
                            backgroundColor: C.carta2,
                          }}
                        >
                          <Txt v="pequenoFuerte">{v}</Txt>
                          <Txt v="mini" color={C.texto3}>
                            {e}
                          </Txt>
                        </View>
                      ))}
                    </View>
                  </Tarjeta>
                </Pulsable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
