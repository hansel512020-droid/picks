import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Insignia, Pulsable, Separador, Tarjeta, Txt, Vacio } from '@/componentes/base';
import { Icono } from '@/componentes/iconos';
import { Cara, Escudo, LogoCompeticion } from '@/componentes/imagen';
import { CabeceraAtras } from '@/componentes/navegacion';
import { competicion, competicionesVisibles } from '@/datos/competiciones';
import { temporada } from '@/datos/motor';
import { useTienda } from '@/estado/tienda';
import { C, E, R } from '@/tema';
import { useCalculo } from '@/utiles/carga';

/**
 * Buscador de jugadores, equipos y competiciones. Solo mira dentro de la
 * competicion activa para los jugadores y equipos, porque cargar las 60 a la
 * vez tardaria demasiado.
 */

function normaliza(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export default function Buscar() {
  const { ajustes, cambiaAjuste } = useTienda();
  const insets = useSafeAreaInsets();
  const [texto, setTexto] = useState('');
  const competicionId = ajustes.competicionId;

  const indice = useCalculo(() => {
    const t = temporada(competicionId);
    return {
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
        .filter((e, i, todos) => {
          const huella = (x: typeof e) => `${normaliza(x.nombre)}|${x.bandera ?? ''}`;
          return todos.findIndex((o) => huella(o) === huella(e)) === i;
        })
        .map((e) => ({ e, clave: normaliza(e.nombre) })),
    };
  }, [competicionId]);

  const q = normaliza(texto.trim());

  const resultados = useMemo(() => {
    if (q.length < 2) return null;
    return {
      competiciones: competicionesVisibles().filter(
        (c) => normaliza(c.nombre).includes(q) || normaliza(c.pais).includes(q),
      ).slice(0, 6),
      equipos: (indice?.equipos ?? []).filter((x) => x.clave.includes(q)).slice(0, 8),
      jugadores: (indice?.jugadores ?? []).filter((x) => x.clave.includes(q)).slice(0, 20),
    };
  }, [q, indice]);

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      <CabeceraAtras titulo="Buscar" />

      <View style={{ paddingHorizontal: E.lg, marginBottom: E.lg }}>
        <View
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
        contentContainerStyle={{ paddingBottom: E.xxxl, gap: E.lg }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!resultados ? (
          <Vacio
            icono="buscar"
            titulo="Escribe al menos dos letras"
            detalle="Busca dentro de la competición activa. Cambia de competición para buscar en otra."
          />
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
                      paddingVertical: 12,
                    }}
                  >
                    <Cara nombre={j.nombre} bandera={j.bandera} tam={30} />
                    <View style={{ flex: 1 }}>
                      <Txt v="cuerpo">{j.nombre}</Txt>
                      <Txt v="mini" color={C.texto3}>
                        {equipo.nombre} · {j.posicion} · #{j.dorsal}
                      </Txt>
                    </View>
                    <Insignia texto={`${j.nivel}`} />
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
