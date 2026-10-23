import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * El movimiento de la app: hover, pulsaciones, entradas y latidos.
 *
 * ── Cómo funciona ───────────────────────────────────────────────────────────
 *
 * En la web todo va por CSS: la plantilla HTML (`+html.tsx`) trae las reglas y
 * aquí solo se marca cada pieza con un atributo `data-gp`. El navegador anima
 * en su propio hilo y React no se entera: pasar el ratón por veinte tarjetas
 * no repinta ni una.
 *
 * En el teléfono no hay CSS. Ahí las entradas van con Reanimated, que anima
 * en el hilo de la interfaz, y lo demás se queda quieto: un latido que no se
 * ve no hace falta pagarlo.
 */

const WEB = Platform.OS === 'web';

/**
 * Las marcas que lee el CSS de la web, como propiedad de una vista. En el
 * teléfono no pone nada.
 *
 * Marcas que existen (ver `+html.tsx`):
 * · `p`: se puede pulsar. Cursor, transiciones y anillo de foco.
 * · `plano`: pulsable sin hover propio, porque ya reacciona su tarjeta.
 * · `tarjeta`: superficie con brillo suave arriba.
 * · `eleva`: se levanta al pasar el ratón.
 * · `vivo`: tarjeta de un partido en juego; conserva su borde rojo.
 * · `entra`: aparece subiendo y fundiéndose.
 * · `pagina`: el contenido de una pantalla al abrirse.
 * · `titular`: letra de titulares (Space Grotesk).
 * · `despliega`: se abre desde arriba (menús y bloques que se despliegan).
 * · `latido`: punto que late (en vivo).
 * · `crece`: barra que se llena de izquierda a derecha al aparecer.
 * · `sube`: barra vertical que crece desde abajo al aparecer.
 * · `campo`: caja de un campo de texto; se ilumina con el foco.
 * · `pop`: rebote corto (guardar).
 * · `brillo`: un reflejo que cruza de lado a lado.
 * · `desliza`: indicador que viaja entre pestañas.
 * · `ancho`: cambia de ancho con transición (barras de progreso).
 * · `halo`, `gira`, `respira`: la pantalla de carga.
 */
export function marca(...marcas: (string | false | null | undefined)[]): object {
  if (!WEB) return {};
  const gp = marcas.filter(Boolean).join(' ');
  return gp ? { dataSet: { gp } } : {};
}

/**
 * Retrasa la animación CSS de una pieza, para escalonar las de una serie. En
 * el teléfono no hace nada.
 */
export function retraso(ms: number): ViewStyle | undefined {
  return WEB && ms > 0 ? ({ animationDelay: `${ms}ms` } as ViewStyle) : undefined;
}

/**
 * Hace entrar a sus hijos subiendo y fundiéndose.
 *
 * `orden` escalona las primeras piezas de una lista para que no caigan todas
 * de golpe. A partir de la sexta ya no espera: en una lista que se va
 * pintando al desplazarse, una tarjeta que llega tarde parece un fallo.
 */
export function Aparece({
  children,
  orden = 0,
  style,
}: {
  children: ReactNode;
  orden?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const espera = orden < 6 ? orden * 55 : 0;

  if (WEB) {
    return (
      <View {...marca('entra')} style={[style, retraso(espera)]}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(380).delay(espera)} style={style}>
      {children}
    </Animated.View>
  );
}
