import { seJuegaAhora } from '@/datos/envivo';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Fuego, Insignia, Pulsable, Separador, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { Icono } from '@/componentes/iconos';
import { Escudo, LogoCompeticion } from '@/componentes/imagen';
import { CabeceraAtras, FilaDato } from '@/componentes/navegacion';
import { Avatar, BarraL10, FilaMercado, TarjetaPick } from '@/componentes/pick';
import { competicion } from '@/datos/competiciones';
import { partidosDelEquipoEnTodas } from '@/datos/importado';
import { temporada } from '@/datos/motor';
import { coma, METRICAS_EQUIPO, METRICAS_JUGADOR, picksDePartido } from '@/datos/picks';
import { useComunidad } from '@/estado/comunidad';
import { useDerechos } from '@/estado/derechos';
import { useTienda } from '@/estado/tienda';
import { usePartidoVivoDe } from '@/estado/vivo';
import { C, E, R } from '@/tema';

/**
 * Comparte un pick.
 *
 * Es la via de crecimiento mas directa que tiene la app: alguien manda un pick
 * a su grupo, y quien lo recibe entra por el enlace y se encuentra la ficha
 * entera. Por eso el texto lleva la racha —que es el gancho— y no solo el
 * nombre del mercado.
 *
 * En el movil abre el menu del sistema (WhatsApp, Telegram…); donde no exista,
 * copia al portapapeles, que es lo unico que funciona en todos los navegadores
 * de escritorio.
 *
 * Un pick con candado NO se comparte entero: iria el analisis de una liga de
 * pago a alguien que no la ha pagado, que es justo lo que el muro impide.
 */
