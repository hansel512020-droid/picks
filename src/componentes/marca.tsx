import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { marca } from './movimiento';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, HUECO_PESTANAS, T } from '@/tema';

/**
 * Marca de Golden: una estrella de cuatro puntas dentro de un anillo. Es el
 * mismo simbolo del icono de la app, la cabecera y la pantalla de carga.
 */
export function Simbolo({ tam = 26, color = C.lima }: { tam?: number; color?: string }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={13.2} stroke={color} strokeWidth={2.4} fill="none" opacity={0.55} />
      <Path
        d="M16 3.6c1 5.4 3.4 8.4 8.8 9.6-5.4 1.2-7.8 4.2-8.8 9.6-1-5.4-3.4-8.4-8.8-9.6 5.4-1.2 7.8-4.2 8.8-9.6z"
        fill={color}
        transform="translate(0 3)"
      />
      <Circle cx={16} cy={16} r={3.1} fill={C.fondo} />
    </Svg>
  );
}

export function Logo({
  tam = 24,
  estilo,
}: {
  tam?: number;
  estilo?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, estilo]}>
      <Simbolo tam={tam + 6} />
      <Text {...marca('titular')} style={{ ...T.titulo, color: C.texto, fontSize: tam }}>
        Golden Picks
      </Text>
    </View>
  );
}

/**
 * Un resplandor lima muy tenue que cae desde arriba.
 *
 * Es solo ambiente: le quita a la pantalla el negro plano de la cabecera sin
 * competir con nada, y se funde antes de llegar al contenido. Va detrás de
 * todo y no recibe toques. Quien lo usa lo pone el primero dentro de su
 * contenedor, para que lo demás se pinte encima.
 */
export function Resplandor({ alto = 340, desde = 0 }: { alto?: number; desde?: number }) {
  return (
    <LinearGradient
      colors={['rgba(201,255,61,0.09)', 'rgba(201,255,61,0.025)', 'rgba(201,255,61,0)']}
      locations={[0, 0.45, 1]}
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        top: desde,
        left: 0,
        right: 0,
        height: alto - desde,
      }}
    />
  );
}

/**
 * Un fundido al color del fondo en el pie de las pantallas de pestañas.
 *
 * La barra de abajo flota y la lista pasa por debajo; sin esto, las tarjetas
 * se veían cortadas a los lados y detrás de la cápsula, y el pie de la
 * pantalla parecía un montón de cosas encima de otras. Con el fundido el
 * contenido se desvanece antes de llegar a la barra. Va el último dentro de la
 * pantalla, para pintarse encima de la lista, y no recibe toques.
 */
export function FundidoInferior() {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={['rgba(7,10,15,0)', 'rgba(7,10,15,0.82)', C.fondo]}
      locations={[0, 0.5, 1]}
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: HUECO_PESTANAS + insets.bottom,
      }}
    />
  );
}
