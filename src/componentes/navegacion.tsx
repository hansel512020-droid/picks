import { router } from 'expo-router';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { brillo, C, E, R } from '@/tema';
import { Pulsable, Txt } from './base';
import { Icono, type NombreIcono } from './iconos';
import { marca } from './movimiento';

/**
 * Control segmentado con pastilla lima, como el de Cuotas / Insights / Duelo.
 *
 * La pastilla es una sola y viaja de una opción a otra en vez de encenderse y
 * apagarse en cada botón: así se ve de dónde se viene y adónde se va. Las
 * opciones miden lo mismo (`flex: 1`), así que su sitio es un porcentaje y no
 * hace falta medir nada.
 */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambia,
  estilo,
}: {
  opciones: { id: T; texto: string; icono?: NombreIcono }[];
  valor: T;
  onCambia: (id: T) => void;
  estilo?: StyleProp<ViewStyle>;
}) {
  const indice = Math.max(0, opciones.findIndex((op) => op.id === valor));
  const parte = 100 / Math.max(1, opciones.length);
  return (
    <View
      style={[
        {
          padding: 4,
          borderRadius: R.md + 4,
          borderWidth: 1,
          borderColor: C.borde,
          borderTopColor: C.bordeLuz,
          backgroundColor: C.carta,
        },
        estilo,
      ]}
    >
      <View style={{ flexDirection: 'row' }}>
        <View
          {...marca('desliza')}
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${indice * parte}%`,
            width: `${parte}%`,
            borderRadius: R.md,
            borderWidth: 1,
            borderColor: C.limaBorde,
            backgroundColor: C.limaTenue,
            boxShadow: brillo.lima,
          }}
        />
        {opciones.map((op) => {
          const activo = op.id === valor;
          return (
            <Pulsable
              key={op.id}
              onPress={() => onCambia(op.id)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                paddingVertical: 11,
                borderRadius: R.md,
              }}
            >
              {op.icono ? (
                <Icono nombre={op.icono} tam={16} color={activo ? C.lima : C.texto2} />
              ) : null}
              <Txt v="cuerpoFuerte" color={activo ? C.lima : C.texto2} {...marca('color')}>
                {op.texto}
              </Txt>
            </Pulsable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Pestanas con subrayado lima: Picks / Formaciones / Lesiones.
 *
 * Igual que el segmentado, el subrayado es uno solo y se desliza.
 */
export function Pestanas<T extends string>({
  opciones,
  valor,
  onCambia,
}: {
  opciones: { id: T; texto: string }[];
  valor: T;
  onCambia: (id: T) => void;
}) {
  const indice = Math.max(0, opciones.findIndex((op) => op.id === valor));
  const parte = 100 / Math.max(1, opciones.length);
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.bordeSuave }}>
      {opciones.map((op) => {
        const activo = op.id === valor;
        return (
          <Pulsable
            key={op.id}
            onPress={() => onCambia(op.id)}
            plano
            style={{ flex: 1, alignItems: 'center', paddingVertical: 13 }}
          >
            <Txt v="cuerpoFuerte" color={activo ? C.lima : C.texto2} {...marca('color')}>
              {op.texto}
            </Txt>
          </Pulsable>
        );
      })}
      <View
        {...marca('desliza')}
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          bottom: -1,
          height: 2,
          left: `${indice * parte}%`,
          width: `${parte}%`,
          borderRadius: 1,
          backgroundColor: C.lima,
          boxShadow: '0 0 12px rgba(201,255,61,0.55)',
        }}
      />
    </View>
  );
}

/** Cabecera de las pantallas apiladas: flecha atras, titulo y accion. */
export function CabeceraAtras({
  titulo,
  subtitulo,
  accion,
}: {
  titulo?: string;
  subtitulo?: string;
  accion?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: E.md,
        paddingHorizontal: E.lg,
        paddingBottom: E.md,
      }}
    >
      <Pulsable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={10}
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.carta,
          borderWidth: 1,
          borderColor: C.borde,
          borderTopColor: C.bordeLuz,
        }}
      >
        <Icono nombre="flechaIzquierda" tam={18} color={C.texto} />
      </Pulsable>
      <View style={{ flex: 1 }}>
        {titulo ? (
          <Txt v="subtitulo" numberOfLines={1}>
            {titulo}
          </Txt>
        ) : null}
        {subtitulo ? (
          <Txt v="pequeno" color={C.texto3} numberOfLines={1}>
            {subtitulo}
          </Txt>
        ) : null}
      </View>
      {accion}
    </View>
  );
}

/**
 * Carrusel horizontal de chips. Va envuelto en una vista que no encoge: si se
 * deja el ScrollView suelto dentro de una columna, se queda sin altura y los
 * chips salen cortados por la mitad.
 */
export function TiraChips({
  children,
  estilo,
}: {
  children: React.ReactNode;
  estilo?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexGrow: 0, flexShrink: 0 }, estilo]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: E.lg, gap: E.sm, alignItems: 'center' }}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** Caja con un numero grande y su etiqueta, para los paneles de estadisticas. */
export function Dato({
  valor,
  etiqueta,
  color = C.texto,
  ancho,
}: {
  valor: string;
  etiqueta: string;
  color?: string;
  ancho?: boolean;
}) {
  return (
    <View style={{ flex: ancho ? 1 : undefined, alignItems: 'center', gap: 2 }}>
      <Txt v="display" color={color} style={{ fontSize: 26 }}>
        {valor}
      </Txt>
      <Txt v="pequeno" color={C.texto3}>
        {etiqueta}
      </Txt>
    </View>
  );
}

/** Fila etiqueta-valor de las tablas de metricas. */
export function FilaDato({
  etiqueta,
  valor,
  destacado,
  sufijo,
}: {
  etiqueta: string;
  valor: string | number;
  destacado?: boolean;
  sufijo?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 11,
      }}
    >
      <Txt v="cuerpo" color={C.texto2}>
        {etiqueta}
      </Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Txt v="cuerpoFuerte" color={destacado ? C.lima : C.texto}>
          {valor}
        </Txt>
        {sufijo ? (
          <Txt v="mini" color={C.texto3}>
            {sufijo}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}
