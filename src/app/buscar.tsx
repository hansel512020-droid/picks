import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Insignia, Pulsable, Separador, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { Icono } from '@/componentes/iconos';
import { Cara, Escudo, LogoCompeticion } from '@/componentes/imagen';
import { marca } from '@/componentes/movimiento';
import { Resplandor } from '@/componentes/marca';
import { CabeceraAtras } from '@/componentes/navegacion';
import { competicion, competicionesVisibles } from '@/datos/competiciones';
import { esBanderaDePais, valoracionReal } from '@/datos/importado';
import { temporada } from '@/datos/motor';
import { useTienda } from '@/estado/tienda';
import { C, COLUMNA, E, R } from '@/tema';
import { useCalculo } from '@/utiles/carga';
import type { Equipo, Jugador } from '@/datos/tipos';

/**
 * Buscador de jugadores, equipos y competiciones. Solo mira dentro de la
 * competicion activa para los jugadores y equipos, porque cargar las 60 a la
 * vez tardaria demasiado.
 */

const POSICIONES: Record<string, string> = {
  POR: 'Portero',
  DEF: 'Defensa',
  MED: 'Centrocampista',
  DEL: 'Delantero',
};

function normaliza(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

interface Actividad {
  /** Partidos con registro en los datos. */
  partidos: number;
  /** Fecha del último, en ISO; vacía si no hay ninguno. */
  ultimo: string;
}

/** Si dos fichas del mismo nombre pueden ser la misma persona en equipos distintos. */
const MESES_SIN_JUGAR = 4;

/**
 * Un jugador una vez, no una por competición.
 *
 * Con "Todas" el mismo jugador está dado de alta en cada competición que
 * juega —su liga, la Champions, la copa, el Mundial—, cada vez con su propio
 * identificador y a veces con otro dorsal o puesto. Buscando "mbappé" salían
 * ocho fichas, y entre ellas el Mbappé del PSG: la liga francesa guarda tres
 * temporadas y en las viejas seguía allí.
 *
 * Se agrupan por nombre. Dentro del grupo:
 *
 * · Se descartan las fichas que llevan meses sin jugar cuando hay otra que sí
 *   juega: es el mismo jugador en un equipo que ya no es el suyo.
 * · De cada equipo queda la ficha con más partidos, que es la de su liga: ahí
 *   está su historial entero.
 *
 * Dos jugadores distintos que se llaman igual y juegan ahora en equipos
 * distintos —hay varios "Danilo"— siguen saliendo los dos, cada uno con su
 * equipo debajo.
 */
function sinRepetir<T extends { j: Jugador; clave: string; equipo?: Equipo }>(
  lista: T[],
  actividad: (id: string) => Actividad,
): T[] {
  const porNombre = new Map<string, T[]>();
  for (const x of lista) {
    const grupo = porNombre.get(x.clave);
    if (grupo) grupo.push(x);
    else porNombre.set(x.clave, [x]);
  }
  const salida: { x: T; partidos: number }[] = [];
  for (const grupo of porNombre.values()) {
    const fichas = grupo.map((x) => ({ x, ...actividad(x.j.id) }));
    const ultimo = fichas.reduce((m, f) => (f.ultimo > m ? f.ultimo : m), '');
    const corte = ultimo
      ? new Date(Date.parse(ultimo) - MESES_SIN_JUGAR * 30 * 86_400_000).toISOString()
      : '';
    const porEquipo = new Map<string, (typeof fichas)[number]>();
    for (const f of fichas) {
      if (corte && f.ultimo < corte) continue;
      const equipo = normaliza(f.x.equipo?.nombre ?? '');
      const ya = porEquipo.get(equipo);
      if (!ya || f.partidos > ya.partidos) porEquipo.set(equipo, f);
    }
    salida.push(...porEquipo.values());
  }
  // Los que más juegan primero: entre dos que encajan, el que se busca suele ser ese.
  return salida.sort((a, b) => b.partidos - a.partidos).map((f) => f.x);
}

export default function Buscar() {
  const { ajustes, cambiaAjuste } = useTienda();
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState('');
  const competicionId = ajustes.competicionId;

  const indice = useCalculo(() => {
    const t = temporada(competicionId);
    // Se calcula al buscar y solo para las fichas que encajan: hacerlo para
    // los miles de jugadores de "Todas" de entrada retrasaría el buscador.
    const memo = new Map<string, Actividad>();
    const actividad = (id: string): Actividad => {
      const guardada = memo.get(id);
      if (guardada) return guardada;
      const registros = t.registrosPorJugador.get(id) ?? [];
      let ultimo = '';
      for (const r of registros) {
        const fecha = t.porPartido.get(r.partidoId)?.fecha ?? '';
        if (fecha > ultimo) ultimo = fecha;
      }
      const nueva = { partidos: registros.length, ultimo };
      memo.set(id, nueva);
      return nueva;
    };
    const yaEstan = new Map<string, (string | undefined)[]>();
    return {
      actividad,
      jugadores: t.jugadores.map((j) => ({
        j,
        clave: normaliza(j.nombre),
        equipo: t.porEquipo.get(j.equipoId)!,
      })),
      /*
       * Un club por país, no uno por competición.
       *
       * El mismo equipo está dado de alta en su liga y otra vez en cada copa
       * continental, cada una con su propio identificador. Buscando "river"
       * salían cuatro "River Plate" seguidos, idénticos y sin nada que los
       * distinguiera: elegir entre ellos era imposible.
       *
       * La huella lleva el país porque el River Plate argentino y el uruguayo
       * son clubes distintos y los dos tienen que poder buscarse. Y de las
       * copias se queda la que más partidos tiene, que es la de su liga: ahí
       * es donde el usuario encontrará su historial completo.
       */
      equipos: [...t.equipos]
        .sort(
          (a, b) =>
            (t.partidosPorEquipo.get(b.id)?.length ?? 0) -
            (t.partidosPorEquipo.get(a.id)?.length ?? 0),
        )
        .map((e) => ({ e, clave: normaliza(e.nombre) }))
        .filter(({ e, clave }) => {
          /*
           * En las copas continentales el club no lleva la bandera de su país
           * sino la del torneo (🌟 la Champions), así que comparar banderas
           * dejaba dos Liverpool: el de la Premier y el de la Champions. Si una
           * de las dos no es de país, basta con el nombre.
           */
          const vistas = yaEstan.get(clave) ?? [];
          const repetido = vistas.some(
            (b) => b === e.bandera || !esBanderaDePais(b) || !esBanderaDePais(e.bandera),
          );
          if (!repetido) yaEstan.set(clave, [...vistas, e.bandera]);
          return !repetido;
        }),
    };
  }, [competicionId]);

  const q = normaliza(texto.trim());

  /*
   * Antes de escribir: tus ligas y los equipos con más partidos de ellas, a un
   * toque. Un "escribe al menos dos letras" en una pantalla vacía no ayuda a
   * nadie a encontrar nada.
   */
  const ligas = useMemo(
    () =>
      ajustes.ligasSeguidas.flatMap((id) => {
        const c = competicionesVisibles().find((x) => x.id === id);
        return c ? [c] : [];
      }),
    [ajustes.ligasSeguidas],
  );
  const destacados = useMemo(() => {
    if (!indice) return [];
    if (competicionId !== 'todas') return indice.equipos.slice(0, 12);
    // Unos pocos de cada liga que sigues, no doce de la primera de la lista.
    const porLiga = ajustes.ligasSeguidas.map((id) =>
      indice.equipos.filter(({ e }) => e.competicionId === id).slice(0, 4),
    );
    const mezcla = [];
    for (let i = 0; i < 4; i++) for (const lista of porLiga) if (lista[i]) mezcla.push(lista[i]);
    return (mezcla.length ? mezcla : indice.equipos).slice(0, 12);
  }, [indice, competicionId, ajustes.ligasSeguidas]);

  const resultados = useMemo(() => {
    if (q.length < 2) return null;
    return {
      competiciones: competicionesVisibles().filter(
        (c) => normaliza(c.nombre).includes(q) || normaliza(c.pais).includes(q),
      ).slice(0, 6),
      equipos: (indice?.equipos ?? []).filter((x) => x.clave.includes(q)).slice(0, 8),
      jugadores: indice
        ? sinRepetir(
            indice.jugadores.filter((x) => x.clave.includes(q)),
            indice.actividad,
          ).slice(0, 20)
        : [],
    };
  }, [q, indice]);

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      <Resplandor />
      <CabeceraAtras titulo="Buscar" />

      <View style={[{ paddingHorizontal: E.lg, marginBottom: E.lg }, COLUMNA.lectura]}>
        <View
          {...marca('campo')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: E.sm,
            paddingHorizontal: E.md,
            borderRadius: R.md,
            borderWidth: 1,
            borderColor: C.borde,
            backgroundColor: C.carta,
          }}
        >
          <Icono nombre="buscar" tam={17} color={C.texto3} />
          <TextInput
            value={texto}
            onChangeText={setTexto}
            autoFocus
            placeholder="Jugador, equipo o competición"
            placeholderTextColor={C.texto3}
            style={{ flex: 1, paddingVertical: 13, color: C.texto, fontSize: 15 }}
          />
          {texto ? (
            <Pulsable onPress={() => setTexto('')} hitSlop={8}>
              <Icono nombre="cruz" tam={15} color={C.texto3} />
            </Pulsable>
          ) : null}
        </View>
      </View>

      <ScrollView
        {...marca('pagina')}
        contentContainerStyle={[{ paddingBottom: E.xxxl, gap: E.lg }, COLUMNA.lectura]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!resultados ? (
          <View style={{ gap: E.lg }}>
            {ligas.length ? (
              <View style={{ gap: E.sm }}>
                <Txt v="pequenoFuerte" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
                  TUS LIGAS
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: E.sm, paddingHorizontal: E.lg }}>
                  {ligas.map((c) => (
                    <Pulsable
                      key={c.id}
                      onPress={() => {
                        cambiaAjuste('competicionId', c.id);
                        router.back();
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: E.sm,
                        paddingLeft: 8,
                        paddingRight: 14,
                        paddingVertical: 8,
                        borderRadius: R.pill,
                        borderWidth: 1,
                        borderColor: C.borde,
                        backgroundColor: C.carta,
                      }}
                    >
                      <LogoCompeticion competicionId={c.id} bandera={c.bandera} tam={20} cuadrado />
                      <Txt v="pequeno">{c.nombre}</Txt>
                    </Pulsable>
                  ))}
                </View>
              </View>
            ) : null}

            {destacados.length ? (
              <View style={{ gap: E.sm }}>
                <Txt v="pequenoFuerte" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
                  EQUIPOS
                </Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: E.sm, paddingHorizontal: E.lg }}>
                  {destacados.map(({ e }) => (
                    <Pulsable
                      key={e.id}
                      onPress={() => router.push(`/equipo/${encodeURIComponent(e.id)}?comp=${competicionId}`)}
                      marcas="eleva"
                      style={{
                        width: 104,
                        alignItems: 'center',
                        gap: 8,
                        paddingVertical: E.md,
                        paddingHorizontal: 6,
                        borderRadius: R.md,
                        borderWidth: 1,
                        borderColor: C.borde,
                        borderTopColor: C.bordeLuz,
                        backgroundColor: C.carta,
                      }}
                    >
                      <Escudo nombre={e.nombre} id={e.id} bandera={e.bandera} corto={e.corto} tam={40} />
                      <Txt v="mini" numberOfLines={1} style={{ textAlign: 'center' }}>
                        {e.nombre}
                      </Txt>
                    </Pulsable>
                  ))}
                </View>
              </View>
            ) : null}

            <Txt v="mini" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
              {competicionId === 'todas'
                ? 'Busca jugadores, equipos y competiciones de todas tus ligas.'
                : `Busca jugadores y equipos de ${competicion(competicionId).nombre}. Cambia de competición para buscar en otra.`}
            </Txt>
          </View>
        ) : null}

        {resultados?.competiciones.length ? (
          <View style={{ gap: E.sm }}>
            <Txt v="pequenoFuerte" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
              COMPETICIONES
            </Txt>
            <Tarjeta style={{ marginHorizontal: E.lg, overflow: 'hidden' }}>
              {resultados.competiciones.map((c, i) => (
                <View key={c.id}>
                  {i > 0 ? <Separador /> : null}
                  <Pulsable
                    onPress={() => {
                      cambiaAjuste('competicionId', c.id);
                      router.back();
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: E.md,
                      paddingHorizontal: E.md,
                      paddingVertical: 12,
                    }}
                  >
                    <LogoCompeticion competicionId={c.id} bandera={c.bandera} tam={24} cuadrado />
                    <View style={{ flex: 1 }}>
                      <Txt v="cuerpo">{c.nombre}</Txt>
                      <Txt v="mini" color={C.texto3}>
                        {c.pais}
                      </Txt>
                    </View>
                    {c.gratis ? <Insignia texto="GRATIS" color={C.lima} fondo={C.limaTenue} /> : null}
                  </Pulsable>
                </View>
              ))}
            </Tarjeta>
          </View>
        ) : null}

        {resultados?.equipos.length ? (
          <View style={{ gap: E.sm }}>
            <Txt v="pequenoFuerte" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
              EQUIPOS
            </Txt>
            <Tarjeta style={{ marginHorizontal: E.lg, overflow: 'hidden' }}>
              {resultados.equipos.map(({ e }, i) => (
                <View key={e.id}>
                  {i > 0 ? <Separador /> : null}
                  <Pulsable
                    onPress={() =>
                      router.push(`/equipo/${encodeURIComponent(e.id)}?comp=${competicionId}`)
                    }
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: E.md,
                      paddingHorizontal: E.md,
                      paddingVertical: 12,
                    }}
                  >
                    <Escudo nombre={e.nombre} id={e.id} bandera={e.bandera} corto={e.corto} tam={26} />
                    <View style={{ flex: 1 }}>
                      <Txt v="cuerpo">{e.nombre}</Txt>
                      {/* La competición debajo: es lo que separa a dos clubes
                          que se llaman igual en países distintos. */}
                      <Txt v="mini" color={C.texto3} numberOfLines={1}>
                        {e.bandera ? `${e.bandera} ` : ''}
                        {competicion(e.competicionId).nombre}
                      </Txt>
                    </View>
                    <Icono nombre="flechaDerecha" tam={15} color={C.texto3} />
                  </Pulsable>
                </View>
              ))}
            </Tarjeta>
          </View>
        ) : null}

        {resultados?.jugadores.length ? (
          <View style={{ gap: E.sm }}>
            <Txt v="pequenoFuerte" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
              JUGADORES
            </Txt>
            <Tarjeta style={{ marginHorizontal: E.lg, overflow: 'hidden' }}>
              {resultados.jugadores.map(({ j, equipo }, i) => (
                /*
                 * Con el equipo en la clave: un jugador que cambió de club a
                 * mitad de torneo sale con el mismo identificador en los dos, y
                 * con dos claves iguales React dejaba filas de la búsqueda
                 * anterior pegadas en la lista.
                 */
                <View key={`${j.id}|${equipo.id}`}>
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
                      paddingVertical: 12,
                    }}
                  >
                    <Cara nombre={j.nombre} bandera={j.bandera} tam={36} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt v="cuerpo">{j.nombre}</Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Escudo
                          nombre={equipo.nombre}
                          id={equipo.id}
                          bandera={equipo.bandera}
                          corto={equipo.corto}
                          tam={14}
                        />
                        <Txt v="mini" color={C.texto3} numberOfLines={1} style={{ flexShrink: 1 }}>
                          {equipo.nombre} · {POSICIONES[j.posicion] ?? j.posicion}
                          {j.dorsal ? ` · #${j.dorsal}` : ''}
                        </Txt>
                      </View>
                    </View>
                    {valoracionReal(j.id) ? <Insignia texto={`${j.nivel}`} /> : null}
                  </Pulsable>
                </View>
              ))}
            </Tarjeta>
          </View>
        ) : null}

        {resultados &&
        !resultados.competiciones.length &&
        !resultados.equipos.length &&
        !resultados.jugadores.length ? (
          <Vacio icono="buscar" titulo={`Sin resultados para "${texto}"`} />
        ) : null}
      </ScrollView>
    </View>
  );
}
