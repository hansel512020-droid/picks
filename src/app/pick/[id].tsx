import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Fuego, Insignia, Pulsable, Separador, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { Icono } from '@/componentes/iconos';
import { Escudo, LogoCompeticion } from '@/componentes/imagen';
import { CabeceraAtras, FilaDato } from '@/componentes/navegacion';
import { Avatar, BarraL10, FilaMercado, TarjetaPick } from '@/componentes/pick';
import { competicion } from '@/datos/competiciones';
import { temporada } from '@/datos/motor';
import { coma, METRICAS_EQUIPO, METRICAS_JUGADOR, picksDePartido } from '@/datos/picks';
import { useComunidad } from '@/estado/comunidad';
import { useDerechos } from '@/estado/derechos';
import { useTienda } from '@/estado/tienda';
import { usePartidoVivoDe } from '@/estado/vivo';
import { C, E, R } from '@/tema';
import { useCalculo } from '@/utiles/carga';

/**
 * Detalle de un pick: el argumento entero, la serie de los ultimos 20 partidos
 * con la linea dibujada, los cortes por contexto y el resto de picks del mismo
 * partido.
 */

/**
 * El partido al que pertenece el pick, presentado como tal: los dos escudos,
 * los nombres enteros y cuándo se juega.
 *
 * Antes esto era una línea gris con siglas debajo del título del pick, y no
 * se entendía de qué partido hablaba. Se toca para abrir su ficha.
 */
function ElPartido({
  competicionId,
  partidoId,
}: {
  competicionId: string;
  partidoId: string;
}) {
  const datos = useCalculo(() => {
    const t = temporada(competicionId);
    const partido = t.porPartido.get(partidoId);
    if (!partido) return null;
    return {
      partido,
      local: t.porEquipo.get(partido.localId),
      visitante: t.porEquipo.get(partido.visitanteId),
    };
  }, [competicionId, partidoId]);

  const enDirecto = usePartidoVivoDe(datos?.partido);
  if (!datos?.local || !datos.visitante) return null;

  const { partido, local, visitante } = datos;
  const estado = enDirecto?.estado ?? partido.estado;
  const jugando = estado === 'en_curso' || estado === 'descanso';
  const jugado = estado === 'finalizado';
  const gl = enDirecto?.golesLocal ?? partido.golesLocal;
  const gv = enDirecto?.golesVisitante ?? partido.golesVisitante;

  const cuando = new Date(partido.fecha).toLocaleString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Pulsable
      onPress={() => router.push(`/partido/${encodeURIComponent(partidoId)}?comp=${competicionId}`)}
    >
      <Tarjeta
        style={{
          padding: E.md,
          gap: E.sm,
          ...(jugando ? { borderColor: C.rojo, borderWidth: 1.5 } : null),
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <LogoCompeticion competicionId={competicionId} tam={14} cuadrado />
          <Txt v="mini" color={C.texto3} style={{ flex: 1 }} numberOfLines={1}>
            {competicion(competicionId).nombre}
          </Txt>
          {jugando ? (
            <>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.rojo }} />
              <Txt v="pequenoFuerte" color={C.rojo}>
                {/* `reloj` primero: es el que trae el descuento ("90+7"). */}
                {estado === 'descanso'
                  ? 'DESCANSO'
                  : `${enDirecto?.reloj ?? enDirecto?.minuto ?? 0}'`}
              </Txt>
            </>
          ) : (
            <Txt v="mini" color={C.texto3}>
              {jugado ? 'FINALIZADO' : cuando}
            </Txt>
          )}
        </View>

        {[
          { e: local, g: gl },
          { e: visitante, g: gv },
        ].map(({ e, g }) => (
          <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: E.sm }}>
            <Escudo nombre={e.nombre} id={e.id} bandera={e.bandera} corto={e.corto} tam={26} />
            <Txt v="cuerpo" style={{ flex: 1 }} numberOfLines={1}>
              {e.nombre}
            </Txt>
            {jugando || jugado ? <Txt v="cuerpoFuerte">{g}</Txt> : null}
          </View>
        ))}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Txt v="mini" color={C.texto3} style={{ flex: 1 }}>
            {partido.estadio}
          </Txt>
          <Txt v="mini" color={C.lima}>
            Ver el partido
          </Txt>
          <Icono nombre="flechaDerecha" tam={12} color={C.lima} />
        </View>
      </Tarjeta>
    </Pulsable>
  );
}

