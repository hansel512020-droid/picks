import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Pulsable, Txt } from '@/componentes/base';
import { Icono } from '@/componentes/iconos';
import { C, E, R, sombra } from '@/tema';

/**
 * Avisa cuando hay una versión nueva de la app publicada.
 *
 * La web es una sola página: quien la deja abierta en una pestaña sigue con el
 * código del día que la abrió aunque se publiquen arreglos, porque moverse por
 * el menú no vuelve a descargar nada. Pasó con la carga de la portada: el
 * arreglo llevaba una hora publicado y la pestaña seguía con la versión que se
 * quedaba cargando.
 *
 * Cada cierto tiempo se pide la página de entrada y se mira con qué paquete de
 * código arranca. Si ya no es el que está corriendo, hay versión nueva: al
 * volver a la pestaña se recarga sola, y mientras tanto sale un aviso con un
 * botón para hacerlo en el momento. Lo guardado vive en el almacenamiento del
 * navegador, así que recargar no pierde nada.
 */

const CADA = 5 * 60_000;
const PAQUETE = /\/_expo\/static\/js\/web\/entry-[\w-]+\.js/;

function paqueteActual(): string | null {
  if (typeof document === 'undefined') return null;
  const src = document.querySelector('script[src*="/_expo/static/js/web/entry-"]')?.getAttribute('src');
  return src?.match(PAQUETE)?.[0] ?? null;
}

async function paquetePublicado(): Promise<string | null> {
  try {
    const r = await fetch(`/?v=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.text()).match(PAQUETE)?.[0] ?? null;
  } catch {
    return null;
  }
}

export function AvisoVersionNueva() {
  const [nueva, setNueva] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // En desarrollo no hay paquete con huella: nada que comparar.
    const actual = paqueteActual();
    if (!actual) return;

    let hayNueva = false;
    const mira = async () => {
      if (hayNueva) return;
      const publicado = await paquetePublicado();
      if (publicado && publicado !== actual) {
        hayNueva = true;
        setNueva(true);
      }
    };
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return;
      // Vuelve a la pestaña con una versión nueva esperando: se recarga sin preguntar.
      if (hayNueva) window.location.reload();
      else void mira();
    };

    const primera = setTimeout(() => void mira(), 30_000);
    const reloj = setInterval(() => void mira(), CADA);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearTimeout(primera);
      clearInterval(reloj);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  if (!nueva) return null;
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: E.md,
        alignItems: 'center',
        paddingHorizontal: E.lg,
        pointerEvents: 'box-none',
      }}
    >
      <Pulsable
        onPress={() => window.location.reload()}
        marcas="eleva"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: E.sm,
          paddingHorizontal: E.lg,
          paddingVertical: 10,
          borderRadius: R.pill,
          backgroundColor: C.lima,
          ...sombra,
        }}
      >
        <Icono nombre="recarga" tam={15} color={C.fondo} />
        <Txt v="pequenoFuerte" color={C.fondo}>
          Hay una versión nueva · Actualizar
        </Txt>
      </Pulsable>
    </View>
  );
}
