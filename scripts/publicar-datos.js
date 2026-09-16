#!/usr/bin/env node
'use strict';
/**
 * Sube el archivo de datos recortado a Supabase Storage.
 *
 * Uso:
 *   node scripts/publicar-datos.js
 *
 * Necesita SUPABASE_SERVICE_ROLE_KEY en el entorno o en .env.local:
 *   set SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   node scripts/publicar-datos.js
 *
 * Lo que hace:
 *   1. Lee src/datos/importado.json
 *   2. Lo comprime con gzip (nivel 9)
 *   3. Sube importado.json.gz al bucket "datos" de Supabase Storage
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const RAIZ = path.resolve(__dirname, '..');
const ARCHIVO = path.join(RAIZ, 'src', 'datos', 'importado.json');
const BUCKET = 'datos';

function clave() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return process.env.SUPABASE_SERVICE_ROLE_KEY;
  const envLocal = path.join(RAIZ, '.env.local');
  if (fs.existsSync(envLocal)) {
    const linea = fs.readFileSync(envLocal, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('SUPABASE_SERVICE_ROLE_KEY='));
    if (linea) return linea.split('=').slice(1).join('=').trim();
  }
  return null;
}

function url() {
  const envFile = path.join(RAIZ, '.env');
  if (fs.existsSync(envFile)) {
    const linea = fs.readFileSync(envFile, 'utf8')
      .split('\n')
      .find((l) => l.startsWith('EXPO_PUBLIC_SUPABASE_URL='));
    if (linea) return linea.split('=').slice(1).join('=').trim().replace(/\/+$/, '');
  }
  return process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
}

async function sube(supaUrl, serviceKey, nombre, contenido, tipo) {
  const endpoint = `${supaUrl}/storage/v1/object/${BUCKET}/${nombre}`;
  const r = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': tipo,
      'Cache-Control': 'public, max-age=300',
      'x-upsert': 'true',
    },
    body: contenido,
  });
  if (!r.ok) {
    const detalle = await r.text();
    throw new Error(`${r.status} al subir ${nombre}: ${detalle}`);
  }
  return r.status;
}

/**
 * Sube el archivo con la CLI de Supabase, que se autentica con la sesión de
 * `supabase login` y no necesita ninguna clave.
 *
 * Es el camino bueno desde que el proyecto pasó al sistema nuevo de claves:
 * las antiguas (`eyJ…`) están desactivadas —Storage responde "Legacy API keys
 * are disabled"— y Storage todavía no acepta las nuevas (`sb_secret_…`), que
 * intenta leer como si fueran un JWT. Por API no hay forma; por la CLI sí.
 *
 * El `--yes` no es decorativo: sin él, `rm` se salta el borrado sin avisar
 * —dice "deleted: []" y se queda tan ancho— y luego `cp` falla porque el
 * archivo sigue estando. Y hay que borrar antes de subir porque `cp` no
 * sobrescribe.
 */
