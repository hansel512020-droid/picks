import { View, Text, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { C, T } from '@/tema';

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
      <Text style={{ ...T.titulo, color: C.texto, fontSize: tam }}>Golden Picks</Text>
    </View>
  );
}
