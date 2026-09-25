import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvisoCobroFallido, AvisoPagoEnProceso } from '@/componentes/avisos';
import { useAvisos } from '@/estado/avisos';
import { Chip, Insignia, Pulsable, Seccion, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { PantallaCargando } from '@/componentes/cargando';
import { CarruselCompeticion, CarruselProximos } from '@/componentes/carruseles';
import { Icono } from '@/componentes/iconos';
import { Escudo } from '@/componentes/imagen';
import { Logo } from '@/componentes/marca';
import { TiraChips } from '@/componentes/navegacion';
import { TarjetaPick } from '@/componentes/pick';
import { competicion } from '@/datos/competiciones';
import { claveDelPartido , seJuegaAhora } from '@/datos/envivo';
import { detalleResuelto } from '@/datos/importado';
import { logosResueltos } from '@/datos/imagenes';
import { temporada } from '@/datos/motor';
import { FAMILIAS, picksDeCompeticionPorTrozos, reparteVariedad } from '@/datos/picks';
import type { Familia, Pick } from '@/datos/tipos';
import { useComunidad } from '@/estado/comunidad';
import { useDerechos } from '@/estado/derechos';
import { useTienda } from '@/estado/tienda';
import { usePicksVigentes, useVivo } from '@/estado/vivo';
import { C, E, R } from '@/tema';
import { useCalculo, useCalculoProgresivo } from '@/utiles/carga';
import { useOcultaPestanas } from './_layout';

type Orden = 'valor' | 'ventaja' | 'acierto' | 'cuota' | 'fuego';

const ORDENES: { id: Orden; texto: string }[] = [
  { id: 'valor', texto: 'Valor' },
  { id: 'ventaja', texto: 'Ventaja' },
  { id: 'acierto', texto: '% de acierto' },
  { id: 'cuota', texto: 'Precio más alto' },
  { id: 'fuego', texto: 'Más guardados' },
];

function ordena(
  picks: Pick[],
  orden: Orden,
  /** Guardados reales de un pick, o indefinido si no hay contador detrás. */
  cuenta: (p: Pick) => number | undefined,
): Pick[] {
  /*
   * Lo de hoy manda, siempre, ordene como ordene el usuario.
   *
   * Cada modo ordenaba solo por lo suyo —acierto, cuota, ventaja— y se llevaba
   * por delante el orden por fecha con el que se monta la portada: aparecian
   * arriba picks de partidos de dentro de dos semanas, impecables de racha pero
   * inutiles hoy. Ahora la cercania va primero en todos los modos y lo elegido
   * decide dentro de cada dia.
   *
   * Por dias enteros y no por hora exacta: si no, el criterio del usuario no
   * pintaria nada —cada pick tiene una hora distinta y siempre ganaria el que
   * juega antes—.
   */
  const inicioDeHoy = new Date();
  inicioDeHoy.setHours(0, 0, 0, 0);
  const dia = (p: Pick) => {
    if (!p.cuando) return 9999;
    const d = Math.floor(
      (new Date(p.cuando).getTime() - inicioDeHoy.getTime()) / 86400000,
    );
    // Lo que ya empezo cuenta como hoy: sigue siendo lo mas cercano.
    return Math.max(0, d);
  };

  const porDia = (a: Pick, b: Pick) => dia(a) - dia(b);
  const copia = [...picks];

  switch (orden) {
    case 'ventaja':
      return copia.sort((a, b) => porDia(a, b) || b.ventaja - a.ventaja);
    case 'acierto':
      // Los recomendados delante y, dentro de ellos, los de mas racha.
      return copia.sort(
        (a, b) =>
          porDia(a, b) ||
          Number(b.recomendado) - Number(a.recomendado) ||
          b.aciertosL10 - a.aciertosL10 ||
          b.ventaja - a.ventaja,
      );
    case 'cuota':
      return copia.sort((a, b) => porDia(a, b) || b.cuota - a.cuota);
    case 'fuego':
      /*
       * Por los guardados de VERDAD y nada mas. El numero inventado que hacia
       * de respaldo ya no existe: sin guardados reales, este orden se decide
       * por la ventaja, que al menos dice algo del pick.
       */
      return copia.sort(
        (a, b) => porDia(a, b) || (cuenta(b) ?? 0) - (cuenta(a) ?? 0) || b.ventaja - a.ventaja,
      );
    default:
      // El generador ya entrega por cercania y calidad: no se toca.
      return copia;
  }
}

/**
 * La pantalla de carga de la portada: la misma que enseña el arranque, con
 * otra frase. Ver `PantallaCargando`.
 */
function Cargando({
  nombre,
  avance,
  esperandoJugadores,
}: {
  nombre: string;
  avance?: { picks: Pick[]; hechos: number; total: number };
  /** Los picks ya están; falta la segunda pieza de datos, la de jugadores. */
  esperandoJugadores?: boolean;
}) {
  if (esperandoJugadores) {
    return (
      <PantallaCargando
        titulo="Cargando estadísticas de jugadores"
        detalle="Es la parte más pesada; solo la primera vez"
        pie="Ya casi"
        parte={0.92}
      />
    );
  }
  return (
    <PantallaCargando
      titulo={`Analizando ${nombre}`}
      detalle={avance ? `${avance.hechos} de ${avance.total} partidos` : 'Preparando los datos…'}
      /*
       * Lo que lleva encontrado. No es un adorno: enseña que el trabajo está
       * dando resultado y no solo consumiendo tiempo.
       */
      pie={
        avance?.picks.length
          ? `${avance.picks.length} picks encontrados`
          : 'Buscando picks con valor…'
      }
      parte={avance && avance.total ? Math.min(1, avance.hechos / avance.total) : undefined}
    />
  );
}

/**
 * Tira de partidos que se estan jugando ahora mismo, en cualquiera de las
 * competiciones descargadas. Sale del directo de ESPN, no del archivo: el
 * archivo es una foto y aqui lo que importa es el minuto de ahora.
 *
 * Primero los de la competicion elegida, pero sin esconder el resto: si el
 * usuario esta en LaLiga y lo unico en juego es la Eredivisie, lo ve igual.
 */
function EnVivo({ competicionId }: { competicionId: string }) {
  const { porPartido } = useVivo();

  const datos = useMemo(() => {
    const enJuego = [...porPartido.values()].filter(
      (p) => seJuegaAhora(p.estado),
    );
    if (!enJuego.length) return [];

    const salida = [];
    /*
     * Un partido importado no puede salir dos veces en la tira.
     *
     * El partido se busca por la pareja de equipos, y en una liga esos mismos
     * dos se enfrentan en la ida y en la vuelta: dos encuentros en directo
     * distintos pueden acabar apuntando a la misma ficha. Cuando pasaba, la
     * lista repetía la tarjeta y React se quejaba de dos hijos con la misma
     * clave —y con claves repetidas puede descartar elementos sin avisar—.
     */
    const yaPuestos = new Set<string>();
    for (const v of enJuego) {
      const t = temporada(v.competicionId);
      // Se busca el partido importado para poder abrir su ficha.
      const clave = claveDelPartido(v.local, v.visitante);
      const partido = t.partidos.find((p) => {
        const l = t.porEquipo.get(p.localId);
        const vi = t.porEquipo.get(p.visitanteId);
        return l && vi && claveDelPartido(l.nombre, vi.nombre) === clave;
      });
      if (!partido) continue;
      if (yaPuestos.has(partido.id)) continue;
      yaPuestos.add(partido.id);
      salida.push({
        partido,
        vivo: v,
        local: t.porEquipo.get(partido.localId)!,
        visitante: t.porEquipo.get(partido.visitanteId)!,
      });
    }
    // La competicion elegida delante.
    salida.sort((a, b) => Number(b.vivo.competicionId === competicionId) - Number(a.vivo.competicionId === competicionId));
    return salida.slice(0, 8);
  }, [porPartido, competicionId]);

  if (!datos?.length) return null;

  return (
    <View style={{ marginBottom: E.lg }}>
      <Seccion titulo="En vivo" accion="Ver todos" onAccion={() => router.push('/partidos')} />
      <TiraChips>
        {datos.map(({ partido, vivo, local, visitante }) => (
          <Pulsable
            key={partido.id}
            onPress={() =>
              router.push(`/partido/${encodeURIComponent(partido.id)}?comp=${vivo.competicionId}`)
            }
            style={{
              width: 210,
              padding: E.md,
              gap: 10,
              borderRadius: R.lg,
              borderWidth: 1,
              borderColor: C.borde,
              backgroundColor: C.carta,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.rojo }} />
              <Txt v="etiqueta" color={C.rojo}>
                {vivo.estado === 'descanso'
                  ? 'DESCANSO'
                  : vivo.estado === 'penales'
                    ? 'PENALTIS'
                    : `${vivo.reloj ?? vivo.minuto ?? 0}'`}
              </Txt>
              <View style={{ flex: 1 }} />
              <Txt v="mini" color={C.texto3} numberOfLines={1}>
                {competicion(vivo.competicionId).nombre.toUpperCase()}
              </Txt>
            </View>
            {[
              { e: local, g: vivo.golesLocal },
              { e: visitante, g: vivo.golesVisitante },
            ].map(({ e, g }) => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Escudo nombre={e.nombre} id={e.id} bandera={e.bandera} corto={e.corto} tam={24} />
                <Txt v="pequeno" style={{ flex: 1 }} numberOfLines={1}>
                  {e.nombre}
                </Txt>
                <Txt v="cuerpoFuerte">{g}</Txt>
              </View>
            ))}
          </Pulsable>
        ))}
      </TiraChips>
    </View>
  );
}

