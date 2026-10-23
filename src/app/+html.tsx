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

/*
 * Dos títulos, y a propósito.
 *
 * En la pestaña del navegador solo caben unos veinte caracteres antes de que
 * Chrome corte con puntos suspensivos, así que el largo salía como
 * "Golden Picks · Aná…" y no aportaba nada. La pestaña lleva el nombre a secas
 * —que es como se reconoce entre veinte pestañas abiertas— y el largo se queda
 * donde sí se lee entero: la tarjeta que sale al compartir el enlace.
 */
const TITULO_PESTANA = 'Golden Picks';
const TITULO = 'Golden Picks · Análisis estadístico de fútbol';
const DESCRIPCION =
  'Rachas medidas partido a partido en 39 competiciones. Mira qué línea viene batiendo cada equipo y cada jugador. 5 ligas gratis, sin registro de pago.';
const DIRECCION = 'https://goldenpicks.vercel.app';
/*
 * La imagen de la tarjeta. Se usa el icono porque es lo que hay y siempre
 * carga; una captura de la app luciría más, pero una imagen rota luce peor que
 * un logo sencillo, y aquí una URL que falla deja la tarjeta sin nada.
 */
const IMAGEN = `${DIRECCION}/portada.png`;

/*
 * El movimiento y los acabados de la web, en CSS.
 *
 * Las piezas se marcan con `data-gp` desde `componentes/movimiento.tsx` y aquí
 * se decide qué hace cada marca. Va en CSS y no en JavaScript para que el
 * navegador lo anime por su cuenta: el hover de veinte tarjetas no le cuesta
 * nada a React.
 *
 * Va en un <style> en línea porque la política de seguridad de `vercel.json`
 * admite estilos en línea pero no scripts: esto no necesita tocarla.
 *
 * Solo se anima `transform` y `opacity` en lo que se repite mucho, que es lo
 * que el navegador mueve sin recalcular la página.
 */
