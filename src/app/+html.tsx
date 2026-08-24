import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * La página HTML que envuelve a la app en web.
 *
 * ── Para qué está ───────────────────────────────────────────────────────────
 *
 * Sobre todo, para que un enlace compartido se vea como algo. Sin estas
 * etiquetas, quien manda goldenpicks.vercel.app por WhatsApp —que es por donde
 * se mueve todo— pega una dirección pelada: sin título, sin imagen y sin una
 * línea que explique qué es. Nadie pulsa eso.
 *
 * Con ellas sale una tarjeta con el nombre, la descripción y el logo, y el
 * mismo enlace pasa de parecer spam a parecer un producto.
 *
 * Solo afecta a la web: en la app nativa esta plantilla no existe.
 */

const TITULO = 'Golden Picks · Análisis estadístico de fútbol';
const DESCRIPCION =
  'Rachas medidas partido a partido en 39 competiciones. Mira qué línea viene batiendo cada equipo y cada jugador. 5 ligas gratis, sin registro de pago.';
const DIRECCION = 'https://goldenpicks.vercel.app';
/*
 * La imagen de la tarjeta. Se usa el icono porque es lo que hay y siempre
 * carga; una captura de la app luciría más, pero una imagen rota luce peor que
 * un logo sencillo, y aquí una URL que falla deja la tarjeta sin nada.
 */
const IMAGEN = `${DIRECCION}/assets/assets/imagenes/icono.png`;

export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        {/*
          `viewport-fit=cover` y sin zoom: la app se usa a pantalla completa en
          el móvil y un pellizco accidental descuadra las listas.
        */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />

        <title>{TITULO}</title>
        <meta name="description" content={DESCRIPCION} />
        {/* El color de la barra del navegador en Android, para que no salga
            blanca sobre una app oscura. */}
        <meta name="theme-color" content="#0A0B0D" />

        {/* ── Tarjeta al compartir (WhatsApp, Telegram, Facebook…) ────────── */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Golden Picks" />
        <meta property="og:title" content={TITULO} />
        <meta property="og:description" content={DESCRIPCION} />
        <meta property="og:url" content={DIRECCION} />
        <meta property="og:image" content={IMAGEN} />
        <meta property="og:locale" content="es_EC" />

        {/* ── Y en X/Twitter ──────────────────────────────────────────────── */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITULO} />
        <meta name="twitter:description" content={DESCRIPCION} />
        <meta name="twitter:image" content={IMAGEN} />

        {/*
          Quita el scroll del body que mete React Native Web. Sin esto, las
          pantallas con lista propia acaban con dos barras de desplazamiento.
        */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