/** Barras de la metrica partido a partido, con la linea del mercado marcada. */
function Serie({ valores, linea }: { valores: number[]; linea: number }) {
  const maximo = Math.max(linea * 1.6, ...valores, 1);
  return (
    <View style={{ gap: E.sm }}>
      <View style={{ height: 96, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        {valores.map((v, i) => (
          <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <View
              style={{
                height: `${Math.max(4, (v / maximo) * 100)}%`,
                borderRadius: 3,
                backgroundColor: v > linea ? C.acierto : C.neutro,
              }}
            />
          </View>
        ))}
        {/* La linea del mercado, a la altura que le toca. */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: `${(linea / maximo) * 100}%`,
            height: 1,
            backgroundColor: C.lima,
            opacity: 0.8,
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt v="mini" color={C.texto3}>
          hace {valores.length} partidos
        </Txt>
        <Txt v="mini" color={C.lima}>
          línea {coma(linea)}
        </Txt>
        <Txt v="mini" color={C.texto3}>
          último
        </Txt>
      </View>
    </View>
  );
}

export default function PantallaPick() {
  const { id, comp, partido: partidoParam } = useLocalSearchParams<{
    id: string;
    comp: string;
    partido?: string;
  }>();
  const { ajustes, estaGuardado, guardar, quitar } = useTienda();
  const { libres } = useDerechos();
  const comunidad = useComunidad();
  const insets = useSafeAreaInsets();
  const competicionId = comp ?? ajustes.competicionId;
  const pickId = decodeURIComponent(id ?? '');

  /*
   * Se pide el recuento real, igual que hace la tarjeta de la lista.
   *
   * Sin esto esta pantalla solo leía lo que ya hubiera en memoria, así que el
   * mismo pick podía enseñar un número aquí y otro en la lista —o ninguno—
   * según por dónde hubiera entrado el usuario. Un contador que cambia al
   * cambiar de pantalla no se cree, y con razón.
   */
  useEffect(() => {
    if (pickId) comunidad.pide([pickId]);
  }, [comunidad, pickId]);
  // Lo normal es que venga en la dirección; el corte por guiones solo se usa
  // como respaldo para los enlaces antiguos de los datos generados.
  const partidoId = partidoParam
    ? decodeURIComponent(partidoParam)
    : pickId.split('-').slice(0, 3).join('-');

  const picks = useCalculo(
    () => picksDePartido(competicionId, partidoId, ajustes.casaId, libres),
    [competicionId, partidoId, ajustes.casaId, libres],
  );

  const pick = useMemo(() => picks?.find((p) => p.id === pickId), [picks, pickId]);

  const contexto = useCalculo(() => {
    if (!pick) return undefined;
    const t = temporada(competicionId);
    const partido = t.porPartido.get(pick.partidoId);
    const metJugador = METRICAS_JUGADOR.find((m) => m.clave === pick.metrica);

    if (pick.sujeto === 'jugador' && metJugador) {
      const jugador = t.porJugador.get(pick.sujetoId);
      const regs = (t.registrosPorJugador.get(pick.sujetoId) ?? []).filter(
        (r) => r.minutos >= 25 && r.partidoId !== pick.partidoId,
      );
      const serie = regs.slice(0, 20).map(metJugador.extractor).reverse();
      const tasa = (lista: typeof regs) =>
        lista.length
          ? (lista.filter((r) =>
              pick.sentido === 'mas'
                ? metJugador.extractor(r) > pick.linea
                : metJugador.extractor(r) < pick.linea,
            ).length /
              lista.length) *
            100
          : 0;
      const rivalId =
        partido && jugador
          ? partido.localId === jugador.equipoId
            ? partido.visitanteId
            : partido.localId
          : undefined;
      return {
        tipo: 'jugador' as const,
        jugador,
        equipo: jugador ? t.porEquipo.get(jugador.equipoId) : undefined,
        rival: rivalId ? t.porEquipo.get(rivalId) : undefined,
        serie,
        cortes: [
          { etiqueta: 'Toda la temporada', valor: tasa(regs), n: regs.length },
          { etiqueta: 'En casa', valor: tasa(regs.filter((r) => r.local)), n: regs.filter((r) => r.local).length },
          { etiqueta: 'Fuera', valor: tasa(regs.filter((r) => !r.local)), n: regs.filter((r) => !r.local).length },
          { etiqueta: 'De titular', valor: tasa(regs.filter((r) => r.titular)), n: regs.filter((r) => r.titular).length },
          {
            etiqueta: `Contra ${t.porEquipo.get(rivalId ?? '')?.corto ?? 'el rival'}`,
            valor: tasa(regs.filter((r) => r.rivalId === rivalId)),
            n: regs.filter((r) => r.rivalId === rivalId).length,
          },
        ],
        mediaGeneral:
          regs.length ? regs.reduce((a, r) => a + metJugador.extractor(r), 0) / regs.length : 0,
      };
    }

    const metEquipo = METRICAS_EQUIPO.find((m) => m.clave === pick.metrica);
    const equipo = t.porEquipo.get(pick.sujetoId);
    if (equipo && metEquipo) {
      const suyos = (t.partidosPorEquipo.get(equipo.id) ?? [])
        .filter((p) => p.estado === 'finalizado' && p.id !== pick.partidoId)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      const valor = (p: (typeof suyos)[number]) => metEquipo.valor(p, p.localId === equipo.id);
      const tasa = (lista: typeof suyos) =>
        lista.length
          ? (lista.filter((p) => (pick.sentido === 'mas' ? valor(p) > pick.linea : valor(p) < pick.linea))
              .length /
              lista.length) *
            100
          : 0;
      return {
        tipo: 'equipo' as const,
        equipo,
        serie: suyos.slice(-20).map(valor),
        cortes: [
          { etiqueta: 'Toda la temporada', valor: tasa(suyos), n: suyos.length },
          {
            etiqueta: 'En casa',
            valor: tasa(suyos.filter((p) => p.localId === equipo.id)),
            n: suyos.filter((p) => p.localId === equipo.id).length,
          },
          {
            etiqueta: 'Fuera',
            valor: tasa(suyos.filter((p) => p.visitanteId === equipo.id)),
            n: suyos.filter((p) => p.visitanteId === equipo.id).length,
          },
        ],
        mediaGeneral: suyos.length ? suyos.reduce((a, p) => a + valor(p), 0) / suyos.length : 0,
      };
    }
    return { tipo: 'partido' as const, serie: [], cortes: [], mediaGeneral: 0 };
  }, [pick, competicionId]);

  if (picks === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.lima} />
      </View>
    );
  }
  if (!pick) {
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.md }}>
        <CabeceraAtras titulo="Pick" />
        <Vacio icono="grafico" titulo="Este pick ya no está disponible" detalle="Las líneas cambian cuando se actualizan los datos del partido." />
      </View>
    );
  }

  const guardado = estaGuardado(pick.id);
  const otros = (picks ?? []).filter((p) => p.id !== pick.id).slice(0, 4);

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      <CabeceraAtras titulo="Detalle del pick" subtitulo={competicion(competicionId).nombre} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: E.xxxl, gap: E.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: E.lg, gap: E.md }}>
          <ElPartido competicionId={competicionId} partidoId={pick.partidoId} />

          <Tarjeta style={{ padding: E.lg, gap: E.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.md }}>
              <Avatar imagen={pick.imagen} tam={44} nombres={pick.nombres} sujeto={pick.sujeto} />
              <View style={{ flex: 1 }}>
                <Txt v="titulo">{pick.titulo}</Txt>
                <Txt v="pequeno" color={C.texto3}>
                  {pick.contexto}
                </Txt>
              </View>
              <Fuego n={comunidad.cuenta(pick.id) ?? pick.fuego} />
            </View>

            <Txt v="cuerpo" color={C.texto2}>
              {pick.argumento}
            </Txt>

            <FilaMercado
              mercado={pick.mercado}
              cuota={pick.cuota}
              casaId={pick.casa}
              ventaja={pick.ventaja}
              precioReal={pick.precioReal}
            />

            <View style={{ flexDirection: 'row', gap: E.sm }}>
              {[
                { v: `${pick.aciertosL10}/10`, e: 'Últimos 10' },
                { v: `${pick.aciertosL5}/5`, e: 'Últimos 5' },
                { v: `${pick.ventaja.toFixed(0)}%`, e: 'Ventaja', color: C.lima },
              ].map((d) => (
                <View
                  key={d.e}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: E.md,
                    borderRadius: R.md,
                    backgroundColor: C.carta2,
                    gap: 2,
                  }}
                >
                  <Txt v="subtitulo" color={d.color ?? C.texto}>
                    {d.v}
                  </Txt>
                  <Txt v="mini" color={C.texto3}>
                    {d.e}
                  </Txt>
                </View>
              ))}
            </View>

            <Boton
              ancho
              texto={guardado ? 'Quitar de mis picks' : 'Guardar pick'}
              icono={guardado ? 'guardado' : 'guardar'}
              variante={guardado ? 'secundario' : 'principal'}
              onPress={() => {
                if (guardado) {
                  quitar(pick.id);
                  comunidad.resta(pick.id);
                } else {
                  guardar(pick);
                  comunidad.suma(pick.id, pick.competicionId);
                }
              }}
            />
          </Tarjeta>
        </View>

        {/* ---------------------------------------------------------- serie */}
        {contexto && contexto.serie.length > 2 ? (
          <View style={{ paddingHorizontal: E.lg, gap: E.sm }}>
            <Txt v="subtitulo">Partido a partido</Txt>
            <Tarjeta style={{ padding: E.md, gap: E.md }}>
              <Serie valores={contexto.serie} linea={pick.linea} />
              <Separador />
              <FilaDato etiqueta="Media de la temporada" valor={coma(contexto.mediaGeneral, 2)} />
              <FilaDato etiqueta="Media en los últimos 10" valor={coma(pick.media, 2)} destacado />
              <FilaDato
                etiqueta="Probabilidad del modelo"
                valor={`${(pick.probabilidad * 100).toFixed(0)}%`}
              />
              <FilaDato
                etiqueta="Probabilidad implícita del precio"
                valor={`${((1 / pick.cuota) * 100).toFixed(0)}%`}
              />
            </Tarjeta>
          </View>
        ) : null}

        {/* --------------------------------------------------------- cortes */}
        {contexto && contexto.cortes.length ? (
          <View style={{ paddingHorizontal: E.lg, gap: E.sm }}>
            <Txt v="subtitulo">Por contexto</Txt>
            <Tarjeta style={{ padding: E.md, gap: E.md }}>
              {contexto.cortes.map((c) => (
                <View key={c.etiqueta} style={{ gap: 5 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Txt v="pequeno" color={C.texto2}>
                      {c.etiqueta}
                    </Txt>
                    <Txt v="pequenoFuerte" color={c.valor >= 70 ? C.lima : C.texto}>
                      {c.n ? `${c.valor.toFixed(0)}%` : 'sin datos'}{' '}
                      <Txt v="mini" color={C.texto3}>
                        ({c.n})
                      </Txt>
                    </Txt>
                  </View>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: C.carta2 }}>
                    <View
                      style={{
                        width: `${c.n ? c.valor : 0}%`,
                        height: '100%',
                        borderRadius: 3,
                        backgroundColor: c.valor >= 70 ? C.lima : C.texto3,
                      }}
                    />
                  </View>
                </View>
              ))}
            </Tarjeta>
          </View>
        ) : null}

        {/* ------------------------------------------------------- racha L10 */}
        <View style={{ paddingHorizontal: E.lg, gap: E.sm }}>
          <Txt v="subtitulo">Racha</Txt>
          <Tarjeta style={{ padding: E.md, gap: E.sm }}>
            <BarraL10 racha={pick.racha} porcentaje={pick.aciertosL10 * 10} />
            <Txt v="mini" color={C.texto3}>
              Verde: el pick habría acertado. Rojo: habría fallado.{' '}
              {pick.sujeto === 'jugador'
                ? `Muestra de ${pick.muestraL20} partidos con minutos suficientes.`
                : `Muestra de ${pick.muestraL20} partidos.`}
            </Txt>
          </Tarjeta>
        </View>

        <Pulsable
          onPress={() =>
            router.push(`/partido/${encodeURIComponent(pick.partidoId)}?comp=${competicionId}`)
          }
          style={{ paddingHorizontal: E.lg }}
        >
          <Tarjeta style={{ flexDirection: 'row', alignItems: 'center', gap: E.md, padding: E.md }}>
            <Icono nombre="balon" tam={20} color={C.lima} />
            <Txt v="cuerpo" style={{ flex: 1 }}>
              Ver el partido completo
            </Txt>
            <Icono nombre="flechaDerecha" tam={16} color={C.texto3} />
          </Tarjeta>
        </Pulsable>

        {otros.length ? (
          <View style={{ gap: E.md }}>
            <Txt v="subtitulo" style={{ paddingHorizontal: E.lg }}>
              Más picks de este partido
            </Txt>
            {otros.map((p) => (
              <View key={p.id} style={{ paddingHorizontal: E.lg }}>
                <TarjetaPick pick={p} />
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
