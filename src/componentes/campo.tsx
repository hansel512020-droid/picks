import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import type { JugadorAlineado, OnceEquipo } from '@/datos/alineaciones';
import type { Alineacion, Jugador } from '@/datos/tipos';
import { C, R, T } from '@/tema';
import { Pulsable, Txt } from './base';

/**
 * Campo con el once dibujado encima. Las coordenadas vienen en porcentaje
 * desde `alineacion()`, con la porteria propia arriba.
 */

const ALTO = 340;

function Lineas() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Rect x={0} y={0} width={100} height={100} fill={C.carta} />
      <Rect x={1} y={1} width={98} height={98} stroke={C.borde} strokeWidth={0.5} fill="none" />
      <Line x1={1} y1={50} x2={99} y2={50} stroke={C.borde} strokeWidth={0.5} />
      <Circle cx={50} cy={50} r={12} stroke={C.borde} strokeWidth={0.5} fill="none" />
      <Rect x={28} y={1} width={44} height={15} stroke={C.borde} strokeWidth={0.5} fill="none" />
      <Rect x={40} y={1} width={20} height={6} stroke={C.borde} strokeWidth={0.5} fill="none" />
      <Rect x={28} y={84} width={44} height={15} stroke={C.borde} strokeWidth={0.5} fill="none" />
      <Rect x={40} y={93} width={20} height={6} stroke={C.borde} strokeWidth={0.5} fill="none" />
    </Svg>
  );
}

export function Campo({
  alineacion,
  jugadores,
  competicionId,
  color = C.lima,
}: {
  alineacion: Alineacion;
  jugadores: Map<string, Jugador>;
  competicionId: string;
  color?: string;
}) {
  return (
    <View
      style={{
        height: ALTO,
        borderRadius: R.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.borde,
      }}
    >
      <View style={{ ...StyleSheetAbsolute }}>
        <Lineas />
      </View>
      {alineacion.once.map((puesto) => {
        const jug = jugadores.get(puesto.jugadorId);
        if (!jug) return null;
        return (
          <Pulsable
            key={puesto.jugadorId}
            onPress={() =>
              router.push(`/jugador/${encodeURIComponent(jug.id)}?comp=${competicionId}`)
            }
            style={{
              position: 'absolute',
              left: `${puesto.x}%`,
              top: `${puesto.y}%`,
              marginLeft: -26,
              marginTop: -20,
              width: 52,
              alignItems: 'center',
              gap: 3,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: C.carta2,
                borderWidth: 1.5,
                borderColor: color,
              }}
            >
              <Text style={{ ...T.pequenoFuerte, color: C.texto }}>{jug.dorsal}</Text>
            </View>
            <View
              style={{
                paddingHorizontal: 4,
                paddingVertical: 1,
                borderRadius: 4,
                backgroundColor: 'rgba(10,11,13,0.75)',
              }}
            >
              <Text numberOfLines={1} style={{ ...T.mini, fontSize: 9, color: C.texto }}>
                {apellido(jug.nombre)}
              </Text>
            </View>
          </Pulsable>
        );
      })}
      <View style={{ position: 'absolute', top: 8, left: 10 }}>
        <Txt v="mini" color={C.texto3}>
          {alineacion.formacion} · {alineacion.confirmada ? 'CONFIRMADA' : 'PROBABLE'}
        </Txt>
      </View>
    </View>
  );
}

/** En el campo no cabe el nombre entero: se ensena la ultima palabra. */
function apellido(nombre: string) {
  const trozos = nombre.split(' ');
  return trozos.length > 1 ? trozos[trozos.length - 1] : nombre;
}

const StyleSheetAbsolute = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

/**
 * Campo dibujado con la alineación real que publica ESPN. Se separa del otro
 * porque aquí no hay identificadores de la app: llegan nombres, dorsales y el
 * dibujo táctico tal cual los da la fuente, y las posiciones se deducen de ese
 * dibujo ("4-2-3-1" son cuatro líneas por delante del portero).
 */
export function CampoReal({ once, color = C.lima }: { once: OnceEquipo; color?: string }) {
  const lineas = (once.formacion ?? '')
    .split('-')
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0);

  // Sin dibujo táctico no se puede colocar a nadie sobre el césped.
  const titulares = once.titulares;
  const total = lineas.reduce((a, b) => a + b, 0);
  if (!lineas.length || total + 1 !== titulares.length) return null;

  // El portero abajo del todo; el resto repartido hacia la portería contraria.
  const puntos: { jug: JugadorAlineado; x: number; y: number }[] = [
    { jug: titulares[0], x: 50, y: 88 },
  ];
  let i = 1;
  lineas.forEach((cuantos, fila) => {
    const y = 72 - (fila * 60) / Math.max(1, lineas.length);
    for (let k = 0; k < cuantos; k++) {
      puntos.push({ jug: titulares[i++], x: ((k + 1) * 100) / (cuantos + 1), y });
    }
  });

  return (
    <View
      style={{
        height: ALTO,
        borderRadius: R.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.borde,
      }}
    >
      <View style={{ ...StyleSheetAbsolute }}>
        <Lineas />
      </View>
      {puntos.map(({ jug, x, y }) => (
        <View
          key={`${jug.dorsal}-${jug.nombre}`}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            marginLeft: -26,
            marginTop: -20,
            width: 52,
            alignItems: 'center',
            gap: 3,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.carta2,
              borderWidth: 1.5,
              borderColor: color,
            }}
          >
            <Text style={{ ...T.pequenoFuerte, color: C.texto }}>{jug.dorsal || '–'}</Text>
          </View>
          <View
            style={{
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 4,
              backgroundColor: 'rgba(10,11,13,0.75)',
            }}
          >
            <Text numberOfLines={1} style={{ ...T.mini, fontSize: 9, color: C.texto }}>
              {apellido(jug.nombre)}
            </Text>
          </View>
        </View>
      ))}
      <View style={{ position: 'absolute', top: 8, left: 10 }}>
        <Txt v="mini" color={C.texto3}>
          {once.formacion} · ESPN
        </Txt>
      </View>
    </View>
  );
}
