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

async function main() {
  const serviceKey = clave();
  const supaUrl = url();
  if (!serviceKey) {
    console.error(
      'Falta SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Ponla en el entorno o en .env.local (nunca en .env, que se puede subir por error).\n',
    );
    process.exit(1);
  }
  if (!supaUrl) {
    console.error('Falta EXPO_PUBLIC_SUPABASE_URL en .env');
    process.exit(1);
  }

  if (!fs.existsSync(ARCHIVO)) {
    console.error('No existe ' + ARCHIVO + '. Ejecuta primero importar.js.');
    process.exit(1);
  }

  const crudo = fs.readFileSync(ARCHIVO);
  const comprimido = zlib.gzipSync(crudo, { level: 9 });

  console.log(`Original:   ${(crudo.length / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Comprimido: ${(comprimido.length / 1024 / 1024).toFixed(1)} MB`);
  console.log('');

  process.stdout.write('Subiendo importado.json.gz… ');
  await sube(supaUrl, serviceKey, 'importado.json.gz', comprimido, 'application/gzip');
  console.log('OK');

  console.log('\nPublicado. Los usuarios recibirán la versión nueva en su próxima visita.');
}

main().catch((e) => {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
});
