import { forwardRef } from 'react';
import {
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { C, E, R, T } from '@/tema';
import { Icono, type NombreIcono } from './iconos';

/** Piezas sueltas que se repiten en todas las pantallas. */

type Variante = keyof typeof T;

export function Txt({
  v = 'cuerpo',
  color = C.texto,
  style,
  ...props
}: TextProps & { v?: Variante; color?: string }) {
  return <Text {...props} style={[T[v] as TextStyle, { color }, style]} />;
}

export function Tarjeta({
  style,
  plana,
  ...props
}: ViewProps & { plana?: boolean }) {
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: plana ? C.carta2 : C.carta,
          borderRadius: R.lg,
          borderWidth: 1,
          borderColor: C.borde,
        },
        style,
      ]}
    />
  );
}

/** Fila pulsable con el mismo comportamiento de opacidad en toda la app. */
export const Pulsable = forwardRef<View, PressableProps & { style?: StyleProp<ViewStyle> }>(
  function Pulsable({ style, ...props }, ref) {
    return (
      <Pressable
        ref={ref}
        {...props}
        style={({ pressed }) => [
          typeof style === 'function' ? style({ pressed } as never) : style,
          pressed && { opacity: 0.62 },
        ]}
      />
    );
  },
);

export function Chip({
  texto,
  activo,
  onPress,
  icono,
  compacto,
}: {
  texto: string;
  activo?: boolean;
  onPress?: () => void;
  icono?: NombreIcono;
  compacto?: boolean;
}) {
  return (
    <Pulsable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: compacto ? 12 : 15,
        paddingVertical: compacto ? 7 : 9,
        borderRadius: R.pill,
        borderWidth: 1,
        borderColor: activo ? C.limaBorde : C.borde,
        backgroundColor: activo ? C.limaTenue : C.carta,
      }}
    >
      {icono ? <Icono nombre={icono} tam={14} color={activo ? C.lima : C.texto2} /> : null}
      <Text
        style={{
          ...T.pequeno,
          fontSize: compacto ? 12 : 13,
          color: activo ? C.lima : C.texto,
        }}
      >
        {texto}
      </Text>
    </Pulsable>
  );
}

export function Boton({
  texto,
  onPress,
  variante = 'principal',
  icono,
  ancho,
  deshabilitado,
}: {
  texto: string;
  onPress?: () => void;
  variante?: 'principal' | 'secundario' | 'fantasma';
  icono?: NombreIcono;
  ancho?: boolean;
  deshabilitado?: boolean;
}) {
  const principal = variante === 'principal';
  const fantasma = variante === 'fantasma';
  return (
    <Pulsable
      onPress={deshabilitado ? undefined : onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: R.md,
        alignSelf: ancho ? 'stretch' : 'flex-start',
        backgroundColor: principal ? C.lima : fantasma ? 'transparent' : C.carta2,
        borderWidth: fantasma ? 1 : 0,
        borderColor: C.borde,
        opacity: deshabilitado ? 0.45 : 1,
      }}
    >
      {icono ? <Icono nombre={icono} tam={17} color={principal ? '#0A0B0D' : C.texto} /> : null}
      <Text style={{ ...T.cuerpoFuerte, color: principal ? '#0A0B0D' : C.texto }}>{texto}</Text>
    </Pulsable>
  );
}

/** Cabecera de seccion: titulo a la izquierda y accion opcional a la derecha. */
export function Seccion({
  titulo,
  accion,
  onAccion,
  style,
}: {
  titulo: string;
  accion?: string;
  onAccion?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: E.lg,
          marginBottom: E.md,
        },
        style,
      ]}
    >
      <Txt v="subtitulo">{titulo}</Txt>
      {accion ? (
        <Pulsable onPress={onAccion}>
          <Txt v="pequeno" color={C.texto2}>
            {accion}
          </Txt>
        </Pulsable>
      ) : null}
    </View>
  );
}

/** Contador de guardados con la llama, tal cual sale en las tarjetas. */
export function Fuego({ n, grande }: { n: number; grande?: boolean }) {
  /*
   * Sin guardados no hay llama. Un "0 🔥" en cada tarjeta no dice nada y
   * ensucia la lista: la llama existe para señalar lo que la gente está
   * eligiendo, y si no la ha elegido nadie, no hay nada que señalar.
   */
  if (!n) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: grande ? 12 : 8,
        paddingVertical: grande ? 7 : 4,
        borderRadius: R.sm,
        backgroundColor: C.ambarTenue,
      }}
    >
      <Text style={{ ...T.pequenoFuerte, fontSize: grande ? 18 : 13, color: C.ambar }}>{n}</Text>
      <Text style={{ fontSize: grande ? 16 : 12 }}>🔥</Text>
    </View>
  );
}

/** Insignia pequena de texto: "PRO", "EN VIVO", "L10"... */
export function Insignia({
  texto,
  color = C.texto2,
  fondo = C.carta2,
}: {
  texto: string;
  color?: string;
  fondo?: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: R.xs,
        backgroundColor: fondo,
      }}
    >
      <Text style={{ ...T.etiqueta, color }}>{texto}</Text>
    </View>
  );
}

export function Separador({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: C.bordeSuave }, style]} />;
}

/**
 * Descargo legal, para el pie de las pantallas donde se ve.
 *
 * Deja claro qué es la app y qué no: analiza estadística, no es una casa de
 * apuestas, no cobra apuestas ni promete ganancias. Va en un solo sitio para
 * que el texto no se separe entre copias; se coloca donde tiene que leerse
 * —el perfil y la pantalla de pago—.
 */
export function Descargo({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Txt v="mini" color={C.texto3} style={[{ textAlign: 'center' }, style]}>
      GoldenPicks es una plataforma puramente informativa y de análisis de datos estadísticos
      deportivos. No somos una casa de apuestas, ni procesamos apuestas ni garantizamos retornos
      financieros. El contenido es exclusivo para fines de análisis e investigación. Solo para
      mayores de 18 años.
    </Txt>
  );
}

/** Estado vacio con icono, titulo y explicacion. */
export function Vacio({
  icono = 'buscar',
  titulo,
  detalle,
}: {
  icono?: NombreIcono;
  titulo: string;
  detalle?: string;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: E.xxxl, paddingHorizontal: E.xl, gap: E.sm }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.carta,
          borderWidth: 1,
          borderColor: C.borde,
        }}
      >
        <Icono nombre={icono} tam={24} color={C.texto3} />
      </View>
      <Txt v="cuerpoFuerte">{titulo}</Txt>
      {detalle ? (
        <Txt v="pequeno" color={C.texto3} style={{ textAlign: 'center' }}>
          {detalle}
        </Txt>
      ) : null}
    </View>
  );
}

/** Barra de progreso fina que se usa en comparativas y en el duelo. */
export function Barra({
  valor,
  color = C.lima,
  fondo = C.carta2,
  alto = 6,
}: {
  valor: number;
  color?: string;
  fondo?: string;
  alto?: number;
}) {
  return (
    <View style={{ height: alto, borderRadius: alto / 2, backgroundColor: fondo, overflow: 'hidden' }}>
      <View
        style={{
          width: `${Math.max(0, Math.min(100, valor))}%`,
          height: '100%',
          borderRadius: alto / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
