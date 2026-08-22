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
function subeConLaCli(archivoGz) {
  const { spawnSync } = require('node:child_process');
  const destino = 'ss:///datos/importado.json.gz';
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

  process.stdout.write('Subiendo importado.json.gz… ');
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
  const comprimido = zlib.gzipSync(crudo, { level: 9 });
  // La CLI sube un archivo, no un montón de bytes, así que el comprimido se
  // deja junto al original. Está en .gitignore: es un resultado, no una fuente.
  const archivoGz = `${ARCHIVO}.gz`;
  fs.writeFileSync(archivoGz, comprimido);

  console.log(`Original:   ${(crudo.length / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Comprimido: ${(comprimido.length / 1024 / 1024).toFixed(1)} MB`);
  console.log('');

  subeConLaCli(archivoGz);

  console.log('\nPublicado. Los usuarios recibirán la versión nueva en su próxima visita.');
}

main().catch((e) => {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
});
