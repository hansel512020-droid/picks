import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { competicion, competicionesVisibles } from '@/datos/competiciones';
import { claveDelPartido } from '@/datos/envivo';
import { proximosDeTodas, type ProximoPartido } from '@/datos/importado';
import type { Competicion, Equipo } from '@/datos/tipos';
import { useVivo } from '@/estado/vivo';
import { C, E, R, T } from '@/tema';
import { Pulsable, Txt } from './base';
import { Icono } from './iconos';
import { Escudo, LogoCompeticion } from './imagen';
import { TiraChips } from './navegacion';

/**
 * Tira superior de la portada: el boton de la competicion y, a su lado, sus
 * grupos (en un torneo) o sus equipos (en una liga).
 */

/** Cuadricula con los escudos de un grupo, como en el carrusel del Mundial. */
function Banderitas({ equipos, tam = 17 }: { equipos: Equipo[]; tam?: number }) {
  return (
    <View
      style={{
        width: tam * 2 + 4,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
        justifyContent: 'center',
      }}
    >
      {equipos.slice(0, 4).map((e) => (
        <Escudo key={e.id} nombre={e.nombre} id={e.id} bandera={e.bandera} corto={e.corto} tam={tam} />
      ))}
    </View>
  );
}

function Casilla({
  activo,
  onPress,
  children,
  etiqueta,
}: {
  activo?: boolean;
  onPress: () => void;
  children: React.ReactNode;
  etiqueta: string;
}) {
  return (
    <Pulsable
      onPress={onPress}
      style={{
        width: 84,
        paddingVertical: 10,
        gap: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: R.md,
        borderWidth: 1,
        borderColor: activo ? C.limaBorde : C.borde,
        backgroundColor: activo ? C.limaTenue : C.carta,
      }}
    >
      <View style={{ height: 40, justifyContent: 'center' }}>{children}</View>
      <Text
        numberOfLines={1}
        style={{ ...T.mini, fontSize: 10, color: activo ? C.lima : C.texto2 }}
      >
        {etiqueta}
      </Text>
    </Pulsable>
  );
}

export function CarruselCompeticion({
  competicionId,
  equipos,
  grupo,
  onGrupo,
}: {
  competicionId: string;
  equipos: Equipo[];
  /** Grupo o equipo seleccionado. `undefined` es "todos". */
  grupo?: string;
  onGrupo: (valor: string | undefined) => void;
}) {
  const comp = competicion(competicionId);
  const grupos = comp.grupos;
  // Volver a pulsar el filtro que ya esta puesto lo quita, que es lo que
  // espera cualquiera: no hay que ir al primer boton para deshacerlo.
  const alternar = (valor: string) => onGrupo(grupo === valor ? undefined : valor);

  return (
    <TiraChips>
      {/* La primera casilla no es un filtro: es el selector de competicion.
          Antes solo quitaba el filtro y, sin filtro puesto, parecia rota. */}
      <Casilla onPress={() => router.push('/competiciones')} etiqueta={`${comp.corto} ▾`}>
        <LogoCompeticion competicionId={competicionId} bandera={comp.bandera} tam={32} cuadrado />
      </Casilla>

      {grupos
        ? grupos.map((g) => (
            <Casilla
              key={g}
              activo={grupo === g}
              onPress={() => alternar(g)}
              etiqueta={`Grupo ${g}`}
            >
              <Banderitas equipos={equipos.filter((e) => e.grupo === g)} />
            </Casilla>
          ))
        : equipos.slice(0, 20).map((e) => (
            <Casilla
              key={e.id}
              activo={grupo === e.id}
              onPress={() => alternar(e.id)}
              // Arriba van las siglas dentro del circulo, asi que debajo va el
              // nombre: repetir "MCI" dos veces no dice nada.
              etiqueta={e.nombre}
            >
              <Escudo
                nombre={e.nombre}
                corto={e.corto}
                color={e.color}
                tam={38}
              />
            </Casilla>
          ))}
    </TiraChips>
  );
}

/**
 * Tira de los proximos partidos de todas las competiciones. Lo que se esta
 * jugando ahora va primero, con su minuto; despues, por hora de comienzo.
 */
