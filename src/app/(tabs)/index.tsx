import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvisoCobroFallido, AvisoPagoEnProceso } from '@/componentes/avisos';
import { useAvisos } from '@/estado/avisos';
import { Chip, Insignia, Pulsable, Seccion, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { CarruselCompeticion, CarruselProximos } from '@/componentes/carruseles';
import { Icono } from '@/componentes/iconos';
import { Escudo } from '@/componentes/imagen';
import { Logo } from '@/componentes/marca';
import { TiraChips } from '@/componentes/navegacion';
import { TarjetaPick } from '@/componentes/pick';
import { competicion } from '@/datos/competiciones';
import { claveDelPartido , seJuegaAhora } from '@/datos/envivo';
import { temporada } from '@/datos/motor';
import { FAMILIAS, picksDeCompeticionPorTrozos } from '@/datos/picks';
import type { Familia, Pick } from '@/datos/tipos';
import { useComunidad } from '@/estado/comunidad';
import { useDerechos } from '@/estado/derechos';
import { useTienda } from '@/estado/tienda';
import { usePicksVigentes, useVivo } from '@/estado/vivo';
import { C, E, R } from '@/tema';
import { useCalculo, useCalculoProgresivo } from '@/utiles/carga';

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
       * Por los guardados de VERDAD, no por el numero que inventa el
       * generador. Si no hay contador real, `cuenta` devuelve indefinido y se
       * cae al numero de siempre.
       */
      return copia.sort(
        (a, b) => porDia(a, b) || (cuenta(b) ?? b.fuego) - (cuenta(a) ?? a.fuego),
      );
    default:
      // El generador ya entrega por cercania y calidad: no se toca.
      return copia;
  }
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

  // Lo que el usuario tiene comprado: decide qué picks van con candado.
  const { libres } = useDerechos();
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
  const picks = useCalculoProgresivo(
    () => picksDeCompeticionPorTrozos(competicionId, ajustes.casaId, 2000, libres),
    [competicionId, ajustes.casaId, libres],
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
    return ordena(lista, orden, (p) => comunidad.cuenta(p.id));
  }, [picks, familias, grupo, orden, partidosDelFiltro, comunidad]);

  // Un partido que acaba de terminar deja de dar picks al momento.
  const enCartel = usePicksVigentes(visibles);

  const comp = competicion(competicionId);
  const familiasVisibles = todasFamilias ? FAMILIAS : FAMILIAS.slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top }}>
      <FlatList
        data={enCartel}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: E.xxxl, gap: E.md }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: E.lg, marginBottom: E.xs }}>
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
          picks === undefined ? (
            <View style={{ paddingVertical: E.xxxl, alignItems: 'center', gap: E.md }}>
              <ActivityIndicator color={C.lima} />
              <Txt v="pequeno" color={C.texto3}>
                Analizando {comp.nombre}…
              </Txt>
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
      <AvisoCobroFallido flotante />
    </View>
  );
}
