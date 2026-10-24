import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvisoCobroFallido, AvisoPagoEnProceso } from '@/componentes/avisos';
import { useAvisos } from '@/estado/avisos';
import {
  Chip,
  Insignia,
  Pulsable,
  Seccion,
  Tarjeta,
  TituloSeccion,
  Txt,
  Vacio,
} from '@/componentes/base';
import { PantallaCargando } from '@/componentes/cargando';
import { CarruselCompeticion, CarruselProximos } from '@/componentes/carruseles';
import { Icono } from '@/componentes/iconos';
import { Escudo } from '@/componentes/imagen';
import { FundidoInferior, Logo, Resplandor, Simbolo } from '@/componentes/marca';
import { Aparece, marca } from '@/componentes/movimiento';
import { TiraChips } from '@/componentes/navegacion';
import { TarjetaPick } from '@/componentes/pick';
import { competicion } from '@/datos/competiciones';
import { claveDelPartido , seJuegaAhora } from '@/datos/envivo';
import { detalleResuelto } from '@/datos/importado';
import { logosResueltos } from '@/datos/imagenes';
import { temporada } from '@/datos/motor';
import { FAMILIAS, picksDeCompeticionPorTrozos, reparteVariedad } from '@/datos/picks';
import { cargaPicks } from '@/datos/picksServidor';
import type { Familia, Pick } from '@/datos/tipos';
import { useComunidad } from '@/estado/comunidad';
import { useDerechos } from '@/estado/derechos';
import { useTienda } from '@/estado/tienda';
import { usePicksVigentes, useVivo } from '@/estado/vivo';
import { brillo, C, COLUMNA, E, HUECO_PESTANAS, R } from '@/tema';
import { useCalculo } from '@/utiles/carga';
import { useHayLateral } from '@/utiles/pantalla';
import { useEstadoCarga, usePicksDelServidor, usePicksFallaron } from '@/utiles/picks';
import { useRejilla } from '@/utiles/rejilla';
import { useOcultaPestanas } from './_layout';

type Orden = 'acierto' | 'probabilidad' | 'fuego';

/*
 * Aquí había tres órdenes más: "Valor", "Ventaja" y "Precio más alto". Los tres
 * ordenaban por la cuota o por la ventaja sobre la cuota, y la cuota de casi
 * todos los picks la pone el propio modelo: ordenar por eso es ordenar por lo
 * generoso que el modelo se ha puesto consigo mismo, no por nada del mercado.
 * Quedan los dos criterios que salen de hechos: cuántas veces ha pasado y
 * cuánta gente lo ha guardado.
 */