async function comparte(texto: string): Promise<'compartido' | 'copiado' | null> {
  if (typeof navigator === 'undefined') return null;
  try {
    if ((navigator as any).share) {
      await (navigator as any).share({ text: texto });
      return 'compartido';
    }
    await navigator.clipboard.writeText(texto);
    return 'copiado';
  } catch {
    // Cancelar el menu de compartir tira una excepcion: no es un fallo.
    return null;
  }
}
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
  const jugando = seJuegaAhora(estado);
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
function Serie({
  valores,
  linea,
  sentido,
}: {
  valores: number[];
  linea: number;
  /*
   * Hacia donde acierta el pick.
   *
   * Sin esto se pintaba de verde todo lo que superaba la linea, fuera cual
   * fuera el pick: en un "Menos de 14,5 remates" que le habia salido 10 de 10,
   * el grafico enseñaba diez barras grises —ninguna pasa la linea, que es
   * justo lo que se buscaba— y parecia que el pick no habia acertado nunca.
   */
  sentido: 'mas' | 'menos' | 'si' | 'no';
}) {
  /*
   * La escala no se fija con el valor más alto, sino con el grueso de los datos.
   *
   * Con `max(...valores)` un solo partido disparatado —seis remates cuando la
   * línea es 0,5— achataba todas las demás barras a rayitas y hundía la línea
   * del mercado al fondo: el gráfico se veía roto y no se entendía nada. Ahora
   * la escala sale del percentil 80, así que un pico aislado se queda al tope
   * (clamp al 100%) sin arrastrar al resto, y la línea queda siempre a media
   * altura, legible. El `linea * 1.8` es el mínimo: si casi nadie pasa la línea,
   * que al menos se vea dónde está.
   */
  const ordenados = [...valores].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  const grueso = ordenados.length
    ? ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * 0.8))]
    : 0;
  const maximo = Math.max(linea * 1.8, grueso, 1);
  const alto = (v: number) => Math.min(100, Math.max(6, (v / maximo) * 100));
  const acierta = (v: number) => (sentido === 'menos' || sentido === 'no' ? v < linea : v > linea);
  return (
    <View style={{ gap: E.sm }}>
      <View style={{ height: 96, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        {valores.map((v, i) => (
          <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <View
              style={{
                height: `${alto(v)}%`,
                borderRadius: 3,
                backgroundColor: acierta(v) ? C.acierto : C.neutro,
              }}
            />
          </View>
        ))}
        {/* La linea del mercado, a la altura que le toca (nunca fuera del alto). */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: `${Math.min(100, (linea / maximo) * 100)}%`,
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
  /*
   * Este estado va aqui arriba, antes de cualquier `return`.
   *
   * Estaba mas abajo, despues del `if (!pick) return`, y eso rompe la regla de
   * los hooks de React: cuando el pick no estaba, el estado no se creaba, y en
   * el siguiente dibujado el numero de hooks cambiaba. La pantalla del pick se
   * quedaba EN BLANCO al abrirla desde la portada.
   */
  // Aviso de "copiado", para cuando el navegador no tiene menu de compartir.
  const [avisoCompartir, setAvisoCompartir] = useState<string | null>(null);
  const { id, comp, partido: partidoParam } = useLocalSearchParams<{
    id: string;
    comp: string;
    partido?: string;
  }>();
  const { ajustes, estaGuardado, guardar, quitar } = useTienda();
  const { libres, tieneAcceso } = useDerechos();
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

  /*

   * Si esta competicion se le vende a este usuario. Mismo criterio que la

   * tarjeta: el pick viene marcado como `pro` y no consta comprado.

   */

  const bloqueado = !!pick?.pro && !tieneAcceso(pick.competicionId);

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
      /*
       * Su historial en TODAS las competiciones, no solo en esta.
       *
       * Con `t.partidosPorEquipo` salian unicamente los partidos de la
       * competicion abierta: en un pick de Braga en la Conference eso son dos
       * o tres, asi que el grafico quedaba practicamente vacio y la "media de
       * la temporada" era la de un par de partidos —2,80 debajo de un pick que
       * hablaba de 10,4 de media—. Es la misma fuente que usa el motor para
       * decidir el pick (`picks.ts`), asi que ahora la ficha enseña los
       * numeros con los que se calculo.
       */
      const suyos = partidosDelEquipoEnTodas(equipo.nombre, equipo.bandera)
        .map(({ partido, esLocal }) => ({ ...partido, esLocal }))
        .filter((p) => p.estado === 'finalizado' && p.id !== pick.partidoId)
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      // El lado viene del historial: fuera de esta competicion el equipo tiene
      // otro id, asi que comparar con `localId` daria "visitante" siempre.
      const valor = (p: (typeof suyos)[number]) => metEquipo.valor(p, p.esLocal);
      const acierta = (v: number) =>
        pick.sentido === 'menos' || pick.sentido === 'no' ? v < pick.linea : v > pick.linea;
      const tasa = (lista: typeof suyos) =>
        lista.length
          ? (lista.filter((p) => acierta(valor(p))).length / lista.length) * 100
          : 0;
      return {
        tipo: 'equipo' as const,
        equipo,
        serie: suyos.slice(-20).map(valor),
        cortes: [
          { etiqueta: 'Toda la temporada', valor: tasa(suyos), n: suyos.length },
          {
            etiqueta: 'En casa',
            valor: tasa(suyos.filter((p) => p.esLocal)),
            n: suyos.filter((p) => p.esLocal).length,
          },
          {
            etiqueta: 'Fuera',
            valor: tasa(suyos.filter((p) => !p.esLocal)),
            n: suyos.filter((p) => !p.esLocal).length,
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
      <CabeceraAtras
        titulo="Detalle del pick"
        subtitulo={competicion(competicionId).nombre}
        accion={
          <Pulsable
            onPress={async () => {
              /*
               * Con candado se comparte una invitacion, no el analisis: mandar
               * la racha y el mercado de una liga de pago a quien no la ha
               * pagado es saltarse el muro por la puerta de atras.
               */
              const enlace =
                typeof window !== 'undefined'
                  ? window.location.href
                  : 'https://goldenpicks.vercel.app';
              const texto = bloqueado
                ? `${pick.titulo} · ${pick.contexto}

Análisis en Golden Picks:
${enlace}`
                : `${pick.titulo} · ${pick.mercado}
` +
                  `Le sale en ${pick.aciertosL10} de sus últimos 10 partidos.
` +
                  `${pick.contexto}

${enlace}`;
              const r = await comparte(texto);
              if (r === 'copiado') setAvisoCompartir('Copiado: ya puedes pegarlo donde quieras');
              else if (r === 'compartido') setAvisoCompartir(null);
            }}
            hitSlop={10}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.carta,
              borderWidth: 1,
              borderColor: C.borde,
            }}
          >
            <Icono nombre="compartir" tam={15} color={C.texto2} />
          </Pulsable>
        }
      />
      {avisoCompartir ? (
        <Txt v="mini" color={C.lima} style={{ textAlign: 'center', paddingBottom: E.sm }}>
          {avisoCompartir}
        </Txt>
      ) : null}

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
              {/* El estimado hace de piso mientras el recuento real crece: ver pick.tsx. */}
              <Fuego n={Math.max(comunidad.cuenta(pick.id) ?? 0, pick.fuego)} />
            </View>

            {bloqueado ? (
              /*
               * El muro de pago tambien aqui.
               *
               * Esta pantalla no comprobaba nada: la tarjeta tapaba el analisis
               * de una liga de pago, pero abriendo la direccion del pick se veia
               * entero —argumento, cuota y racha— con una cuenta gratis. Y las
               * direcciones no son secretas: los avisos de la campana enlazan a
               * ellas. Todo lo que se vende estaba a un clic.
               */
              <Pulsable onPress={() => router.push('/pro')}>
                <View
                  style={{
                    gap: E.sm,
                    padding: E.md,
                    borderRadius: R.lg,
                    borderWidth: 1,
                    borderColor: C.limaBorde,
                    backgroundColor: C.limaTenue,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icono nombre="candado" tam={15} color={C.lima} />
                    <Txt v="pequenoFuerte" color={C.lima}>
                      Análisis con Golden Pro
                    </Txt>
                  </View>
                  <Txt v="pequeno" color={C.texto2}>
                    Desbloquea el argumento, el precio y la tendencia de los últimos 10 partidos de
                    {' '}{competicion(pick.competicionId).nombre}.
                  </Txt>
                </View>
              </Pulsable>
            ) : (
              <Txt v="cuerpo" color={C.texto2}>
                {pick.argumento}
              </Txt>
            )}

            {bloqueado ? null : (
              <FilaMercado
                mercado={pick.mercado}
                cuota={pick.cuota}
                casaId={pick.casa}
                ventaja={pick.ventaja}
                precioReal={pick.precioReal}
              />
            )}

            <View style={{ flexDirection: 'row', gap: E.sm, display: bloqueado ? 'none' : 'flex' }}>
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

            {/*
              Con candado, el boton lleva a Pro en vez de guardar.
              *
              * Guardar un pick que no se puede leer no sirve de nada, y ademas
              * colaba analisis de pago en el historial de una cuenta gratis:
              * desde Rendimiento se veian el mercado y la cuota que la ficha
              * acababa de tapar. Se aprovecha el gesto —quien guarda es quien
              * mas interes tiene— para enseñar lo que cuesta desbloquearlo.
              */}
            <Boton
              ancho
              texto={
                bloqueado
                  ? 'Desbloquear con Golden Pro'
                  : guardado
                    ? 'Quitar de mis picks'
                    : 'Guardar pick'
              }
              icono={bloqueado ? 'candado' : guardado ? 'guardado' : 'guardar'}
              variante={guardado && !bloqueado ? 'secundario' : 'principal'}
              onPress={() => {
                if (bloqueado) {
                  router.push('/pro');
                  return;
                }
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
              <Serie valores={contexto.serie} linea={pick.linea} sentido={pick.sentido} />
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
        {/* La tendencia es de lo que mas se vende: con candado, no se enseña. */}
        <View style={{ paddingHorizontal: E.lg, gap: E.sm, display: bloqueado ? 'none' : 'flex' }}>
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