const ESTILOS = `
:root { color-scheme: dark; }
html, body { background-color: #0A0B0D; }
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  -webkit-tap-highlight-color: transparent;
}
::selection { background: rgba(201,255,61,0.28); color: #fff; }

* { scrollbar-width: thin; scrollbar-color: #2A2E35 transparent; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background-color: #2A2E35; border-radius: 10px;
  border: 3px solid transparent; background-clip: padding-box;
}
::-webkit-scrollbar-thumb:hover { background-color: #3A3F46; }

/* ── Campos de texto ─────────────────────────────────────────────── */
input, textarea { caret-color: #C9FF3D; transition: border-color .2s ease, box-shadow .2s ease; }
/* El contorno blanco del navegador se cambia por el anillo lima de la app. */
input:focus, textarea:focus { outline: none; }
input:focus-visible, textarea:focus-visible {
  border-color: rgba(201,255,61,.55) !important;
  box-shadow: 0 0 0 3px rgba(201,255,61,.12);
}
/* Un campo que va dentro de una caja con icono: el anillo es de la caja. */
[data-gp~="campo"] { transition: border-color .2s ease, box-shadow .2s ease; }
[data-gp~="campo"]:focus-within {
  border-color: rgba(201,255,61,.55) !important;
  box-shadow: 0 0 0 3px rgba(201,255,61,.12);
}
[data-gp~="campo"] input:focus-visible { box-shadow: none; }
/* El autocompletado de Chrome pinta los campos de amarillo o azul claro, que
   sobre fondo negro deja el texto ilegible. Se mantiene el fondo de la app. */
input:-webkit-autofill {
  -webkit-text-fill-color: #FFFFFF;
  transition: background-color 600000s 0s, border-color .2s ease, box-shadow .2s ease;
}

/* ── Lo que se pulsa ─────────────────────────────────────────────── */
[data-gp~="p"] {
  cursor: pointer;
  transition: opacity .18s ease, transform .22s cubic-bezier(.2,.8,.2,1),
    filter .2s ease, background-color .2s ease, border-color .2s ease,
    box-shadow .25s ease;
}
[data-gp~="p"]:focus-visible { outline: 2px solid rgba(201,255,61,.75); outline-offset: 2px; }
[data-gp~="p"]:not([data-gp~="plano"]):active { transform: scale(.97); }

/* ── Superficies ─────────────────────────────────────────────────── */
[data-gp~="tarjeta"] {
  background-image: linear-gradient(180deg, rgba(255,255,255,.028), rgba(255,255,255,0) 42%);
  transition: transform .28s cubic-bezier(.2,.8,.2,1), box-shadow .28s ease, border-color .28s ease;
}

@media (hover: hover) and (pointer: fine) {
  [data-gp~="p"]:not([data-gp~="plano"]):hover { filter: brightness(1.15); }
  [data-gp~="eleva"]:hover {
    transform: translateY(-3px);
    box-shadow: 0 20px 40px -22px rgba(0,0,0,.95), 0 0 0 1px rgba(201,255,61,.10);
  }
  [data-gp~="eleva"]:not([data-gp~="vivo"]):hover { border-color: #31363E !important; }
}

/* ── Entradas ────────────────────────────────────────────────────── */
@keyframes gp-entra {
  from { opacity: 0; transform: translateY(16px) scale(.985); }
  to { opacity: 1; transform: none; }
}
[data-gp~="entra"] { animation: gp-entra .55s cubic-bezier(.2,.8,.2,1) both; }

@keyframes gp-despliega {
  from { opacity: 0; transform: translateY(-6px) scale(.98); }
  to { opacity: 1; transform: none; }
}
[data-gp~="despliega"] { animation: gp-despliega .26s cubic-bezier(.2,.8,.2,1) both; transform-origin: top center; }

@keyframes gp-crece { from { transform: scaleX(0); } to { transform: scaleX(1); } }
[data-gp~="crece"] { transform-origin: left center; animation: gp-crece .8s cubic-bezier(.2,.8,.2,1) both; }

@keyframes gp-sube { from { transform: scaleY(0); } to { transform: scaleY(1); } }
[data-gp~="sube"] { transform-origin: center bottom; animation: gp-sube .7s cubic-bezier(.2,.8,.2,1) both; }

@keyframes gp-pop { 0% { transform: scale(1); } 40% { transform: scale(1.32); } 100% { transform: scale(1); } }
[data-gp~="pop"] { animation: gp-pop .38s cubic-bezier(.2,.8,.2,1); }

/* ── Indicadores que viajan ──────────────────────────────────────── */
[data-gp~="desliza"] { transition: left .32s cubic-bezier(.2,.8,.2,1), width .32s cubic-bezier(.2,.8,.2,1); }
[data-gp~="ancho"] { transition: width .6s cubic-bezier(.2,.8,.2,1); }
[data-gp~="color"] { transition: color .2s ease, background-color .2s ease, border-color .2s ease; }

/* ── En vivo ─────────────────────────────────────────────────────── */
@keyframes gp-latido {
  0% { box-shadow: 0 0 0 0 rgba(240,82,75,.6); }
  70% { box-shadow: 0 0 0 7px rgba(240,82,75,0); }
  100% { box-shadow: 0 0 0 0 rgba(240,82,75,0); }
}
[data-gp~="latido"] { animation: gp-latido 1.8s ease-out infinite; }

/* ── Reflejo que cruza ───────────────────────────────────────────── */
@keyframes gp-barrido { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
[data-gp~="brillo"] { position: relative; overflow: hidden; }
[data-gp~="brillo"]::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,.16) 50%, transparent 80%);
  transform: translateX(-100%);
  animation: gp-barrido 3.2s cubic-bezier(.4,0,.2,1) 1.2s infinite;
}

/* ── Pantalla de carga ───────────────────────────────────────────── */
@keyframes gp-halo { 0%, 100% { opacity: .35; transform: scale(.9); } 50% { opacity: .7; transform: scale(1.08); } }
[data-gp~="halo"] { filter: blur(26px); animation: gp-halo 2.6s ease-in-out infinite; }
@keyframes gp-gira { to { transform: rotate(360deg); } }
[data-gp~="gira"] { animation: gp-gira 1.4s linear infinite; }
@keyframes gp-respira { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
[data-gp~="respira"] { animation: gp-respira 1.8s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    animation-delay: 0ms !important;
    transition-duration: .001ms !important;
  }
}
`;

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

        <title>{TITULO_PESTANA}</title>
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
        <style dangerouslySetInnerHTML={{ __html: ESTILOS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
