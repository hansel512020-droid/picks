import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Insignia, Pulsable, Separador, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { Escudo, LogoCompeticion } from '@/componentes/imagen';
import { CabeceraAtras, FilaDato, Segmentado } from '@/componentes/navegacion';
import { competicion, competicionOpcional } from '@/datos/competiciones';
import { partidosDelEquipoEnTodas } from '@/datos/importado';
import { temporada } from '@/datos/motor';
import { coma } from '@/datos/picks';
import type { Partido } from '@/datos/tipos';
import { useTienda } from '@/estado/tienda';
import { C, E, R } from '@/tema';
import { useCalculo } from '@/utiles/carga';

/** Ficha de equipo: forma, medias por partido, plantilla y calendario. */

type Vista = 'forma' | 'plantilla' | 'calendario';
type Donde = 'todos' | 'local' | 'visitante';

export default function PantallaEquipo() {
  const { id, comp } = useLocalSearchParams<{ id: string; comp: string }>();
  const { ajustes } = useTienda();
  const insets = useSafeAreaInsets();
  const competicionId = comp ?? ajustes.competicionId;
  const equipoId = decodeURIComponent(id ?? '');

  const [vista, setVista] = useState<Vista>('forma');
  const [donde, setDonde] = useState<Donde>('todos');
  // Sumar lo que hace el equipo en el resto de competiciones importadas.
  const [todasLasCompeticiones, setTodas] = useState(true);

  const datos = useCalculo(() => {
    const t = temporada(competicionId);
    const equipo = t.porEquipo.get(equipoId);
    if (!equipo) return null;
    const suyos = (t.partidosPorEquipo.get(equipoId) ?? []).sort((a, b) =>
      a.fecha.localeCompare(b.fecha),
    );

    // Lo que hace este mismo equipo en las demás competiciones importadas: su
    // liga si estamos en una copa, la copa si estamos en su liga. Es lo que
    // permite juzgar a un peruano en la Libertadores sin quedarse en los
    // cuatro partidos que lleva del torneo.
    const otras = partidosDelEquipoEnTodas(equipo.nombre, equipo.bandera).filter(
      (x) => x.competicionId !== competicionId,
    );
    const porCompeticion = new Map<string, { jugados: number; ganados: number }>();
    for (const { competicionId: otra, partido, esLocal } of otras) {
      if (partido.estado !== 'finalizado') continue;
      const r = porCompeticion.get(otra) ?? { jugados: 0, ganados: 0 };
      r.jugados++;
      const gf = esLocal ? partido.golesLocal : partido.golesVisitante;
      const gc = esLocal ? partido.golesVisitante : partido.golesLocal;
      if (gf > gc) r.ganados++;
      porCompeticion.set(otra, r);
    }

    return {
      equipo,
      jugados: suyos.filter((p) => p.estado === 'finalizado'),
      proximos: suyos.filter((p) => p.estado !== 'finalizado').slice(0, 8),
      plantilla: t.jugadores
        .filter((j) => j.equipoId === equipoId)
        .sort((a, b) => b.nivel - a.nivel),
      equipos: t.porEquipo,
      registros: t.registrosPorJugador,
      // Partidos de otras competiciones, listos para mezclar con los de esta.
      deOtras: otras
        .filter((x) => x.partido.estado === 'finalizado')
        .map((x) => ({ ...x.partido, esLocalEnOtra: x.esLocal, otraCompeticion: x.competicionId })),
      resumenOtras: [...porCompeticion.entries()].map(([id, r]) => ({ id, ...r })),
    };
  }, [competicionId, equipoId]);

  const filtrados = useMemo(() => {
    if (!datos) return [];
    // Con "todas" se suman los partidos de las demás competiciones, ordenados
    // por fecha: la forma del equipo es la de verdad, no la de un solo torneo.
    /*
     * Sin partidos repetidos.
     *
     * Con la competición activa en "todas", `jugados` ya trae los de todos los
     * torneos, y `deOtras` los volvía a añadir: el mismo partido entraba dos
     * veces y React avisaba de dos hijos con la misma clave. Además de ensuciar
     * la lista, falseaba las medias, que se calculan sobre estos partidos y
     * contaban algunos por duplicado.
     */
    const base = todasLasCompeticiones
      ? [...datos.jugados, ...datos.deOtras]
          .filter((p, i, todos) => todos.findIndex((o) => o.id === p.id) === i)
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
      : datos.jugados;
    const esLocalAqui = (p: (typeof base)[number]) =>
      'esLocalEnOtra' in p ? (p as { esLocalEnOtra: boolean }).esLocalEnOtra : p.localId === equipoId;
    if (donde === 'local') return base.filter((p) => esLocalAqui(p));
    if (donde === 'visitante') return base.filter((p) => !esLocalAqui(p));
    return base;
  }, [datos, donde, equipoId, todasLasCompeticiones]);

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
        <CabeceraAtras titulo="Equipo" />
        <Vacio icono="escudo" titulo="No encontramos ese equipo" />
      </View>
    );
  }

  const { equipo } = datos;
  // Un partido de otra competición tiene otros identificadores de equipo, así
  // que trae marcado de qué lado jugaba.
  const esLocal = (p: Partido) =>
    'esLocalEnOtra' in p ? !!(p as { esLocalEnOtra?: boolean }).esLocalEnOtra : p.localId === equipoId;
  const media = (f: (p: Partido, l: boolean) => number) =>
    filtrados.length ? filtrados.reduce((a, p) => a + f(p, esLocal(p)), 0) / filtrados.length : 0;

  const resultado = (p: Partido) => {
    const gf = esLocal(p) ? p.golesLocal : p.golesVisitante;
    const gc = esLocal(p) ? p.golesVisitante : p.golesLocal;
    return gf > gc ? 'G' : gf === gc ? 'E' : 'P';
  };
  const ultimos = filtrados.slice(-10).reverse();
  const victorias = filtrados.filter((p) => resultado(p) === 'G').length;
  const empates = filtrados.filter((p) => resultado(p) === 'E').length;

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      <CabeceraAtras titulo={equipo.nombre} subtitulo={competicion(competicionId).nombre} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: E.xxxl, gap: E.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', gap: E.sm }}>
          <Escudo
            nombre={equipo.nombre}
            id={equipo.id}
            bandera={equipo.bandera}
            corto={equipo.corto}
            color={equipo.color}
            tam={72}
          />
          <Txt v="titulo">{equipo.nombre}</Txt>
          <Txt v="pequeno" color={C.texto3}>
            {equipo.estadio}
            {equipo.ciudad ? ` · ${equipo.ciudad}` : ''}
          </Txt>
          {equipo.grupo ? <Insignia texto={`GRUPO ${equipo.grupo}`} /> : null}
        </View>

        <View style={{ paddingHorizontal: E.lg }}>
          <Segmentado
            valor={vista}
            onCambia={setVista}
            opciones={[
              { id: 'forma', texto: 'Forma' },
              { id: 'plantilla', texto: 'Plantilla' },
              { id: 'calendario', texto: 'Calendario' },
            ]}
          />
        </View>

        {vista === 'forma' ? (
          <>
            <View style={{ paddingHorizontal: E.lg, gap: E.sm }}>
              <Segmentado
                valor={donde}
                onCambia={setDonde}
                opciones={[
                  { id: 'todos', texto: 'Todos' },
                  { id: 'local', texto: 'En casa' },
                  { id: 'visitante', texto: 'Fuera' },
                ]}
              />

              {/* El equipo juega más de una competición: se puede mirar solo
                  esta o sumar todo lo que hace, que es más representativo. */}
              {datos.resumenOtras.length ? (
                <View style={{ flexDirection: 'row', gap: E.sm }}>
                  <Chip
                    texto={competicion(competicionId).corto}
                    activo={!todasLasCompeticiones}
                    onPress={() => setTodas(false)}
                  />
                  <Chip
                    texto="Todas las competiciones"
                    activo={todasLasCompeticiones}
                    onPress={() => setTodas(true)}
                  />
                </View>
              ) : null}
            </View>

            {datos.resumenOtras.length ? (
              <View style={{ paddingHorizontal: E.lg }}>
                <Tarjeta style={{ padding: E.md, gap: E.sm }}>
                  <Txt v="cuerpoFuerte">También juega</Txt>
                  {datos.resumenOtras.map((o) => (
                    <View
                      key={o.id}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: E.sm }}
                    >
                      <LogoCompeticion
                        competicionId={o.id}
                        bandera={competicionOpcional(o.id)?.bandera}
                        tam={18}
                        cuadrado
                      />
                      <Txt v="pequeno" style={{ flex: 1 }}>
                        {competicionOpcional(o.id)?.nombre ?? o.id}
                      </Txt>
                      <Txt v="pequeno" color={C.texto2}>
                        {o.jugados} partidos · {o.ganados} ganados
                      </Txt>
                    </View>
                  ))}
                </Tarjeta>
              </View>
            ) : null}

            <View style={{ paddingHorizontal: E.lg, gap: E.md }}>
              <Tarjeta style={{ padding: E.md, gap: E.md }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Txt v="cuerpoFuerte">Últimos partidos</Txt>
                  <Txt v="pequeno" color={C.texto2}>
                    {victorias}G · {empates}E · {filtrados.length - victorias - empates}P
                  </Txt>
                </View>
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  {ultimos.map((p) => {
                    const r = resultado(p);
                    return (
                      <Pulsable
                        key={p.id}
                        onPress={() =>
                          router.push(`/partido/${encodeURIComponent(p.id)}?comp=${competicionId}`)
                        }
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor:
                            r === 'G' ? C.verdeTenue : r === 'E' ? C.carta2 : C.rojoTenue,
                        }}
                      >
                        <Txt
                          v="pequenoFuerte"
                          color={r === 'G' ? C.verde : r === 'E' ? C.texto2 : C.rojo}
                        >
                          {r}
                        </Txt>
                      </Pulsable>
                    );
                  })}
                </View>
              </Tarjeta>

              <Tarjeta style={{ paddingHorizontal: E.md }}>
                <FilaDato etiqueta="Goles a favor" valor={coma(media((p, l) => (l ? p.golesLocal : p.golesVisitante)), 2)} destacado />
                <Separador />
                <FilaDato etiqueta="Goles en contra" valor={coma(media((p, l) => (l ? p.golesVisitante : p.golesLocal)), 2)} />
                <Separador />
                <FilaDato etiqueta="Goles totales del partido" valor={coma(media((p) => p.golesLocal + p.golesVisitante), 2)} />
                <Separador />
                <FilaDato etiqueta="Remates" valor={coma(media((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).remates), 1)} />
                <Separador />
                <FilaDato etiqueta="Remates a puerta" valor={coma(media((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).rematesPuerta), 1)} />
                <Separador />
                <FilaDato etiqueta="Posesión" valor={coma(media((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).posesion), 0)} sufijo="%" />
                <Separador />
                <FilaDato etiqueta="Córners" valor={coma(media((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).corners), 1)} />
                <Separador />
                <FilaDato etiqueta="Faltas" valor={coma(media((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).faltas), 1)} />
                <Separador />
                <FilaDato etiqueta="Tarjetas" valor={coma(media((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).amarillas), 1)} />
                <Separador />
                <FilaDato etiqueta="xG estimado" valor={coma(media((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).xg), 2)} />
                <Separador />
                <FilaDato etiqueta="Córners del partido" valor={coma(media((p) => p.estadisticas.local.corners + p.estadisticas.visitante.corners), 1)} />
              </Tarjeta>
            </View>
          </>
        ) : null}

        {vista === 'plantilla' ? (
          <View style={{ paddingHorizontal: E.lg, gap: E.sm }}>
            {(['POR', 'DEF', 'MED', 'DEL'] as const).map((pos) => {
              const grupo = datos.plantilla.filter((j) => j.posicion === pos);
              if (!grupo.length) return null;
              return (
                <View key={pos} style={{ gap: E.sm, marginBottom: E.sm }}>
                  <Txt v="pequenoFuerte" color={C.texto3}>
                    {{ POR: 'PORTEROS', DEF: 'DEFENSAS', MED: 'CENTROCAMPISTAS', DEL: 'DELANTEROS' }[pos]}
                  </Txt>
                  <Tarjeta style={{ overflow: 'hidden' }}>
                    {grupo.map((j, i) => {
                      const regs = datos.registros.get(j.id) ?? [];
                      const goles = regs.reduce((a, r) => a + r.goles, 0);
                      const asis = regs.reduce((a, r) => a + r.asistencias, 0);
                      return (
                        <View key={j.id}>
                          {i > 0 ? <Separador /> : null}
                          <Pulsable
                            onPress={() =>
                              router.push(`/jugador/${encodeURIComponent(j.id)}?comp=${competicionId}`)
                            }
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: E.md,
                              paddingHorizontal: E.md,
                              paddingVertical: 11,
                            }}
                          >
                            <Txt v="mini" color={C.texto3} style={{ width: 22 }}>
                              {j.dorsal}
                            </Txt>
                            <View style={{ flex: 1 }}>
                              <Txt v="cuerpo">{j.nombre}</Txt>
                              <Txt v="mini" color={C.texto3}>
                                {regs.length} partidos · {goles} goles · {asis} asistencias
                              </Txt>
                            </View>
                            <Insignia
                              texto={`${j.nivel}`}
                              color={j.nivel >= 82 ? C.lima : C.texto2}
                              fondo={j.nivel >= 82 ? C.limaTenue : C.carta2}
                            />
                          </Pulsable>
                        </View>
                      );
                    })}
                  </Tarjeta>
                </View>
              );
            })}
          </View>
        ) : null}

        {/*
          Una pestaña vacía tiene que decir que está vacía.

          Hay equipos con muy pocos datos importados —el River Plate uruguayo
          tiene un partido y ningún jugador—, y al abrirlos la pantalla se
          quedaba en blanco sin una palabra. Parece que la app se ha roto
          cuando lo que pasa es que no hay nada que enseñar.
        */}
        {vista === 'calendario' && !datos.proximos.length ? (
          <Vacio
            icono="calendario"
            titulo="Sin partidos por jugar"
            detalle="De este equipo no hay próximos partidos en los datos descargados."
          />
        ) : null}

        {vista === 'calendario' ? (
          <View style={{ paddingHorizontal: E.lg, gap: E.sm }}>
            {datos.proximos.map((p) => {
              const rival = datos.equipos.get(esLocal(p) ? p.visitanteId : p.localId);
              return (
                <Pulsable
                  key={p.id}
                  onPress={() => router.push(`/partido/${encodeURIComponent(p.id)}?comp=${competicionId}`)}
                >
                  <Tarjeta
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: E.md,
                      padding: E.md,
                    }}
                  >
                    <View style={{ alignItems: 'center', width: 44 }}>
                      <Txt v="pequenoFuerte">
                        {new Date(p.fecha).toLocaleDateString('es', { day: 'numeric' })}
                      </Txt>
                      <Txt v="mini" color={C.texto3}>
                        {new Date(p.fecha).toLocaleDateString('es', { month: 'short' })}
                      </Txt>
                    </View>
                    <Escudo nombre={rival?.nombre ?? ""} id={rival?.id} bandera={rival?.bandera} corto={rival?.corto} tam={26} />
                    <View style={{ flex: 1 }}>
                      <Txt v="cuerpo">{rival?.nombre}</Txt>
                      <Txt v="mini" color={C.texto3}>
                        {esLocal(p) ? 'En casa' : 'Fuera'} ·{' '}
                        {new Date(p.fecha).toLocaleTimeString('es', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Txt>
                    </View>
                    {p.estado === 'en_curso' || p.estado === 'descanso' ? (
                      <Insignia texto="EN VIVO" color={C.rojo} fondo={C.rojoTenue} />
                    ) : (
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: R.xs,
                          backgroundColor: C.carta2,
                        }}
                      >
                        <Txt v="pequenoFuerte" color={C.lima}>
                          {(esLocal(p) ? p.cuotas.local : p.cuotas.visitante).toFixed(2)}
                        </Txt>
                      </View>
                    )}
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