export default function Inicio() {
  const { ajustes, cambiaAjuste } = useTienda();
  const insets = useSafeAreaInsets();
  const competicionId = ajustes.competicionId;

  const [grupo, setGrupo] = useState<string | undefined>(undefined);
  const [familias, setFamilias] = useState<Familia[]>([]);
  // Por defecto, los de más probabilidad de ganar primero: es lo que la
  // portada tiene que poner delante. El usuario puede cambiar el orden.
  const [orden, setOrden] = useState<Orden>('acierto');
  const [menuOrden, setMenuOrden] = useState(false);
  const [todasFamilias, setTodasFamilias] = useState(false);

  // Lo que el usuario tiene comprado: decide qué picks van con candado, y si
  // hace falta enseñarle el pick gratis (a quien ya paga no le dice nada).
  const { libres, pro } = useDerechos();
  // Los guardados de verdad, para poder ordenar por "Más guardados" sin
  // recurrir al número que inventa el generador.
  const comunidad = useComunidad();
  // Para el globo rojo de la campana.
  const { sinLeer } = useAvisos();

  const equipos = useCalculo(() => temporada(competicionId).equipos, [competicionId]);
  /*
   * Por trozos, no de una tirada.
   *
   * Analizar un partido cuesta unos 70 ms y aquí se miran cuarenta. De golpe
   * son casi tres segundos con el navegador congelado —JavaScript no tiene
   * hilos—, y con "Todas" activa la app parecía colgada al abrirla.
   *
   * Así aparecen las primeras tarjetas enseguida y la lista se completa sola,
   * respondiendo a los toques mientras tanto.
   */
  /*
   * Sin tope corto: la portada enseña todos los picks de todos los partidos,
   * con los de más aciertos arriba. El número es un techo de seguridad para que
   * la lista no crezca sin límite, no un recorte de lo que se ve.
   */
  /*
   * En móvil se acota cuántos partidos analiza la portada.
   *
   * "Todas" son los partidos de hoy de cincuenta y dos competiciones, y un
   * teléfono no puede con todos de golpe: se queda "Analizando…" varios
   * segundos. Con la pantalla estrecha se analizan los ~40 más cercanos —los de
   * hoy y mañana, que es lo que se apuesta— y la portada abre al momento. En el
   * PC no hay tope: le sobra músculo y así no se pierde nada.
   */
  const { width } = useWindowDimensions();
  const topePartidos = width < 820 ? 40 : undefined;
  /*
   * `final` y no lo que va saliendo: la lista se pinta cuando está entera.
   *
   * Mientras se calcula manda la pantalla de carga, con el recuento de `avance`.
   * Antes se iba pintando a trozos y el resultado era una portada que crecía
   * sola durante varios segundos, con las tarjetas moviéndose bajo el dedo.
   */
  const { avance, final: picks } = useCalculoProgresivo(
    () => picksDeCompeticionPorTrozos(competicionId, ajustes.casaId, 2000, libres, 3, topePartidos),
    [competicionId, ajustes.casaId, libres, topePartidos],
  );

  /** Partidos que entran en el filtro del carrusel (un grupo o un equipo). */
  const partidosDelFiltro = useCalculo(() => {
    if (!grupo) return undefined;
    const t = temporada(competicionId);
    const delGrupo = new Set(
      t.equipos.filter((e) => e.grupo === grupo || e.id === grupo).map((e) => e.id),
    );
    return new Set(
      t.partidos
        .filter((p) => delGrupo.has(p.localId) || delGrupo.has(p.visitanteId))
        .map((p) => p.id),
    );
  }, [competicionId, grupo]);

  const visibles = useMemo(() => {
    if (!picks) return [];
    let lista = picks;
    if (familias.length) lista = lista.filter((p) => familias.includes(p.familia));
    if (grupo && partidosDelFiltro) lista = lista.filter((p) => partidosDelFiltro.has(p.partidoId));
    /*
     * Se ordena y DESPUÉS se reparte.
     *
     * El reparto tiene que ir al final, no al generar: cualquier reordenación
     * lo deshace. Se repartía al montar la lista y aquí se volvía a ordenar por
     * acierto, así que los hándicaps —que aciertan casi siempre y suben todos
     * juntos— acababan otra vez pegados: cuatro de cada cinco tarjetas.
     */
    return reparteVariedad(ordena(lista, orden, (p) => comunidad.cuenta(p.id)));
  }, [picks, familias, grupo, orden, partidosDelFiltro, comunidad]);

  // Un partido que acaba de terminar deja de dar picks al momento.
  const enCartel = usePicksVigentes(visibles);

  const comp = competicion(competicionId);
  const familiasVisibles = todasFamilias ? FAMILIAS : FAMILIAS.slice(0, 5);

  /*
   * La portada no se enseña hasta que está TODO: los picks calculados y la
   * segunda pieza de datos —la de jugadores— resuelta.
   *
   * Sin esperar a los jugadores se veía la app montarse por partes: primero una
   * lista con los escudos en gris y las tarjetas sin analizar, y dos segundos
   * después todo otra vez, ya completo. Dos cargas en la misma pantalla.
   *
   * El tope de diez segundos es la red de seguridad: con mala conexión, antes
   * que dejar a alguien mirando la pantalla de carga, se enseña lo que haya.
   */
  const [seAcabaLaEspera, setSeAcabaLaEspera] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSeAcabaLaEspera(true), 10_000);
    return () => clearTimeout(t);
  }, []);
  const faltanJugadores = !detalleResuelto() && !seAcabaLaEspera;
  // Y los escudos: una portada con los círculos en gris es una portada a medias.
  const faltanEscudos = !logosResueltos() && !seAcabaLaEspera;
  const cargando = !picks || faltanJugadores || faltanEscudos;

  // Mientras carga no se ve nada más: tampoco la barra de pestañas.
  useOcultaPestanas(cargando);

  /*
   * Hasta que esté todo, la pantalla de carga y nada más. Va después de los
   * hooks —todos están arriba— porque un return antes cambiaría cuántos se
   * ejecutan y React no lo admite.
   */
  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top }}>
        <Cargando
          nombre={comp.nombre}
          avance={avance}
          esperandoJugadores={!!picks && (faltanJugadores || faltanEscudos)}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top }}>
      <FlatList
        data={enCartel}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: E.xxxl, gap: E.md }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: E.lg, marginBottom: E.xs }}>
            {/*
              Aquí había una barra fina de progreso para los recálculos con la
              lista ya puesta. Fuera: con la portada delante, una barra que
              aparece y desaparece sola en lo alto de la pantalla no informa de
              nada —nadie sabe de qué va— y lo único que transmite es que la app
              sigue a medio cargar. Lo que se recalcula se cambia de golpe
              cuando está, sin anunciarlo.
            */}

            {/* -------------------------------------------------- cabecera */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: E.lg,
                paddingTop: E.sm,
              }}
            >
              <Logo tam={21} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.sm }}>
                <Pulsable
                  onPress={() => router.push('/buscar')}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: C.borde,
                    backgroundColor: C.carta,
                  }}
                >
                  <Icono nombre="buscar" tam={17} color={C.texto} />
                </Pulsable>
                {/*
                  La campana, con el número de avisos sin leer. Va junto al
                  perfil porque es donde la busca todo el mundo, y el globo rojo
                  es lo único que hace que se mire.
                */}
                <Pulsable
                  onPress={() => router.push('/avisos')}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: C.carta2,
                    borderWidth: 1,
                    borderColor: C.borde,
                  }}
                >
                  <Icono nombre="campana" tam={17} color={C.texto2} />
                  {sinLeer ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -2,
                        right: -2,
                        minWidth: 17,
                        height: 17,
                        borderRadius: 9,
                        paddingHorizontal: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: C.rojo,
                        borderWidth: 2,
                        borderColor: C.fondo,
                      }}
                    >
                      <Txt v="mini" color="#FFF">
                        {sinLeer > 9 ? '9+' : sinLeer}
                      </Txt>
                    </View>
                  ) : null}
                </Pulsable>

                <Pulsable
                  onPress={() => router.push('/perfil')}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: C.carta2,
                    borderWidth: 1,
                    borderColor: C.borde,
                  }}
                >
                  <Icono nombre="usuario" tam={17} color={C.texto2} />
                </Pulsable>
              </View>
            </View>

            {/*
              Justo debajo de la cabecera: quien vuelve de pagar aterriza aquí
              y esto es lo primero que tiene que leer, antes que los picks.
            */}
            <AvisoPagoEnProceso />

            {/*
              El pick gratis del día, solo para quien no tiene plan.

              Va arriba del todo y en verde porque es lo único abierto para
              quien no paga: el que entra sin plan tiene que ver enseguida que
              hay algo suyo aquí, no una lista de candados. A quien ya paga no
              se le enseña —tiene todos los picks abiertos—, porque un botón que
              dice "gratis" en una app que ya pagó solo ocupa sitio.
            */}
            {pro ? null : (
              <Pulsable
                onPress={() => router.push('/gratis')}
                style={{
                  marginHorizontal: E.lg,
                  padding: E.md,
                  borderRadius: R.lg,
                  borderWidth: 1,
                  borderColor: C.limaBorde,
                  backgroundColor: C.limaTenue,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: E.md,
                }}
              >
                <Txt v="titulo" style={{ fontSize: 20 }}>
                  🎁
                </Txt>
                <View style={{ flex: 1 }}>
                  <Txt v="cuerpoFuerte" color={C.lima}>
                    Pick gratis de hoy
                  </Txt>
                  <Txt v="mini" color={C.texto3}>
                    El de más confianza, abierto para todos
                  </Txt>
                </View>
                <Icono nombre="flechaDerecha" tam={14} color={C.lima} />
              </Pulsable>
            )}

            {/* ------------------------------------------------- carrusel */}
            {/* Arriba, lo que se juega a continuación en todas las
                competiciones; debajo, el filtro de la competición activa. */}
            <CarruselProximos />

            {equipos ? (
              <CarruselCompeticion
                competicionId={competicionId}
                equipos={equipos}
                grupo={grupo}
                onGrupo={setGrupo}
              />
            ) : null}

            {/* -------------------------------------------------- filtros */}
            <View style={{ gap: E.md }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: E.lg,
                }}
              >
                <Txt v="subtitulo">Picks destacadas</Txt>
                <Pulsable
                  onPress={() => setMenuOrden((v) => !v)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Txt v="pequeno" color={C.texto2}>
                    {ORDENES.find((o) => o.id === orden)?.texto}
                  </Txt>
                  <Icono nombre={menuOrden ? 'flechaArriba' : 'flechaAbajo'} tam={14} color={C.texto2} />
                </Pulsable>
              </View>

              {menuOrden ? (
                <Tarjeta style={{ marginHorizontal: E.lg, overflow: 'hidden' }}>
                  {ORDENES.map((o) => (
                    <Pulsable
                      key={o.id}
                      onPress={() => {
                        setOrden(o.id);
                        setMenuOrden(false);
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: E.md,
                        paddingVertical: 12,
                      }}
                    >
                      <Txt v="cuerpo" color={o.id === orden ? C.lima : C.texto}>
                        {o.texto}
                      </Txt>
                      {o.id === orden ? <Icono nombre="check" tam={15} color={C.lima} /> : null}
                    </Pulsable>
                  ))}
                </Tarjeta>
              ) : null}

              <TiraChips>
                {familiasVisibles.map((f) => (
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
                <Pulsable
                  onPress={() => setTodasFamilias((v) => !v)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: C.borde,
                    backgroundColor: C.carta,
                  }}
                >
                  <Icono
                    nombre={todasFamilias ? 'flechaIzquierda' : 'flechaAbajo'}
                    tam={15}
                    color={C.texto2}
                  />
                </Pulsable>
              </TiraChips>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: E.lg,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.sm }}>
                <Txt v="cuerpoFuerte">Pick destacados</Txt>
                <Insignia texto={comp.corto.toUpperCase()} />
              </View>
              <Pulsable onPress={() => router.push('/picks')}>
                <Txt v="pequeno" color={C.texto2}>
                  Ver todo
                </Txt>
              </Pulsable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: E.lg }}>
            <TarjetaPick pick={item} />
          </View>
        )}
        ListEmptyComponent={
          /* Aquí ya no hay "analizando": si se está calculando, lo que se ve es
             la pantalla de carga entera y no se llega a pintar la lista. */
          <Vacio
            icono="filtro"
            titulo="Sin picks con estos filtros"
            detalle="Prueba a quitar algún filtro o cambia de competición."
          />
        }
      />

      {/* Flota abajo, sobre la lista, y se cierra con la equis. Va en Inicio
          porque al perfil se entra poco y un aviso que nadie ve no es un
          aviso. Se pinta después de la lista para quedar por encima. */}
      <AvisoCobroFallido flotante />
    </View>
  );
}
