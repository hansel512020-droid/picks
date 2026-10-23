import { Platform, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Simbolo } from '@/componentes/marca';
import { Txt } from '@/componentes/base';
import { marca } from '@/componentes/movimiento';
import { C, E } from '@/tema';

/**
 * El símbolo con un halo que respira detrás y un arco que gira alrededor.
 *
 * Es lo único que se mueve en esta pantalla, y basta: dice "estoy trabajando"
 * sin inventar un progreso. En el teléfono, donde no hay CSS, se queda quieto.
 */
function Emblema() {
  const tam = 76;
  return (
    <View style={{ width: tam, height: tam, alignItems: 'center', justifyContent: 'center' }}>
      {Platform.OS === 'web' ? (
        <View
          {...marca('halo')}
          style={{
            pointerEvents: 'none',
            position: 'absolute',
            width: tam,
            height: tam,
            borderRadius: tam / 2,
            backgroundColor: C.lima,
          }}
        />
      ) : null}
      <View
        style={{
          width: tam,
          height: tam,
          borderRadius: tam / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.carta,
          borderWidth: 1,
          borderColor: C.borde,
          borderTopColor: C.bordeLuz,
        }}
      >
        <Simbolo tam={38} />
      </View>
      <View
        {...marca('gira')}
        style={{ pointerEvents: 'none', position: 'absolute', width: tam + 12, height: tam + 12 }}
      >
        <Svg width={tam + 12} height={tam + 12} viewBox="0 0 88 88">
          <Circle
            cx={44}
            cy={44}
            r={42}
            stroke={C.lima}
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="56 208"
            fill="none"
            opacity={0.9}
          />
        </Svg>
      </View>
    </View>
  );
}

/**
 * La pantalla de carga de la app. Una sola, para todas las esperas.
 *
 * Antes había dos seguidas y distintas —una ruedecita con "Cargando
 * resultados…" mientras bajaban los datos y otra pantalla mientras se montaban
 * los picks— y entre medias asomaba la portada a medio hacer. Tres estados
 * visuales para una sola espera: desde fuera eso no es "cargando", es una app
 * que parpadea.
 *
 * Ahora es siempre esto, y lo único que cambia es la frase y la barra. Quien
 * mira ve una pantalla que avanza, no tres que se pisan.
 */
export function PantallaCargando({
  titulo,
  detalle,
  pie,
  parte,
}: {
  titulo: string;
  detalle?: string;
  pie?: string;
  /** De 0 a 1. Sin esto la barra no sale: no se finge un progreso que no se sabe. */
  parte?: number;
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: E.lg,
        paddingHorizontal: E.xl,
        backgroundColor: C.fondo,
      }}
    >
      <Emblema />

      <View style={{ alignItems: 'center', gap: 4 }}>
        <Txt v="etiqueta" color={C.lima} style={{ letterSpacing: 2.4 }}>
          GOLDEN PICKS
        </Txt>
        <Txt v="subtitulo" {...marca('respira')}>
          {titulo}
        </Txt>
        {detalle ? (
          <Txt v="pequeno" color={C.texto3}>
            {detalle}
          </Txt>
        ) : null}
      </View>

      {/* Un porcentaje que avanza dice mucho más que una ruedecita girando. */}
      <View
        style={{
          width: '100%',
          maxWidth: 280,
          height: 6,
          borderRadius: 3,
          backgroundColor: C.carta2,
          overflow: 'hidden',
        }}
      >
        <View
          {...marca('ancho', 'brillo')}
          style={{
            width: `${Math.round(Math.max(0, Math.min(1, parte ?? 0.08)) * 100)}%`,
            height: '100%',
            borderRadius: 3,
            backgroundColor: C.lima,
            boxShadow: '0 0 12px rgba(201,255,61,0.6)',
          }}
        />
      </View>

      {pie ? (
        <Txt v="mini" color={C.texto3}>
          {pie}
        </Txt>
      ) : null}
    </View>
  );
}
