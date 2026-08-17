import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, SectionList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Insignia, Pulsable, Txt, Vacio } from '@/componentes/base';
import { BotonCompeticion } from '@/componentes/carruseles';
import { Icono } from '@/componentes/iconos';
import { Escudo } from '@/componentes/imagen';
import { TiraChips } from '@/componentes/navegacion';
import { competicion } from '@/datos/competiciones';
import { claveDelPartido } from '@/datos/envivo';
import { temporada } from '@/datos/motor';
import type { Equipo, Partido } from '@/datos/tipos';
import { useTienda } from '@/estado/tienda';
import { usePartidoVivoDe, useVivo } from '@/estado/vivo';
import { C, E, R } from '@/tema';
import { useCalculo } from '@/utiles/carga';

type Filtro = 'todos' | 'vivo' | 'hoy' | 'proximos' | 'jugados';

const FILTROS: { id: Filtro; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'vivo', texto: 'En vivo' },
  { id: 'hoy', texto: 'Hoy' },
  { id: 'proximos', texto: 'Próximos' },
  { id: 'jugados', texto: 'Resultados' },
];

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function tituloDia(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(hoy.getTime() - 86400000);
  const manana = new Date(hoy.getTime() + 86400000);
  const igual = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (igual(d, hoy)) return 'Hoy';
  if (igual(d, manana)) return 'Mañana';
  if (igual(d, ayer)) return 'Ayer';
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function hora(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function FilaPartido({
  partido,
  local,
  visitante,
  competicionId,
}: {
  partido: Partido;
  local: Equipo;
  visitante: Equipo;
  competicionId: string;
}) {
  // Lo que dice ESPN ahora mismo manda sobre lo que se importó: el archivo es
  // una foto del momento de la descarga y el marcador cambia cada minuto.
  const enDirecto = usePartidoVivoDe(partido);
  const estado = enDirecto?.estado ?? partido.estado;
  const golesLocal = enDirecto?.golesLocal ?? partido.golesLocal;
  const golesVisitante = enDirecto?.golesVisitante ?? partido.golesVisitante;
  // El reloj entero de ESPN incluye el descuento ("90+3"); el número solo no.
  const reloj = enDirecto?.reloj ?? (partido.minuto ? String(partido.minuto) : undefined);

  const vivo = estado === 'en_curso' || estado === 'descanso';
  const jugado = estado === 'finalizado';

  return (
    <Pulsable
      onPress={() => router.push(`/partido/${encodeURIComponent(partido.id)}?comp=${competicionId}`)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: E.md,
        paddingHorizontal: E.md,
        paddingVertical: 13,
      }}
    >
      <View style={{ width: 48, alignItems: 'center' }}>
        {vivo ? (
          <View style={{ alignItems: 'center', gap: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.rojo }} />
            <Txt v="pequenoFuerte" color={C.rojo}>
              {estado === 'descanso' ? 'DES' : `${reloj ?? 0}'`}
            </Txt>
          </View>
        ) : (
          <Txt v="pequeno" color={jugado ? C.texto3 : C.texto2}>
            {jugado ? 'FIN' : hora(partido.fecha)}
          </Txt>
        )}
      </View>

      <View style={{ flex: 1, gap: 7 }}>
        {[
          { e: local, g: golesLocal },
          { e: visitante, g: golesVisitante },
        ].map(({ e, g }) => {
          const gana = jugado && g > (e.id === local.id ? golesVisitante : golesLocal);
          return (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Escudo nombre={e.nombre} id={e.id} bandera={e.bandera} corto={e.corto} tam={24} />
              <Txt
                v={gana ? 'cuerpoFuerte' : 'cuerpo'}
                color={jugado && !gana ? C.texto2 : C.texto}
                numberOfLines={1}
                style={{ flex: 1 }}
              >
                {e.nombre}
              </Txt>
              {jugado || vivo ? (
                <Txt v="cuerpoFuerte" color={gana ? C.texto : C.texto2}>
                  {g}
                </Txt>
              ) : null}
            </View>
          );
        })}
      </View>

      <Icono nombre="flechaDerecha" tam={16} color={C.texto3} />
    </Pulsable>
  );
}

export default function Partidos() {
  const { ajustes } = useTienda();
  const insets = useSafeAreaInsets();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const competicionId = ajustes.competicionId;
  const { porEspn } = useVivo();

  const datos = useCalculo(() => {
    const t = temporada(competicionId);
    return t.partidos.map((p) => ({
      partido: p,
      local: t.porEquipo.get(p.localId)!,
      visitante: t.porEquipo.get(p.visitanteId)!,
    }));
  }, [competicionId]);

  const secciones = useMemo(() => {
    if (!datos) return [];
    const hoy = new Date();
    const esHoy = (iso: string) => {
      const d = new Date(iso);
      return (
        d.getDate() === hoy.getDate() &&
        d.getMonth() === hoy.getMonth() &&
        d.getFullYear() === hoy.getFullYear()
      );
    };

    // Un partido cuya hora pasó hace rato ya no está por jugar, aunque el
    // archivo lo tenga como "previa" por haberse importado hace días.
    const corte = Date.now() - 3 * 3600_000;

    const filtrados = datos.filter(({ partido, local, visitante }) => {
      // El estado de ESPN de ahora mismo pesa más que el del archivo.
      const estado = (partido.idEspn ? porEspn.get(partido.idEspn) : undefined)?.estado ?? partido.estado;
      const enJuego = estado === 'en_curso' || estado === 'descanso';
      const porDelante = enJuego || new Date(partido.fecha).getTime() >= corte;

      switch (filtro) {
        case 'vivo':
          return enJuego;
        case 'hoy':
          return esHoy(partido.fecha);
        case 'proximos':
          return estado === 'previa' && porDelante;
        case 'jugados':
          return estado === 'finalizado' || (!enJuego && !porDelante);
        default:
          // "Todos" es todo lo que queda por delante: lo que se está jugando
          // ahora y lo que viene. Los resultados tienen su propia pestaña, y
          // abrir la lista por partidos de hace meses no le sirve a nadie.
          return estado !== 'finalizado' && porDelante;
      }
    });

    // Los resultados se leen del mas reciente hacia atras; el resto al reves.
    const ordenados =
      filtro === 'jugados'
        ? [...filtrados].sort((a, b) => b.partido.fecha.localeCompare(a.partido.fecha))
        : filtrados;

    // La clave del grupo va en hora local, no en UTC: si no, un partido
    // nocturno se separa del resto de su dia y salen dos secciones iguales.
    const claveLocal = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    };
    const mapa = new Map<string, typeof ordenados>();
    for (const item of ordenados) {
      const clave = claveLocal(item.partido.fecha);
      const lista = mapa.get(clave) ?? [];
      lista.push(item);
      mapa.set(clave, lista);
    }
    return [...mapa.entries()].map(([clave, lista]) => ({
      title: tituloDia(lista[0].partido.fecha),
      clave,
      data: lista,
    }));
  }, [datos, filtro, porEspn]);

  const comp = competicion(competicionId);

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: E.lg,
          paddingVertical: E.md,
        }}
      >
        <Txt v="titulo">Partidos</Txt>
        <BotonCompeticion competicionId={competicionId} />
      </View>

      <TiraChips estilo={{ marginBottom: E.md }}>
        {FILTROS.map((f) => (
          <Chip
            key={f.id}
            texto={f.texto}
            activo={filtro === f.id}
            // Pulsar el filtro activo lo quita y vuelve a verse todo.
            onPress={() => setFiltro(filtro === f.id ? 'todos' : f.id)}
          />
        ))}
      </TiraChips>

      {datos === undefined ? (
        <View style={{ paddingVertical: E.xxxl, alignItems: 'center', gap: E.md }}>
          <ActivityIndicator color={C.lima} />
          <Txt v="pequeno" color={C.texto3}>
            Cargando {comp.nombre}…
          </Txt>
        </View>
      ) : (
        <SectionList
          sections={secciones}
          keyExtractor={(item) => item.partido.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: E.xxxl }}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: E.sm,
                paddingHorizontal: E.lg,
                paddingTop: E.lg,
                paddingBottom: E.sm,
              }}
            >
              <Txt v="pequenoFuerte" color={C.texto2}>
                {section.title}
              </Txt>
              <View style={{ flex: 1, height: 1, backgroundColor: C.bordeSuave }} />
              <Insignia texto={`${section.data.length}`} />
            </View>
          )}
          renderItem={({ item }) => (
            <View
              style={{
                marginHorizontal: E.lg,
                borderRadius: R.md,
                backgroundColor: C.carta,
                borderWidth: 1,
                borderColor: C.borde,
                marginBottom: E.sm,
              }}
            >
              <FilaPartido
                partido={item.partido}
                local={item.local}
                visitante={item.visitante}
                competicionId={competicionId}
              />
            </View>
          )}
          ListEmptyComponent={
            <Vacio icono="calendario" titulo="No hay partidos" detalle="Cambia de filtro o de competición." />
          }
        />
      )}
    </View>
  );
}