export function CarruselProximos() {
  const { porPartido } = useVivo();
  const crudos = proximosDeTodas(30);

  /*
   * El archivo importado es de cuando se descargó: sus minutos y marcadores se
   * quedan congelados. Lo que ESPN dice ahora mismo manda, y lo que ya ha
   * terminado sale de la tira: esto es "lo que viene", no un resultado.
   */
  const partidos = crudos
    .map((p) => {
      const v = porPartido.get(claveDelPartido(p.local.nombre, p.visitante.nombre));
      return v
        ? {
            ...p,
            estado: v.estado,
            minuto: v.minuto,
            // El reloj de ESPN con su descuento: "90+3", no "90".
            reloj: v.reloj,
            golesLocal: v.golesLocal,
            golesVisitante: v.golesVisitante,
          }
        : p;
    })
    .filter((p) => p.estado !== 'finalizado') as (ProximoPartido & { reloj?: string })[];

  if (!partidos.length) return null;

  const cuando = (p: (typeof partidos)[number]) => {
    if (p.estado === 'descanso') return 'DESCANSO';
    if (p.estado === 'en_curso') return `${p.reloj ?? p.minuto ?? ''}'`;
    const d = new Date(p.fecha);
    const hoy = new Date();
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const mismoDia =
      d.getDate() === hoy.getDate() && d.getMonth() === hoy.getMonth();
    if (mismoDia) return `HOY ${hora}`;
    const dias = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    return `${dias[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <TiraChips>
      {partidos.map((p) => {
        const vivo = p.estado === 'en_curso' || p.estado === 'descanso';
        return (
          <Pulsable
            key={`${p.competicionId}-${p.partidoId}`}
            onPress={() =>
              router.push(
                `/partido/${encodeURIComponent(p.partidoId)}?comp=${p.competicionId}`,
              )
            }
            style={{
              width: 150,
              paddingVertical: 10,
              paddingHorizontal: 10,
              gap: 8,
              borderRadius: R.md,
              borderWidth: 1,
              borderColor: vivo ? C.rojoTenue : C.borde,
              backgroundColor: C.carta,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {vivo ? (
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.rojo }} />
              ) : null}
              <Text
                numberOfLines={1}
                style={{ ...T.mini, fontSize: 9, color: vivo ? C.rojo : C.texto3 }}
              >
                {cuando(p)}
              </Text>
              <View style={{ flex: 1 }} />
              {/* La liga, no solo su escudo: mezclando treinta competiciones
                  un logo diminuto no dice de qué torneo es el partido. */}
              <Text
                numberOfLines={1}
                style={{ ...T.mini, fontSize: 9, color: C.texto3, flexShrink: 1 }}
              >
                {competicion(p.competicionId).corto}
              </Text>
              <LogoCompeticion competicionId={p.competicionId} tam={12} cuadrado />
            </View>

            {[
              { e: p.local, g: p.golesLocal },
              { e: p.visitante, g: p.golesVisitante },
            ].map(({ e, g }) => (
              <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Escudo nombre={e.nombre} id={e.id} corto={e.corto} tam={18} />
                <Text numberOfLines={1} style={{ ...T.pequeno, fontSize: 11.5, color: C.texto, flex: 1 }}>
                  {e.nombre}
                </Text>
                {p.estado !== 'previa' ? (
                  <Text style={{ ...T.pequenoFuerte, fontSize: 12, color: C.texto }}>{g}</Text>
                ) : null}
              </View>
            ))}
          </Pulsable>
        );
      })}
    </TiraChips>
  );
}

/** Selector rapido de competicion que se ve en varias pantallas. */
export function BotonCompeticion({ competicionId }: { competicionId: string }) {
  const comp = competicion(competicionId);
  return (
    <Pulsable
      onPress={() => router.push('/competiciones')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: R.pill,
        borderWidth: 1,
        borderColor: C.borde,
        backgroundColor: C.carta,
      }}
    >
      <LogoCompeticion competicionId={competicionId} bandera={comp.bandera} tam={17} cuadrado />
      <Txt v="pequeno">{comp.corto}</Txt>
      <Txt v="pequeno" color={C.texto3}>
        ▾
      </Txt>
    </Pulsable>
  );
}

/** Cuadricula de competiciones, la del "50+ competiciones". */
export function RejillaCompeticiones({
  seleccionada,
  onElige,
  seguidas,
  lista,
}: {
  seleccionada?: string;
  onElige: (id: string) => void;
  seguidas?: string[];
  /** Que competiciones pintar. Por defecto, las que tienen datos. */
  lista?: Competicion[];
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: E.sm,
        paddingHorizontal: E.lg,
      }}
    >
      {(lista ?? competicionesVisibles()).map((c) => {
        const activa = c.id === seleccionada;
        const seguida = seguidas?.includes(c.id);
        return (
          <Pulsable
            key={c.id}
            onPress={() => onElige(c.id)}
            style={{
              /*
               * Casilla de tamaño fijo, no de porcentaje.
               *
               * Con un 31,5% del ancho la rejilla siempre son tres columnas:
               * en un móvil está bien, pero en una página de escritorio cada
               * casilla se vuelve enorme y solo caben seis competiciones en
               * toda la pantalla. Con un ancho fijo, la fila mete tantas como
               * quepan: tres en el móvil, ocho o nueve en el navegador.
               */
              width: 118,
              height: 108,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: 6,
              borderRadius: R.md,
              borderWidth: 1,
              borderColor: activa ? C.limaBorde : C.borde,
              backgroundColor: activa ? C.limaTenue : C.carta,
            }}
          >
            {seguida && !activa ? (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: C.lima,
                }}
              />
            ) : null}
            <LogoCompeticion competicionId={c.id} bandera={c.bandera} tam={30} cuadrado />
            <Text
              numberOfLines={2}
              style={{
                ...T.mini,
                fontSize: 9.5,
                textAlign: 'center',
                color: activa ? C.lima : C.texto2,
              }}
            >
              {c.corto}
            </Text>
          </Pulsable>
        );
      })}
    </View>
  );
}
