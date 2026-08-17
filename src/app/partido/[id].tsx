import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Barra,
  Chip,
  Insignia,
  Pulsable,
  Separador,
  Tarjeta,
  Txt,
  Vacio,
} from '@/componentes/base';
import { Campo, CampoReal } from '@/componentes/campo';
import { Icono } from '@/componentes/iconos';
import { Escudo } from '@/componentes/imagen';
import { CabeceraAtras, FilaDato, Pestanas, Segmentado, TiraChips } from '@/componentes/navegacion';
import { SelloCasa, TarjetaPick } from '@/componentes/pick';
import { alineacionesDelPartido, type OnceEquipo } from '@/datos/alineaciones';
import { CASAS } from '@/datos/casas';
import { competicion } from '@/datos/competiciones';
import { extrasDelPartido, type Extras } from '@/datos/penales';
import { alineacion, lesiones, temporada } from '@/datos/motor';
import { FAMILIAS, picksDePartido } from '@/datos/picks';
import type { Familia } from '@/datos/tipos';
import { useDerechos } from '@/estado/derechos';
import { useTienda } from '@/estado/tienda';
import { usePartidoVivoDe, usePicksVigentes } from '@/estado/vivo';
import { C, E, R } from '@/tema';
import { useCalculo } from '@/utiles/carga';

type Vista = 'cuotas' | 'insights' | 'duelo';
type Pestana = 'picks' | 'formaciones' | 'lesiones';