const ORDENES: { id: Orden; texto: string }[] = [
  { id: 'acierto', texto: '% de acierto' },
  { id: 'probabilidad', texto: 'Probabilidad' },
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
  /*
   * Los picks que llegan vaciados —los de una liga sin comprar— no traen
   * probabilidad ni aciertos: el servidor no los manda. Sin esto, comparar
   * `undefined` da NaN, el orden se vuelve impredecible y la portada de quien
   * no paga sale barajada de cualquier manera. Se tratan como cero: van detrás
   * de lo que sí se puede leer, que es lo que tiene sentido enseñar primero.
   */
  const prob = (p: Pick) => p.probabilidad ?? 0;
  const aciertos = (p: Pick) => p.aciertosL10 ?? 0;
  const copia = [...picks];

  switch (orden) {
    case 'acierto':
      // Los recomendados delante y, dentro de ellos, los de mas racha.
      return copia.sort(
        (a, b) =>
          porDia(a, b) ||
          Number(!!b.recomendado) - Number(!!a.recomendado) ||
          aciertos(b) - aciertos(a) ||
          prob(b) - prob(a),
      );
    case 'probabilidad':
      return copia.sort((a, b) => porDia(a, b) || prob(b) - prob(a));
    case 'fuego':
      /*
       * Por los guardados de VERDAD y nada mas. Sin guardados reales desempata
       * la probabilidad, que sale del historico del sujeto.
       */
      return copia.sort(
        (a, b) => porDia(a, b) || (cuenta(b) ?? 0) - (cuenta(a) ?? 0) || prob(b) - prob(a),
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
  esperandoEscudos,
}: {
  nombre: string;
  /** Los picks ya están; faltan los escudos. */
  esperandoEscudos?: boolean;
}) {
  /*
   * El paso en el que va, y no una frase fija con la barra quieta en el 40%:
   * así se ve si avanza, y si algo se atasca se sabe dónde.
   */
  const estado = useEstadoCarga();
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (esperandoEscudos) {
    return (
      <PantallaCargando titulo="Cargando escudos" detalle="Un momento" pie="Ya casi" parte={0.92} />
    );
  }

  const segundos = Math.max(0, Math.round((ahora - estado.desde) / 1000));
  const llegados = estado.total
    ? `${estado.recibidos.toLocaleString('es')} de ${estado.total.toLocaleString('es')} picks`
    : undefined;
  const detalle =
    estado.fase === 'cuenta'
      ? 'Comprobando tu cuenta'
      : estado.fase === 'preparando'
        ? `Preparando ${llegados ?? 'los picks'}`
        : 'Trayendo los picks de hoy';
  const parte =
    estado.fase === 'cuenta'
      ? 0.15
      : estado.fase === 'pidiendo'
        ? 0.35
        : estado.fase === 'preparando'
          ? 0.8
          : 0.25;
  // Más de quince segundos ya no es normal: se dice, y se ofrece volver a probar.
  const tarda = segundos >= 15;

  return (
    <PantallaCargando
      titulo={`Cargando ${nombre}`}
      detalle={detalle}
      parte={parte}
      pie={tarda ? `Está tardando más de lo normal (${segundos} s). Puede ser la conexión.` : undefined}
      accion={
        tarda
          ? {
              texto: 'Reintentar',
              onPress: () => {
                if (typeof window !== 'undefined') window.location.reload();
                else void cargaPicks(true);
              },
            }
          : undefined
      }
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
              borderTopColor: C.bordeLuz,
              backgroundColor: C.carta,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                {...marca('latido')}
                style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.rojo }}
              />
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

/** Lista vacía fija, para no estrenar una en cada pintado mientras cargan. */
const SIN_PICKS: Pick[] = [];

/**
 * El resumen del día, arriba de la portada.
 *
 * Todo sale de lo que ya hay en pantalla: cuántos picks hay en cartel, de
 * cuántos partidos, la confianza más alta y cuántos partidos se están jugando.
 * No es información nueva: es la misma lista contada, para que lo primero que
 * se vea sea un vistazo al día y no una tarjeta suelta.
 */
function PanelDelDia({ picks, competicionNombre }: { picks: Pick[]; competicionNombre: string }) {
  const { porPartido } = useVivo();
  let enJuego = 0;
  for (const p of porPartido.values()) if (seJuegaAhora(p.estado)) enJuego++;
  // Los que llegan con candado no traen probabilidad: no cuentan para el mejor.
  const mejor = picks.reduce((m, p) => (p.pro ? m : Math.max(m, p.probabilidad ?? 0)), 0);
  const partidos = new Set(picks.map((p) => p.partidoId)).size;
  const hoy = new Date().toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const datos = [
    { valor: String(partidos), texto: partidos === 1 ? 'partido' : 'partidos' },
    mejor > 0 ? { valor: `${Math.round(mejor * 100)}%`, texto: 'mejor confianza' } : null,
    enJuego > 0 ? { valor: String(enJuego), texto: 'en vivo', vivo: true } : null,
  ].filter(Boolean) as { valor: string; texto: string; vivo?: boolean }[];

  return (
    <View {...marca('entra')} style={{ marginHorizontal: E.lg }}>
      <LinearGradient
        colors={[C.carta2, C.carta]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: R.xl,
          borderWidth: 1,
          borderColor: C.borde,
          borderTopColor: C.bordeLuz,
          padding: E.lg,
          // Título y cifras en la misma fila si caben (ordenador) y una debajo
          // de otra si no (móvil): lo decide el ancho, sin medir nada.
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: E.md,
          overflow: 'hidden',
        }}
      >
        {/* La marca, enorme y casi transparente, de fondo en la esquina. */}
        <View
          style={{ position: 'absolute', right: -34, top: -30, opacity: 0.08, pointerEvents: 'none' }}
        >
          <Simbolo tam={150} />
        </View>

        <View style={{ gap: 2, flexGrow: 1, minWidth: 220 }}>
          <Txt v="etiqueta" color={C.lima} style={{ letterSpacing: 1.6 }}>
            HOY · {hoy.toUpperCase()}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: E.sm }}>
            <Txt v="displayXL" style={{ fontSize: 46, lineHeight: 50 }}>
              {picks.length}
            </Txt>
            <View style={{ paddingBottom: 7, flexShrink: 1 }}>
              <Txt v="cuerpoFuerte">
                {picks.length === 1 ? 'pick en cartel' : 'picks en cartel'}
              </Txt>
              <Txt v="mini" color={C.texto3} numberOfLines={1}>
                {competicionNombre}
              </Txt>
            </View>
          </View>
        </View>

        {datos.length ? (
          <View
            style={{ flexDirection: 'row', gap: E.sm, flexGrow: 1, minWidth: 260, maxWidth: 520 }}
          >
            {datos.map((d) => (
              <View
                key={d.texto}
                style={{
                  flex: 1,
                  gap: 1,
                  paddingVertical: E.sm,
                  paddingHorizontal: E.md,
                  borderRadius: R.md,
                  backgroundColor: 'rgba(7,10,15,0.45)',
                  borderWidth: 1,
                  borderColor: C.bordeSuave,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {d.vivo ? (
                    <View
                      {...marca('latido')}
                      style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.rojo }}
                    />
                  ) : null}
                  <Txt v="subtitulo" color={d.vivo ? C.rojo : C.texto}>
                    {d.valor}
                  </Txt>
                </View>
                <Txt v="mini" color={C.texto3} numberOfLines={1}>
                  {d.texto}
                </Txt>
              </View>
            ))}
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
}

/** El saludo de la cabecera del escritorio, según la hora. */
function saludo(): string {
  const h = new Date().getHours();
  return h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
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
  // En el escritorio el logo, el buscador y los avisos ya están en el menú.
  const conLateral = useHayLateral();

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
   * Los picks ya no se calculan aquí: los pide al servidor `picksServidor`.
   *
   * Antes esta pantalla analizaba hasta cien partidos en el teléfono, a partir
   * del archivo de datos. Ese archivo se le entrega a cualquiera con cuenta, y
   * el código es público, así que quien quisiera podía reproducir los picks de
   * todas las ligas sin pagar: el candado tapaba la pantalla, no el dato.
   *
   * Ahora llegan hechos y filtrados: enteros los que te tocan, vaciados los que
   * no. De paso la portada abre sin analizar nada.
   */
  const picks = usePicksDelServidor(competicionId);
  const fallaron = usePicksFallaron();

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

  /*
   * Los guardados solo deciden el orden en "Más guardados". En los demás
   * órdenes no se miran, y tenerlos de dependencia hacía que la lista entera
   * se reordenara cada vez que llegaba un contador nuevo —cada medio minuto y
   * en mitad del scroll—.
   */
  const comunidadParaOrden = orden === 'fuego' ? comunidad : undefined;

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
    return reparteVariedad(ordena(lista, orden, (p) => comunidadParaOrden?.cuenta(p.id)));
  }, [picks, familias, grupo, orden, partidosDelFiltro, comunidadParaOrden]);

  // Un partido que acaba de terminar deja de dar picks al momento.
  const enCartel = usePicksVigentes(visibles);
  // El cartel entero, sin los filtros de abajo, para el resumen del día.
  const delDia = usePicksVigentes(picks ?? SIN_PICKS);
  // Una, dos o tres tarjetas por fila según el ancho (ver `useRejilla`).
  const { columnas, fila, celda, lista } = useRejilla();

  const comp = competicion(competicionId);
  const familiasVisibles = todasFamilias ? FAMILIAS : FAMILIAS.slice(0, 5);

  /*
   * La portada no se enseña hasta que está TODO: los picks del servidor y los
   * escudos.
   *
   * Sin esperar a los escudos se veía la app montarse por partes: primero una
   * lista con los círculos en gris y un instante después todo otra vez. Dos
   * cargas en la misma pantalla.
   *
   * Ya no se espera al detalle de jugadores: los picks vienen hechos, así que
   * ese archivo solo hace falta para los gráficos de dentro de una ficha.
   *
   * El tope de diez segundos es la red de seguridad: con mala conexión, antes
   * que dejar a alguien mirando la pantalla de carga, se enseña lo que haya.
   */
  const [seAcabaLaEspera, setSeAcabaLaEspera] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSeAcabaLaEspera(true), 10_000);
    return () => clearTimeout(t);
  }, []);
  // Los escudos: una portada con los círculos en gris es una portada a medias.
  const faltanEscudos = !logosResueltos() && !seAcabaLaEspera;
  const cargando = !picks || faltanEscudos;

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
        <Cargando nombre={comp.nombre} esperandoEscudos={!!picks && faltanEscudos} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top }}>
      {/* Ambiente detrás de la cabecera, de lado a lado de la ventana. */}
      <Resplandor alto={340 + insets.top} />
      <FlatList
        // Cambiar el número de columnas obliga a montar la lista de nuevo.
        key={columnas}
        numColumns={columnas}
        columnWrapperStyle={fila}
        data={enCartel}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[
          { paddingBottom: HUECO_PESTANAS + insets.bottom, gap: E.md },
          COLUMNA.amplia,
        ]}
        showsVerticalScrollIndicator={false}
        {...lista}
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
              {conLateral ? (
                <View style={{ gap: 2 }}>
                  <Txt v="display" titular>
                    {saludo()}
                  </Txt>
                  <Txt v="pequeno" color={C.texto3}>
                    {comp.nombre}
                  </Txt>
                </View>
              ) : (
                <Logo tam={21} />
              )}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: E.sm,
                  display: conLateral ? 'none' : 'flex',
                }}
              >
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
                    borderTopColor: C.bordeLuz,
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
                    borderTopColor: C.bordeLuz,
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
                    borderTopColor: C.bordeLuz,
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

            <PanelDelDia picks={delDia} competicionNombre={comp.nombre} />

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
                marcas="eleva brillo"
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
                  boxShadow: brillo.lima,
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
                <TituloSeccion>Picks destacadas</TituloSeccion>
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
                <Tarjeta marcas="despliega" style={{ marginHorizontal: E.lg, overflow: 'hidden' }}>
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
                    borderTopColor: C.bordeLuz,
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
        renderItem={({ item, index }) => (
          <Aparece orden={index} style={celda ?? { paddingHorizontal: E.lg }}>
            <TarjetaPick pick={item} />
          </Aparece>
        )}
        ListEmptyComponent={
          /* Aquí ya no hay "analizando": si se está calculando, lo que se ve es
             la pantalla de carga entera y no se llega a pintar la lista. */
          fallaron ? (
            // Sin red o con el servidor sin contestar: se dice, y se ofrece
            // volver a probar en vez de culpar a los filtros.
            <View style={{ alignItems: 'center', gap: E.md }}>
              <Vacio
                icono="recarga"
                titulo="No se pudieron traer los picks"
                detalle="Puede ser la conexión. Vuelve a intentarlo en un momento."
              />
              <Pulsable
                onPress={() => void cargaPicks(true)}
                marcas="brillo"
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: R.md,
                  backgroundColor: C.lima,
                  boxShadow: brillo.limaFuerte,
                }}
              >
                <Txt v="cuerpoFuerte" color={C.fondo}>
                  Reintentar
                </Txt>
              </Pulsable>
            </View>
          ) : (
            <Vacio
              icono="filtro"
              titulo="Sin picks con estos filtros"
              detalle="Prueba a quitar algún filtro o cambia de competición."
            />
          )
        }
      />

      {/* Flota abajo, sobre la lista, y se cierra con la equis. Va en Inicio
          porque al perfil se entra poco y un aviso que nadie ve no es un
          aviso. Se pinta después de la lista para quedar por encima. */}
      {/* La lista se desvanece antes de llegar a la barra flotante. */}
      <FundidoInferior />
      <AvisoCobroFallido flotante />
    </View>
  );
}
