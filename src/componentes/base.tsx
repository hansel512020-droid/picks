import { forwardRef, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { brillo, C, E, R, T } from '@/tema';
import { Icono, type NombreIcono } from './iconos';
import { marca } from './movimiento';

/** Piezas sueltas que se repiten en todas las pantallas. */

type Variante = keyof typeof T;

/*
 * La escala tipográfica compilada una vez.
 *
 * En la web, un estilo escrito en línea se traduce a CSS cada vez que se
 * monta el texto; uno de `StyleSheet.create` se traduce al arrancar y después
 * es solo una clase. `Txt` es lo que más se pinta de toda la app —cada
 * tarjeta lleva una docena—, así que aquí es donde más se nota.
 */
const ESCALA = StyleSheet.create(T as Record<Variante, TextStyle>);

/**
 * Las variantes que en la web van con la letra de titulares (ver `+html.tsx`).
 * Las demás —todo lo que se lee de corrido— se quedan en la de texto.
 */
const TITULARES: Partial<Record<Variante, true>> = {
  displayXL: true,
  display: true,
  titulo: true,
  subtitulo: true,
};

export function Txt({
  v = 'cuerpo',
  color = C.texto,
  titular,
  marcas,
  style,
  ...props
}: TextProps & {
  v?: Variante;
  color?: string;
  /** Fuerza la letra de titulares aunque la variante sea de texto. */
  titular?: boolean;
  /** Marcas de movimiento (ver `marca`). */
  marcas?: string;
}) {
  return (
    <Text
      {...props}
      {...marca((titular ?? TITULARES[v]) && 'titular', marcas)}
      style={[ESCALA[v], { color }, style]}
    />
  );
}

const base = StyleSheet.create({
  tarjeta: {
    backgroundColor: C.carta,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.borde,
    // Un punto más claro arriba: la luz cae desde arriba y la tarjeta se
    // despega del fondo sin necesidad de sombra.
    borderTopColor: C.bordeLuz,
  },
  plana: { backgroundColor: C.carta2 },
});

export function Tarjeta({
  style,
  plana,
  interactiva,
  vivo,
  marcas,
  ...props
}: ViewProps & {
  plana?: boolean;
  /** Se levanta al pasar el ratón por encima (web). Solo si se puede abrir. */
  interactiva?: boolean;
  /** Partido en juego: conserva el borde rojo también con el ratón encima. */
  vivo?: boolean;
  /** Más marcas de movimiento (ver `marca`). */
  marcas?: string;
}) {
  return (
    <View
      {...props}
      {...marca('tarjeta', interactiva && 'eleva', vivo && 'vivo', marcas)}
      style={[base.tarjeta, plana && base.plana, style]}
    />
  );
}

const WEB = Platform.OS === 'web';

/*
 * Lo que hace al pulsarse.
 *
 * En el teléfono se hunde un poco además de apagarse, que es lo que se espera
 * de un botón de iOS. En la web el hundido lo pone el CSS (`:active`), que
 * además lo anima; aquí solo queda el apagado.
 */
const PULSADO = StyleSheet.create({
  web: { opacity: 0.82 },
  hundido: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  plano: { opacity: 0.62 },
});

/**
 * Lo pulsable de toda la app, con el mismo comportamiento en todas partes.
 *
 * `plano` es para lo que va dentro de algo que ya reacciona —el cuerpo de una
 * tarjeta de pick—: si se hundiera solo un trozo, la tarjeta se partiría.
 */
export const Pulsable = forwardRef<
  View,
  PressableProps & { style?: StyleProp<ViewStyle>; plano?: boolean; marcas?: string }
>(function Pulsable({ style, plano, marcas, ...props }, ref) {
  return (
    <Pressable
      ref={ref}
      {...props}
      {...marca('p', plano && 'plano', marcas)}
      style={({ pressed }) => [
        typeof style === 'function' ? style({ pressed } as never) : style,
        pressed && (WEB ? PULSADO.web : plano ? PULSADO.plano : PULSADO.hundido),
      ]}
    />
  );
});

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
        boxShadow: activo ? brillo.lima : undefined,
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
      // El reflejo que cruza solo en el principal y si se puede pulsar: es el
      // que tiene que llamar la atención, y uno apagado no debe invitar.
      marcas={principal && !deshabilitado ? 'brillo' : undefined}
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
        boxShadow: principal && !deshabilitado ? brillo.limaFuerte : undefined,
      }}
    >
      {icono ? <Icono nombre={icono} tam={17} color={principal ? '#0A0B0D' : C.texto} /> : null}
      <Text style={{ ...T.cuerpoFuerte, color: principal ? '#0A0B0D' : C.texto }}>{texto}</Text>
    </Pulsable>
  );
}

/**
 * Título de sección con su barrita lima delante.
 *
 * Sin ella los títulos eran texto blanco suelto entre tarjetas, y en una
 * pantalla larga no se distinguía dónde empezaba cada bloque.
 */
export function TituloSeccion({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 9 }, style]}>
      <View
        style={{
          width: 3,
          height: 17,
          borderRadius: 2,
          backgroundColor: C.lima,
          boxShadow: '0 0 10px rgba(201,255,61,0.55)',
        }}
      />
      <Txt v="subtitulo">{children}</Txt>
    </View>
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
      <TituloSeccion>{titulo}</TituloSeccion>
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
    <View
      {...marca('entra')}
      style={{ alignItems: 'center', paddingVertical: E.xxxl, paddingHorizontal: E.xl, gap: E.sm }}
    >
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
          borderTopColor: C.bordeLuz,
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
        {...marca('crece', 'ancho')}
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