export default function PantallaPartido() {
  const { id, comp } = useLocalSearchParams<{ id: string; comp: string }>();
  const { ajustes } = useTienda();
  // Lo comprado por el usuario: decide qué picks van con candado.
  const { libres } = useDerechos();
  const insets = useSafeAreaInsets();
  const competicionId = comp ?? ajustes.competicionId;
  const partidoId = decodeURIComponent(id ?? '');

  const [vista, setVista] = useState<Vista>('insights');
  const [pestana, setPestana] = useState<Pestana>('picks');
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [lado, setLado] = useState<'local' | 'visitante'>('local');

  const datos = useCalculo(() => {
    const t = temporada(competicionId);
    const partido = t.porPartido.get(partidoId);
    if (!partido) return null;
    const local = t.porEquipo.get(partido.localId)!;
    const visitante = t.porEquipo.get(partido.visitanteId)!;
    /*
     * Posición en la tabla: el "(1º)" que va junto al nombre.
     *
     * Se ordena solo dentro de la competición del equipo, no sobre todos los
     * equipos cargados. Con "Todas" activa la temporada junta mil doscientos
     * clubes de treinta competiciones, y salía un "(1234º)" que no significa
     * nada: nadie es el 1234º de su liga.
     */
    const suya = local.competicionId;
    const tabla = t.equipos
      .filter((e) => e.competicionId === suya)
      .sort((a, b) => b.fuerza - a.fuerza);
    return {
      partido,
      local,
      visitante,
      posLocal: tabla.findIndex((e) => e.id === local.id) + 1,
      posVisitante: tabla.findIndex((e) => e.id === visitante.id) + 1,
      jugadores: t.porJugador,
      historialLocal: (t.partidosPorEquipo.get(local.id) ?? [])
        .filter((p) => p.estado === 'finalizado')
        .slice(-10),
      historialVisitante: (t.partidosPorEquipo.get(visitante.id) ?? [])
        .filter((p) => p.estado === 'finalizado')
        .slice(-10),
    };
  }, [competicionId, partidoId]);

  const picks = useCalculo(
    () => picksDePartido(competicionId, partidoId, ajustes.casaId, libres),
    [competicionId, partidoId, ajustes.casaId, libres],
  );

  const picksVisibles = useMemo(
    () => (picks ?? []).filter((p) => !familias.length || familias.includes(p.familia)),
    [picks, familias],
  );

  // Antes de los returns tempranos: los hooks no pueden quedarse a medias.
  const enDirecto = usePartidoVivoDe(datos?.partido);
  const picksEnCartel = usePicksVigentes(picksVisibles);

  /*
   * Global de la eliminatoria y tanda de penaltis. Se piden en cuanto el
   * partido termina: el global existe aunque no haya habido tanda, y sin él un
   * 1-0 de vuelta no dice quién pasa.
   */
  const [extras, setExtras] = useState<Extras>({ tanda: null, agregado: null });
  const idEspnPartido = datos?.partido.idEspn;
  const acabado = (enDirecto?.estado ?? datos?.partido.estado) === 'finalizado';

  useEffect(() => {
    if (!idEspnPartido || !acabado) return;
    let vivo = true;
    extrasDelPartido(competicionId, idEspnPartido).then((e) => {
      if (vivo) setExtras(e);
    });
    return () => {
      vivo = false;
    };
  }, [competicionId, idEspnPartido, acabado]);
  const penales = extras.tanda;
  const agregado = extras.agregado;

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
        <CabeceraAtras titulo="Partido" />
        <Vacio icono="balon" titulo="No encontramos ese partido" />
      </View>
    );
  }

  const { partido, local, visitante, posLocal, posVisitante, jugadores } = datos;
  // Lo que ESPN diga ahora mismo pesa más que la foto del archivo importado.
  const estado = enDirecto?.estado ?? partido.estado;
  const golesLocal = enDirecto?.golesLocal ?? partido.golesLocal;
  const golesVisitante = enDirecto?.golesVisitante ?? partido.golesVisitante;
  const minuto = enDirecto?.minuto ?? partido.minuto;
  /*
   * El reloj de ESPN trae el descuento ("90+7"); `minuto` es un número y lo
   * pierde por el camino. Sin esto la cabecera se quedaba clavada en 90'
   * mientras la tira de arriba y la tarjeta del pick ya iban por 90+7, y
   * parecía que el partido se había parado justo donde más se mira.
   */
  const reloj = enDirecto?.reloj;
  const vivo = estado === 'en_curso' || estado === 'descanso';
  const jugado = estado === 'finalizado';
  const competicionNombre = competicion(competicionId).nombre;

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: E.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* --------------------------------------------------------- marcador */}
        <LinearGradient
          colors={[`${local.color}33`, C.fondo]}
          style={{ paddingTop: insets.top + E.sm, paddingBottom: E.lg }}
        >
          <CabeceraAtras />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: E.lg,
              gap: E.sm,
            }}
          >
            {/*
              Tres zonas: equipo · marcador · equipo.

              Antes cada equipo llevaba sus goles dentro de su propio bloque, y
              al pasar de la abreviatura al nombre completo los dos números se
              juntaron en el centro sin nada en medio: un 2-0 se leía como
              "20". Con el marcador en su propia columna y un guion entre las
              cifras, se entiende de un vistazo y da igual lo largo que sea el
              nombre del club.
            */}
            {[
              { e: local, pos: posLocal },
              { e: visitante, pos: posVisitante },
            ].map(({ e, pos }, i) => (
              <Fragment key={e.id}>
                {i === 1 ? (
                  <View style={{ alignItems: 'center', paddingHorizontal: E.xs }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Txt v="displayXL">{jugado || vivo ? golesLocal : ''}</Txt>
                      <Txt v="displayXL" color={C.texto3}>
                        {jugado || vivo ? '-' : 'vs'}
                      </Txt>
                      <Txt v="displayXL">{jugado || vivo ? golesVisitante : ''}</Txt>
                    </View>
                    {/* El resultado sigue siendo 2-2: la tanda va debajo y en
                        pequeño, porque no cambia el marcador, solo quién pasa. */}
                    {penales ? (
                      <Txt v="mini" color={C.texto3}>
                        penaltis {penales.golesLocal}-{penales.golesVisitante}
                      </Txt>
                    ) : null}
                  </View>
                ) : null}

                <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <Pulsable
                    onPress={() =>
                      router.push(`/equipo/${encodeURIComponent(e.id)}?comp=${competicionId}`)
                    }
                  >
                    <Escudo
                      nombre={e.nombre}
                      bandera={e.bandera}
                      corto={e.corto}
                      color={e.color}
                      tam={46}
                    />
                  </Pulsable>
                  {/*
                    El nombre entero, no la abreviatura de tres letras: "RIP" o
                    "ABB" no los reconoce nadie, y esta cabecera es justo donde
                    se lee de quién es el partido.
                  */}
                  <Txt v="cuerpoFuerte" numberOfLines={2} style={{ textAlign: 'center' }}>
                    {e.nombre}
                  </Txt>
                  <Txt v="mini" color={C.texto3}>
                    ({pos}º)
                  </Txt>
                </View>
              </Fragment>
            ))}
          </View>

          <View style={{ alignItems: 'center', gap: 3, marginTop: E.sm }}>
            {vivo ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.rojo }} />
                <Txt v="etiqueta" color={C.rojo}>
                  {estado === 'descanso' ? 'DESCANSO' : `EN CURSO · ${reloj ?? minuto ?? 0}'`}
                </Txt>
              </View>
            ) : (
              <Txt v="etiqueta" color={C.texto3}>
                {jugado ? 'FINALIZADO' : new Date(partido.fecha).toLocaleString('es', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Txt>
            )}
            <Txt v="pequeno" color={C.texto2}>
              {competicionNombre.toUpperCase()}
            </Txt>
            <Txt v="mini" color={C.texto3}>
              {partido.estadio} · {partido.arbitro}
            </Txt>
            {/* En una eliminatoria el marcador del partido no cuenta la
                historia: lo que decide es el global de los dos. Va destacado
                porque es el dato que la gente busca al abrir la vuelta. */}
            {agregado ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: R.pill,
                  borderWidth: 1,
                  borderColor: C.limaBorde,
                  backgroundColor: C.limaTenue,
                }}
              >
                <Txt v="pequenoFuerte" color={C.lima}>
                  GLOBAL {agregado.local}-{agregado.visitante}
                </Txt>
                {agregado.avanza ? (
                  <Txt v="mini" color={C.texto2}>
                    · {agregado.avanza} avanza
                  </Txt>
                ) : null}
              </View>
            ) : null}
            {penales ? (
              <Txt v="pequenoFuerte" color={C.ambar}>
                PENALTIS {penales.golesLocal}-{penales.golesVisitante}
              </Txt>
            ) : null}
          </View>
        </LinearGradient>

        {/* ---------------------------------------------------------- vistas */}
        <View style={{ paddingHorizontal: E.lg, marginBottom: E.lg }}>
          <Segmentado
            valor={vista}
            onCambia={setVista}
            opciones={[
              { id: 'cuotas', texto: 'Cuotas', icono: 'moneda' },
              { id: 'insights', texto: 'Insights', icono: 'grafico' },
              { id: 'duelo', texto: 'Duelo', icono: 'duelo' },
            ]}
          />
        </View>

        {vista === 'insights' ? (
          <>
            <Pestanas
              valor={pestana}
              onCambia={setPestana}
              opciones={[
                { id: 'picks', texto: 'Picks' },
                { id: 'formaciones', texto: 'Formaciones' },
                { id: 'lesiones', texto: 'Lesiones' },
              ]}
            />

            {penales?.lanzamientos.length ? (
              <Tarjeta style={{ padding: E.md, gap: E.sm, marginBottom: E.lg }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.sm }}>
                  <Txt v="cuerpoFuerte" style={{ flex: 1 }}>
                    Tanda de penaltis
                  </Txt>
                  <Insignia
                    texto={`${penales.golesLocal}-${penales.golesVisitante}`}
                    color={C.ambar}
                    fondo={C.ambarTenue}
                  />
                </View>
                {penales.lanzamientos.map((l) => {
                  const color =
                    l.suerte === 'gol' ? C.verde : l.suerte === 'parado' ? C.violeta : C.rojo;
                  return (
                    <View
                      key={`${l.orden}-${l.jugador}`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: E.sm }}
                    >
                      <Txt v="mini" color={C.texto3} style={{ width: 18 }}>
                        {l.orden}
                      </Txt>
                      <Escudo nombre={l.equipo} tam={18} />
                      <Txt v="pequeno" style={{ flex: 1 }} numberOfLines={1}>
                        {l.jugador}
                      </Txt>
                      <Insignia
                        texto={
                          l.suerte === 'gol' ? 'GOL' : l.suerte === 'parado' ? 'PARADO' : 'FUERA'
                        }
                        color={color}
                        fondo={C.carta2}
                      />
                    </View>
                  );
                })}
              </Tarjeta>
            ) : null}

            {pestana === 'picks' ? (
              <View style={{ paddingTop: E.lg, gap: E.md }}>
                <TiraChips>
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
                {picks === undefined ? (
                  <ActivityIndicator color={C.lima} style={{ marginTop: E.xl }} />
                ) : picksEnCartel.length ? (
                  picksEnCartel.map((p) => (
                    <View key={p.id} style={{ paddingHorizontal: E.lg }}>
                      <TarjetaPick pick={p} />
                    </View>
                  ))
                ) : (
                  /*
                    Tres motivos distintos para una lista vacía, y hay que
                    decir cuál es.

                    El caso nuevo es el de en medio: había picks y todos se han
                    cumplido ya con el partido en marcha, así que se han
                    retirado. Antes salía "prueba con otro mercado", que manda a
                    buscar donde no hay nada: el problema no es el filtro, es
                    que ya no queda nada que ofrecer.
                  */
                  <Vacio
                    icono={picksVisibles.length ? 'check' : 'filtro'}
                    titulo={
                      jugado
                        ? 'Sin picks para este filtro'
                        : picksVisibles.length
                          ? 'Los picks de este partido ya se han cumplido'
                          : 'Sin picks para este filtro'
                    }
                    detalle={
                      jugado
                        ? 'Este partido ya se jugó: mira las cuotas o el duelo.'
                        : picksVisibles.length
                          ? 'Con el marcador que lleva ya no queda nada que apostar aquí.'
                          : 'Prueba con otro mercado.'
                    }
                  />
                )}
              </View>
            ) : null}

            {pestana === 'formaciones' ? (
              <View style={{ padding: E.lg, gap: E.md }}>
                <Segmentado
                  valor={lado}
                  onCambia={setLado}
                  // También aquí el nombre entero: son dos botones a mitad de
                  // pantalla cada uno, hay sitio de sobra.
                  opciones={[
                    { id: 'local', texto: local.nombre },
                    { id: 'visitante', texto: visitante.nombre },
                  ]}
                />
                <Formacion
                  competicionId={competicionId}
                  partidoId={partidoId}
                  idEspn={partido.idEspn}
                  esLocal={lado === 'local'}
                  equipoId={lado === 'local' ? local.id : visitante.id}
                  color={lado === 'local' ? local.color : visitante.color}
                  jugadores={jugadores}
                />
              </View>
            ) : null}

            {pestana === 'lesiones' ? (
              <View style={{ padding: E.lg, gap: E.lg }}>
                {[local, visitante].map((e) => (
                  <View key={e.id} style={{ gap: E.sm }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.sm }}>
                      <Escudo nombre={e.nombre} id={e.id} bandera={e.bandera} corto={e.corto} tam={26} />
                      <Txt v="subtitulo">{e.nombre}</Txt>
                    </View>
                    <ListaBajas competicionId={competicionId} equipoId={e.id} />
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {vista === 'cuotas' ? (
          <View style={{ paddingHorizontal: E.lg, gap: E.lg }}>
            <Tarjeta style={{ overflow: 'hidden' }}>
              <View
                style={{
                  flexDirection: 'row',
                  paddingHorizontal: E.md,
                  paddingVertical: 10,
                  backgroundColor: C.carta2,
                }}
              >
                <Txt v="mini" color={C.texto3} style={{ flex: 1 }}>
                  CASA
                </Txt>
                {['1', 'X', '2'].map((t) => (
                  <Txt key={t} v="mini" color={C.texto3} style={{ width: 54, textAlign: 'center' }}>
                    {t}
                  </Txt>
                ))}
              </View>
              {CASAS.map((casa, i) => {
                const c = partido.cuotas.porCasa[casa.id];
                const mejor = Math.max(c.local, c.empate, c.visitante);
                return (
                  <View key={casa.id}>
                    {i > 0 ? <Separador /> : null}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: E.md,
                        paddingVertical: 12,
                      }}
                    >
                      <View
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: E.sm }}
                      >
                        <SelloCasa casaId={casa.id} tam={20} />
                        <Txt v="pequeno" numberOfLines={1}>
                          {casa.nombre}
                        </Txt>
                      </View>
                      {[c.local, c.empate, c.visitante].map((v, k) => (
                        <Txt
                          key={k}
                          v="cuerpoFuerte"
                          color={v === mejor ? C.lima : C.texto}
                          style={{ width: 54, textAlign: 'center' }}
                        >
                          {v.toFixed(2)}
                        </Txt>
                      ))}
                    </View>
                  </View>
                );
              })}
            </Tarjeta>

            <Tarjeta style={{ padding: E.md }}>
              <Txt v="cuerpoFuerte" style={{ marginBottom: E.sm }}>
                Otros mercados
              </Txt>
              <FilaDato etiqueta="Más de 2.5 goles" valor={partido.cuotas.mas25.toFixed(2)} destacado />
              <Separador />
              <FilaDato etiqueta="Menos de 2.5 goles" valor={partido.cuotas.menos25.toFixed(2)} />
              <Separador />
              <FilaDato etiqueta="Ambos marcan" valor={partido.cuotas.ambosMarcan.toFixed(2)} />
              <Separador />
              <FilaDato etiqueta="Ambos no marcan" valor={partido.cuotas.ambosNoMarcan.toFixed(2)} />
            </Tarjeta>

            <Txt v="mini" color={C.texto3}>
              Precios de referencia calculados por el modelo de Golden. Comprueba siempre la cuota
              real en tu casa antes de decidir.
            </Txt>
          </View>
        ) : null}

        {vista === 'duelo' ? (
          <Duelo
            competicionId={competicionId}
            partidoId={partidoId}
            localId={local.id}
            visitanteId={visitante.id}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

/**
 * Campo con el once y el banquillo. Si ESPN ya ha publicado la alineación
 * real se dibuja esa; mientras no la publique se enseña la que estima la app.
 */
function Formacion({
  competicionId,
  partidoId,
  idEspn,
  esLocal,
  equipoId,
  color,
  jugadores,
}: {
  competicionId: string;
  partidoId: string;
  /** Identificador del partido en ESPN, si viene de datos reales. */
  idEspn?: string;
  esLocal: boolean;
  equipoId: string;
  color: string;
  jugadores: Map<string, import('@/datos/tipos').Jugador>;
}) {
  const estimada = useCalculo(
    () => alineacion(competicionId, partidoId, equipoId),
    [competicionId, partidoId, equipoId],
  );

  /*
   * El once que publica ESPN manda sobre el que estima la app. Se pide desde
   * la pantalla y no en la importación porque los clubes lo anuncian una hora
   * antes del partido: descargado ayer no serviría de nada.
   */
  const [real, setReal] = useState<OnceEquipo | null>(null);
  useEffect(() => {
    if (!idEspn) return;
    let vivo = true;
    alineacionesDelPartido(competicionId, idEspn).then((a) => {
      if (vivo && a) setReal((esLocal ? a.local : a.visitante) ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [competicionId, idEspn, esLocal]);

  if (!estimada) return <ActivityIndicator color={C.lima} />;

  // Con menos de once no es una alineación, es una lista a medias.
  const confirmada = real && real.titulares.length >= 11 ? real : null;

  return (
    <View style={{ gap: E.md }}>
      {confirmada ? (
        <CampoReal once={confirmada} color={color} />
      ) : (
        <Campo alineacion={estimada} jugadores={jugadores} competicionId={competicionId} color={color} />
      )}

      <Tarjeta style={{ padding: E.md, gap: E.sm }}>
        <Txt v="cuerpoFuerte">Banquillo</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: E.sm }}>
          {confirmada
            ? confirmada.suplentes.map((s) => (
                <View key={`${s.dorsal}-${s.nombre}`} style={PILDORA}>
                  <Txt v="mini" color={C.texto3}>
                    {s.dorsal || '·'}
                  </Txt>
                  <Txt v="pequeno">{s.nombre}</Txt>
                </View>
              ))
            : estimada.suplentes.map((id) => {
                const jug = jugadores.get(id);
                if (!jug) return null;
                return (
                  <Pulsable
                    key={id}
                    onPress={() =>
                      router.push(`/jugador/${encodeURIComponent(id)}?comp=${competicionId}`)
                    }
                    style={PILDORA}
                  >
                    <Txt v="mini" color={C.texto3}>
                      {jug.dorsal}
                    </Txt>
                    <Txt v="pequeno">{jug.nombre}</Txt>
                  </Pulsable>
                );
              })}
        </View>
      </Tarjeta>
    </View>
  );
}

/** Cada nombre del banquillo va en una píldora igual, venga de donde venga. */
const PILDORA = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 6,
  paddingHorizontal: 10,
  paddingVertical: 7,
  borderRadius: R.pill,
  backgroundColor: C.carta2,
};

function ListaBajas({ competicionId, equipoId }: { competicionId: string; equipoId: string }) {
  const bajas = useCalculo(() => lesiones(competicionId, equipoId), [competicionId, equipoId]);
  if (!bajas) return <ActivityIndicator color={C.lima} />;
  if (!bajas.length) {
    return (
      <Tarjeta style={{ padding: E.md }}>
        <Txt v="pequeno" color={C.texto3}>
          Sin bajas conocidas.
        </Txt>
      </Tarjeta>
    );
  }
  const color = { baja: C.rojo, duda: C.ambar, sancionado: C.violeta };
  return (
    <Tarjeta style={{ overflow: 'hidden' }}>
      {bajas.map((b, i) => (
        <View key={b.jugadorId}>
          {i > 0 ? <Separador /> : null}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: E.md,
              paddingHorizontal: E.md,
              paddingVertical: 12,
            }}
          >
            <Icono nombre="botiquin" tam={17} color={color[b.estado]} />
            <View style={{ flex: 1 }}>
              <Txt v="cuerpo">{b.nombre}</Txt>
              <Txt v="mini" color={C.texto3}>
                {b.tipo} · {b.vuelta}
              </Txt>
            </View>
            <Insignia
              texto={b.estado === 'baja' ? 'BAJA' : b.estado === 'duda' ? 'DUDA' : 'SANCIÓN'}
              color={color[b.estado]}
              fondo={C.carta2}
            />
          </View>
        </View>
      ))}
    </Tarjeta>
  );
}

/** Comparativa cara a cara de los dos equipos sobre sus ultimos partidos. */
function Duelo({
  competicionId,
  partidoId,
  localId,
  visitanteId,
}: {
  competicionId: string;
  partidoId: string;
  localId: string;
  visitanteId: string;
}) {
  const datos = useCalculo(() => {
    const t = temporada(competicionId);
    const resumen = (equipoId: string) => {
      const suyos = (t.partidosPorEquipo.get(equipoId) ?? [])
        .filter((p) => p.estado === 'finalizado' && p.id !== partidoId)
        .slice(-10);
      const n = Math.max(1, suyos.length);
      const acumula = (f: (p: (typeof suyos)[number], esLocal: boolean) => number) =>
        suyos.reduce((a, p) => a + f(p, p.localId === equipoId), 0) / n;
      return {
        equipo: t.porEquipo.get(equipoId)!,
        partidos: suyos.length,
        goles: acumula((p, l) => (l ? p.golesLocal : p.golesVisitante)),
        encajados: acumula((p, l) => (l ? p.golesVisitante : p.golesLocal)),
        remates: acumula((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).remates),
        puerta: acumula((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).rematesPuerta),
        posesion: acumula((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).posesion),
        corners: acumula((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).corners),
        tarjetas: acumula((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).amarillas),
        xg: acumula((p, l) => (l ? p.estadisticas.local : p.estadisticas.visitante).xg),
        victorias: suyos.filter((p) =>
          p.localId === equipoId
            ? p.golesLocal > p.golesVisitante
            : p.golesVisitante > p.golesLocal,
        ).length,
      };
    };
    return { a: resumen(localId), b: resumen(visitanteId) };
  }, [competicionId, partidoId, localId, visitanteId]);

  if (!datos) return <ActivityIndicator color={C.lima} style={{ marginTop: E.xl }} />;

  const filas: { etiqueta: string; a: number; b: number; decimales?: number; sufijo?: string }[] = [
    { etiqueta: 'Victorias (últimos 10)', a: datos.a.victorias, b: datos.b.victorias },
    { etiqueta: 'Goles a favor', a: datos.a.goles, b: datos.b.goles, decimales: 2 },
    { etiqueta: 'Goles en contra', a: datos.a.encajados, b: datos.b.encajados, decimales: 2 },
    { etiqueta: 'xG estimado', a: datos.a.xg, b: datos.b.xg, decimales: 2 },
    { etiqueta: 'Remates', a: datos.a.remates, b: datos.b.remates, decimales: 1 },
    { etiqueta: 'Remates a puerta', a: datos.a.puerta, b: datos.b.puerta, decimales: 1 },
    { etiqueta: 'Posesión', a: datos.a.posesion, b: datos.b.posesion, decimales: 0, sufijo: '%' },
    { etiqueta: 'Córners', a: datos.a.corners, b: datos.b.corners, decimales: 1 },
    { etiqueta: 'Tarjetas', a: datos.a.tarjetas, b: datos.b.tarjetas, decimales: 1 },
  ];

  return (
    <View style={{ paddingHorizontal: E.lg, gap: E.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt v="cuerpoFuerte">{datos.a.equipo.corto}</Txt>
        <Txt v="mini" color={C.texto3}>
          MEDIA EN LOS ÚLTIMOS 10
        </Txt>
        <Txt v="cuerpoFuerte">{datos.b.equipo.corto}</Txt>
      </View>

      {filas.map((f) => {
        const total = f.a + f.b || 1;
        const pa = (f.a / total) * 100;
        return (
          <View key={f.etiqueta} style={{ gap: 6 }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Txt v="pequenoFuerte" color={f.a >= f.b ? C.lima : C.texto2}>
                {f.a.toFixed(f.decimales ?? 0)}
                {f.sufijo ?? ''}
              </Txt>
              <Txt v="mini" color={C.texto3}>
                {f.etiqueta}
              </Txt>
              <Txt v="pequenoFuerte" color={f.b > f.a ? C.lima : C.texto2}>
                {f.b.toFixed(f.decimales ?? 0)}
                {f.sufijo ?? ''}
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              <View style={{ flex: pa || 1 }}>
                <Barra valor={100} color={f.a >= f.b ? C.lima : C.neutro} />
              </View>
              <View style={{ flex: 100 - pa || 1 }}>
                <Barra valor={100} color={f.b > f.a ? C.lima : C.neutro} />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
