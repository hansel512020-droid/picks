#!/usr/bin/env node
'use strict';
/* ==========================================================================
   Scout Picks · capturas.js
   Recorre la app en el navegador y guarda una imagen de cada pantalla.

   Antes de lanzarlo tiene que estar corriendo el servidor:
     npm run web        (deja abierto http://localhost:8081)
     node scripts/capturas.js

   Salida: capturas/NN-pantalla.png
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const RAIZ = path.join(__dirname, '..');
const SALIDA = path.join(RAIZ, 'capturas');
const URL = process.env.URL_APP || 'http://localhost:8081';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pulsa el elemento cuyo texto coincide exactamente. */
async function pulsa(pagina, texto) {
  return pagina.evaluate((t) => {
    const hoja = [...document.querySelectorAll('div')].find(
      (e) => e.textContent.trim() === t && e.children.length === 0,
    );
    if (!hoja) return false;
    let p = hoja;
    for (let i = 0; i < 6 && p; i++) {
      if (p.getAttribute && p.getAttribute('tabindex') !== null) {
        p.click();
        return true;
      }
      p = p.parentElement;
    }
    return false;
  }, texto);
}

async function foto(pagina, nombre, n) {
  const archivo = path.join(SALIDA, `${String(n).padStart(2, '0')}-${nombre}.png`);
  await pagina.screenshot({ path: archivo });
  console.log(`  ${path.basename(archivo)}`);
}

async function main() {
  if (!CHROME) throw new Error('No encontré Chrome ni Edge instalados.');
  fs.mkdirSync(SALIDA, { recursive: true });

  const navegador = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--hide-scrollbars', '--force-device-scale-factor=2'],
  });
  const pagina = await navegador.newPage();
  await pagina.setViewport({ width: 430, height: 900, deviceScaleFactor: 2 });

  console.log(`\nCapturando ${URL}\n`);
  await pagina.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await espera(6000);

  let n = 1;

  // ------------------------------------------------------------ onboarding
  await foto(pagina, 'bienvenida', n++);
  for (const paso of ['Siguiente', 'Siguiente', 'Siguiente']) {
    await pulsa(pagina, paso);
    await espera(1200);
  }
  await foto(pagina, 'bienvenida-comunidad', n++);

  // Se salta el resto y se elige una competición con partidos por jugar.
  await pulsa(pagina, 'Saltar');
  await espera(4000);
  await pagina.evaluate(() => {
    const clave = 'scout-picks/estado-v1';
    const t = JSON.parse(localStorage.getItem(clave) || '{}');
    t.onboarding = true;
    t.ajustes = { ...(t.ajustes || {}), competicionId: 'libertadores' };
    localStorage.setItem(clave, JSON.stringify(t));
  });
  await pagina.goto(URL, { waitUntil: 'networkidle2' });
  await espera(7000);

  // ---------------------------------------------------------------- inicio
  await foto(pagina, 'inicio', n++);
  await pagina.evaluate(() => window.scrollTo(0, 700));
  await espera(1500);
  await foto(pagina, 'inicio-picks', n++);
  await pagina.evaluate(() => window.scrollTo(0, 0));
  await espera(800);

  // ------------------------------------------------------- resto de pestañas
  for (const [pestana, nombre] of [
    ['Partidos', 'partidos'],
    ['Comunidad', 'comunidad'],
    ['Rendimiento', 'rendimiento'],
    ['Perfil', 'perfil'],
  ]) {
    await pulsa(pagina, pestana);
    await espera(4000);
    await foto(pagina, nombre, n++);
  }

  // ------------------------------------------------------ pantallas apiladas
  for (const [ruta, nombre, scroll] of [
    ['/competiciones', 'competiciones', 0],
    ['/pro', 'scout-pro', 0],
    ['/metodo', 'metodo', 0],
    ['/buscar', 'buscador', 0],
    ['/picks', 'todos-los-picks', 0],
  ]) {
    await pagina.goto(`${URL}${ruta}`, { waitUntil: 'networkidle2' });
    await espera(5000);
    if (scroll) await pagina.evaluate((y) => window.scrollTo(0, y), scroll);
    await foto(pagina, nombre, n++);

    // Del catalogo se guardan las dos vistas del filtro: solo lo descargado y
    // todo lo que la app puede cubrir.
    if (ruta === '/competiciones') {
      await pulsa(pagina, 'Todas');
      await espera(2000);
      await foto(pagina, 'competiciones-todas', n++);
    }
  }

  // ------------------------------------------------------- detalle y fichas
  // Se entra desde la portada para coger identificadores que existan.
  await pagina.goto(URL, { waitUntil: 'networkidle2' });
  await espera(7000);
  await pagina.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((e) =>
      e.textContent.trim().startsWith('Más de'),
    );
    if (!el) return;
    let p = el;
    for (let i = 0; i < 6 && p; i++) {
      if (p.getAttribute && p.getAttribute('tabindex') !== null) return p.click();
      p = p.parentElement;
    }
  });
  await espera(5000);
  await foto(pagina, 'detalle-del-pick', n++);
  await pagina.evaluate(() => window.scrollTo(0, 620));
  await espera(1200);
  await foto(pagina, 'detalle-del-pick-series', n++);

  // Del pick al partido.
  await pagina.evaluate(() => window.scrollTo(0, 0));
  await espera(600);
  await pulsa(pagina, 'Ver el partido completo');
  await espera(5000);
  await foto(pagina, 'partido-insights', n++);

  for (const [boton, nombre] of [
    ['Formaciones', 'partido-formaciones'],
    ['Lesiones', 'partido-lesiones'],
    ['Cuotas', 'partido-cuotas'],
    ['Duelo', 'partido-duelo'],
  ]) {
    await pulsa(pagina, boton);
    await espera(2500);
    await foto(pagina, nombre, n++);
  }

  console.log(`\nListo: ${n - 1} imágenes en capturas/\n`);
  await navegador.close();
}

main().catch((e) => {
  console.error(`\nError: ${e.message}\n`);
  process.exit(1);
});