function subeConLaCli(archivoGz, nombreDestino = 'importado.json.gz') {
  const { spawnSync } = require('node:child_process');
  const destino = `ss:///datos/${nombreDestino}`;
  /*
   * Con `shell: true` a la fuerza: en Windows, Node se niega a ejecutar un
   * `.cmd` —y `npx` lo es— sin pasar por el intérprete, y falla con un EINVAL
   * mudo, sin salida ni código de error que explique nada. Como el intérprete
   * pega los argumentos tal cual, van entrecomillados.
   */
  const corre = (args) =>
    spawnSync(
      'npx',
      ['supabase', ...args].map((a) => (/[\s"]/.test(a) ? JSON.stringify(a) : a)),
      { cwd: RAIZ, encoding: 'utf8', shell: true },
    );

  process.stdout.write('Borrando la versión anterior… ');
  const borrado = corre(['storage', 'rm', destino, '--experimental', '--yes']);
  console.log(borrado.status === 0 ? 'OK' : 'no estaba');

  /*
   * Ruta relativa y con barras normales. La absoluta de Windows lleva barras
   * invertidas, y al pasar por el intérprete se las come: la CLI acababa
   * viendo dos rutas locales y respondía "Unsupported operation".
   */
  const origen = path.relative(RAIZ, archivoGz).split(path.sep).join('/');

  process.stdout.write(`Subiendo ${nombreDestino}… `);
  const subida = corre([
    'storage', 'cp', origen, destino,
    '--content-type', 'application/gzip',
    '--cache-control', 'public, max-age=300',
    '--experimental', '--yes',
  ]);
  const salida = `${subida.stdout ?? ''}${subida.stderr ?? ''}`;
  if (subida.status !== 0 || salida.includes('"_tag":"Error"')) {
    console.log('FALLÓ');
    throw new Error(salida.slice(0, 400) || 'la CLI no pudo subir el archivo');
  }
  console.log('OK');
}

async function main() {
  if (!fs.existsSync(ARCHIVO)) {
    console.error('No existe ' + ARCHIVO + '. Ejecuta primero importar.js.');
    process.exit(1);
  }

  const crudo = fs.readFileSync(ARCHIVO);
  const datos = JSON.parse(crudo);

  /*
   * Si la importación no trajo nada, no se sube nada. Pasó en septiembre de
   * 2026: ESPN cambió su API, el importador guardó "0 competiciones" sin dar
   * error, y la subida habría reemplazado el núcleo publicado por uno vacío,
   * dejando la app sin un solo partido. Mejor datos de ayer que ningún dato.
   */
  if (!Object.keys(datos.competiciones ?? {}).length) {
    console.error('La importación no trajo ninguna competición: no se publica nada.');
    console.error('Los datos que ya están en Supabase se quedan como están.');
    process.exit(1);
  }

  const comprimido = zlib.gzipSync(crudo, { level: 9 });
  // La CLI sube un archivo, no un montón de bytes, así que el comprimido se
  // deja junto al original. Está en .gitignore: es un resultado, no una fuente.
  const archivoGz = `${ARCHIVO}.gz`;
  fs.writeFileSync(archivoGz, comprimido);

  console.log(`Original:   ${(crudo.length / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Comprimido: ${(comprimido.length / 1024 / 1024).toFixed(1)} MB`);

  /*
   * Además del archivo completo, se sube partido en dos:
   *
   *  · nucleo  — todas las competiciones con sus equipos y partidos, pero SIN
   *              el detalle por jugador. Es lo que la app baja primero: basta
   *              para la portada, las tablas, el historial de equipo y los
   *              picks de equipo, y pesa la mitad, así que abre el doble de
   *              rápido.
   *  · detalle — solo los jugadores y sus registros, por competición. La app lo
   *              baja después, en segundo plano, y con él aparecen los picks de
   *              jugador.
   *
   * El completo se sigue subiendo como respaldo: una app que no encuentre el
   * núcleo tira de él, como hasta ahora. No se recorta ningún dato: es el mismo,
   * repartido en dos.
   */
  const nucleo = { ...datos, competiciones: {} };
  const detalle = { actualizado: datos.actualizado, competiciones: {} };
  let totalRegistros = 0;
  for (const [id, c] of Object.entries(datos.competiciones ?? {})) {
    nucleo.competiciones[id] = { ...c, jugadores: [], registros: [] };
    detalle.competiciones[id] = { jugadores: c.jugadores ?? [], registros: c.registros ?? [] };
    totalRegistros += c.registros?.length ?? 0;
  }
  const gzNucleo = zlib.gzipSync(Buffer.from(JSON.stringify(nucleo)), { level: 9 });
  const nucleoGz = path.join(RAIZ, 'src', 'datos', 'nucleo.json.gz');
  fs.writeFileSync(nucleoGz, gzNucleo);

  /*
   * La pasada ligera no trae actas (`--detalles 0`), así que no hay jugadores
   * ni registros: solo resultados, calendario y cuotas frescos. Si en ese caso
   * subiéramos el detalle, sería un archivo vacío que borraría del todo los
   * picks de jugador hasta la siguiente pasada completa de madrugada. Por eso,
   * sin registros, se sube SOLO el núcleo y se conserva el detalle publicado.
   *
   * El núcleo no lleva registros de todos modos, así que se actualiza igual: la
   * app enseña los resultados nuevos al momento y mantiene los jugadores de la
   * última pasada completa.
   */
  if (totalRegistros === 0) {
    console.log(`Núcleo: ${(gzNucleo.length / 1024 / 1024).toFixed(1)} MB · sin actas (pasada ligera)`);
    console.log('Se actualiza solo el núcleo; el detalle de jugadores se conserva.\n');
    subeConLaCli(nucleoGz, 'nucleo.json.gz');
    console.log('\nPublicado (ligero). Resultados y cuotas al día; jugadores intactos.');
    return;
  }

  const gzDetalle = zlib.gzipSync(Buffer.from(JSON.stringify(detalle)), { level: 9 });
  const detalleGz = path.join(RAIZ, 'src', 'datos', 'detalle.json.gz');
  fs.writeFileSync(detalleGz, gzDetalle);
  console.log(`Núcleo:     ${(gzNucleo.length / 1024 / 1024).toFixed(1)} MB · Detalle: ${(gzDetalle.length / 1024 / 1024).toFixed(1)} MB`);
  console.log('');

  subeConLaCli(archivoGz, 'importado.json.gz');
  subeConLaCli(nucleoGz, 'nucleo.json.gz');
  subeConLaCli(detalleGz, 'detalle.json.gz');

  console.log('\nPublicado. Los usuarios recibirán la versión nueva en su próxima visita.');
}

main().catch((e) => {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
});
