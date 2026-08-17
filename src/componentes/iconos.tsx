import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C } from '@/tema';

/**
 * Juego de iconos de la app. Todos comparten caja de 24 y se dibujan con el
 * color que se les pase, para que valgan igual en la barra de pestanas que
 * dentro de una tarjeta.
 */

export interface PropsIcono {
  tam?: number;
  color?: string;
  /** Grosor del trazo en los iconos de linea. */
  grosor?: number;
}

type Dibujo = (p: Required<PropsIcono>) => React.ReactNode;

const linea = (d: string): Dibujo =>
  ({ color, grosor }) => (
    <Path
      d={d}
      stroke={color}
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );

const relleno = (d: string): Dibujo => ({ color }) => <Path d={d} fill={color} />;

const DIBUJOS: Record<string, Dibujo> = {
  flechaDerecha: linea('M9 6l6 6-6 6'),
  flechaIzquierda: linea('M15 6l-6 6 6 6'),
  flechaAbajo: linea('M6 9l6 6 6-6'),
  flechaArriba: linea('M6 15l6-6 6 6'),
  buscar: ({ color, grosor }) => (
    <>
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={grosor} fill="none" />
      <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={grosor} strokeLinecap="round" />
    </>
  ),
  guardar: linea('M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z'),
  guardado: relleno('M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z'),
  compartir: relleno('M21.4 2.6a1 1 0 00-1.1-.2l-17 7.2c-.9.4-.8 1.7.1 2l4.6 1.5 1.6 5c.3.9 1.5 1 2 .3l2.3-3 4.5 3.3c.7.5 1.7.1 1.9-.7l3-14.3a1 1 0 00-.3-1z'),
  grafico: ({ color }) => (
    <>
      <Rect x={3} y={13} width={4} height={8} rx={1} fill={color} />
      <Rect x={10} y={8} width={4} height={13} rx={1} fill={color} />
      <Rect x={17} y={3} width={4} height={18} rx={1} fill={color} />
    </>
  ),
  tendencia: linea('M3 17l6-6 4 4 8-8M21 7v5m0-5h-5'),
  calendario: ({ color, grosor }) => (
    <>
      <Rect x={3} y={5} width={18} height={16} rx={3} stroke={color} strokeWidth={grosor} fill="none" />
      <Path d="M3 10h18M8 3v4M16 3v4" stroke={color} strokeWidth={grosor} strokeLinecap="round" />
    </>
  ),
  usuario: ({ color, grosor }) => (
    <>
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={grosor} fill="none" />
      <Path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" stroke={color} strokeWidth={grosor} strokeLinecap="round" fill="none" />
    </>
  ),
  casa: linea('M3 10.5L12 3l9 7.5M5.5 9.5V20h13V9.5'),
  candado: ({ color, grosor }) => (
    <>
      <Rect x={4} y={10} width={16} height={11} rx={3} stroke={color} strokeWidth={grosor} fill="none" />
      <Path d="M8 10V7a4 4 0 018 0v3" stroke={color} strokeWidth={grosor} strokeLinecap="round" fill="none" />
    </>
  ),
  check: linea('M4.5 12.5l5 5 10-11'),
  cruz: linea('M6 6l12 12M18 6L6 18'),
  menos: linea('M6 12h12'),
  ajustes: ({ color, grosor }) => (
    <>
      <Circle cx={12} cy={12} r={3.2} stroke={color} strokeWidth={grosor} fill="none" />
      <Path
        d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5"
        stroke={color}
        strokeWidth={grosor}
        strokeLinecap="round"
      />
    </>
  ),
  campana: ({ color, grosor }) => (
    <>
      <Path
        d="M6 9a6 6 0 1112 0c0 4 1.2 5.6 2 6.5H4c.8-.9 2-2.5 2-6.5z"
        stroke={color}
        strokeWidth={grosor}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M10 19a2 2 0 004 0" stroke={color} strokeWidth={grosor} strokeLinecap="round" />
    </>
  ),
  estrella: relleno('M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z'),
  filtro: linea('M3 5h18M6.5 12h11M10 19h4'),
  ordenar: linea('M4 7h13M4 12h9M4 17h5M17 13v6m0 0l-3-3m3 3l3-3'),
  escudo: linea('M12 3l8 3v6c0 4.5-3.2 7.9-8 9.5-4.8-1.6-8-5-8-9.5V6z'),
  balon: ({ color, grosor }) => (
    <>
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={grosor} fill="none" />
      <Path
        d="M12 7.2l3.4 2.5-1.3 4h-4.2l-1.3-4z"
        stroke={color}
        strokeWidth={grosor}
        strokeLinejoin="round"
        fill="none"
      />
      <Path d="M12 3v4.2M4.2 9.2l4 .5M19.8 9.2l-4 .5M7 20l2.9-6.3M17 20l-2.9-6.3" stroke={color} strokeWidth={grosor} strokeLinecap="round" />
    </>
  ),
  duelo: ({ color, grosor }) => (
    <>
      <Rect x={3} y={4} width={7} height={16} rx={2} stroke={color} strokeWidth={grosor} fill="none" />
      <Rect x={14} y={4} width={7} height={16} rx={2} stroke={color} strokeWidth={grosor} fill="none" />
    </>
  ),
  moneda: ({ color, grosor }) => (
    <>
      <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={grosor} fill="none" />
      <Path d="M12 7.5v9M14.6 9.6c-.5-.8-1.5-1.2-2.6-1.2-1.5 0-2.6.8-2.6 1.9 0 2.6 5.2 1.4 5.2 4 0 1.2-1.2 2-2.7 2-1.2 0-2.2-.5-2.7-1.3" stroke={color} strokeWidth={grosor} strokeLinecap="round" fill="none" />
    </>
  ),
  camiseta: linea('M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3-2 2h-4z'),
  botiquin: ({ color, grosor }) => (
    <>
      <Rect x={3} y={7} width={18} height={13} rx={3} stroke={color} strokeWidth={grosor} fill="none" />
      <Path d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M12 11v5M9.5 13.5h5" stroke={color} strokeWidth={grosor} strokeLinecap="round" />
    </>
  ),
  recarga: linea('M20 12a8 8 0 11-2.6-5.9M20 4v4h-4'),
  rayo: relleno('M13.5 2L4 14h6l-1.5 8L20 10h-6.5z'),
  mundo: ({ color, grosor }) => (
    <>
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={grosor} fill="none" />
      <Path d="M3.5 9h17M3.5 15h17M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" stroke={color} strokeWidth={grosor} fill="none" />
    </>
  ),
  copa: linea('M7 4h10v5a5 5 0 01-10 0zM7 6H4v1.5A3.5 3.5 0 007.5 11M17 6h3v1.5a3.5 3.5 0 01-3.5 3.5M10 14h4l.7 5H9.3z'),
  masMenos: linea('M4 8h8M8 4v8M14 18h6'),
  info: ({ color, grosor }) => (
    <>
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={grosor} fill="none" />
      <Path d="M12 11v6M12 7.6v.2" stroke={color} strokeWidth={grosor} strokeLinecap="round" />
    </>
  ),
  // Un sobre: el rectángulo y la solapa en uve.
  correo: linea('M3 6h18v12H3zM3 7l9 6 9-6'),
};

export type NombreIcono = keyof typeof DIBUJOS;

export function Icono({
  nombre,
  tam = 20,
  color = C.texto,
  grosor = 1.9,
}: PropsIcono & { nombre: NombreIcono }) {
  const dibujo = DIBUJOS[nombre];
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      {dibujo({ tam, color, grosor })}
    </Svg>
  );
}
