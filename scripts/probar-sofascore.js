/* ============================================================================
   ¿Se puede bajar SofaScore desde esta máquina, y con qué huella?

   Son dos preguntas distintas, y hasta ahora se contestaban como una sola:

     1. ¿Carga `curl-cffi-node`? Es la librería que imita la huella TLS de un
        navegador. Sin ella, la API de SofaScore devuelve 403 siempre, venga la
        petición de donde venga.
     2. ¿Le contesta SofaScore a ESTA máquina, y presentándose como qué? El
        2026-09-24 empezaron a rechazar todas las huellas de Chrome y a aceptar
        las de Safari y Firefox: no fue un bloqueo de IP, fue un cambio de su
        filtro, y el bot se pasó un día publicando sin sus estadísticas.

     node scripts/probar-sofascore.js

   Prueba una a una las huellas que usa el bot (las de `sofascore-api.js`, para
   que no puedan separarse) y dice cuáles pasan. No descarga datos ni toca
   ningún archivo. Sirve para comparar este PC con el servidor de GitHub.
   ========================================================================== */

const zlib = require('node:zlib');
const { HUELLAS } = require('./lib/sofascore-api');

// LaLiga en SofaScore: un torneo que existe siempre. Solo interesa que conteste.
const URL = 'https://api.sofascore.com/api/v1/unique-tournament/8/seasons';

// Las mismas cabeceras que manda el bot.
const CABECERAS = {
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.sofascore.com/',
  Origin: 'https://www.sofascore.com',
};

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  console.log(`Node ${process.version} · ${process.platform} ${process.arch}`);

  let get;
  try {
    ({ get } = require('curl-cffi-node'));
    console.log('1) curl-cffi-node: CARGA\n');
  } catch (e) {
    console.log(`1) curl-cffi-node: NO CARGA — ${e.message}`);
    console.log('   Sin esto no hay SofaScore posible aquí. En Linux hace falta');
    console.log('   glibc: el paquete no publica binario para musl (Alpine).');
    process.exit(1);
  }

  console.log('2) A quién deja pasar SofaScore:');
  let algunaVale = false;

  for (const huella of HUELLAS) {
    let resultado;
    try {
      const r = await get(URL, { impersonate: huella, timeout: 25, verify: false, headers: CABECERAS });
      if (r.ok) {
        let cuerpo = r.content;
        if ((r.headers.get('content-encoding') ?? '').includes('gzip')) {
          cuerpo = zlib.gunzipSync(cuerpo);
        }
        const temporadas = JSON.parse(cuerpo.toString('utf8')).seasons?.length ?? 0;
        resultado = `PASA · HTTP ${r.status} · ${temporadas} temporadas`;
        if (temporadas) algunaVale = true;
      } else {
        const cuerpo = (r.content?.toString('utf8') ?? '').replace(/\s+/g, ' ').slice(0, 70);
        resultado = `rechazada · HTTP ${r.status} · ${cuerpo}`;
      }
    } catch (e) {
      resultado = `error · ${e.message.slice(0, 70)}`;
    }
    console.log(`   ${huella.padEnd(12)} ${resultado}`);
    // Con pausa, que esto es pedirle cosas a un servidor que no nos debe nada.
    await espera(2500);
  }

  console.log(
    algunaVale
      ? '\nSOFASCORE FUNCIONA DESDE AQUÍ con al menos una huella.'
      : '\nSOFASCORE NO DEJA PASAR NINGUNA. Si en otra máquina sí pasan, es la IP;' +
          '\nsi no pasa en ninguna, han vuelto a cambiar el filtro y hay que buscar' +
          '\nuna huella nueva (ver HUELLAS en scripts/lib/sofascore-api.js).',
  );
  process.exit(algunaVale ? 0 : 1);
})();
