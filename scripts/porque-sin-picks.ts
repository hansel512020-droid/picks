/*
 * Diagnóstico: ¿por qué un partido no genera picks?
 *
 * Ejecuta el mismo motor que la app, fuera de ella, contra los datos ya
 * importados. Uso:
 *
 *   npx esbuild scripts/porque-sin-picks.ts --bundle --platform=node --format=cjs \
 *     --outfile=node_modules/.cache/porque.cjs && node node_modules/.cache/porque.cjs
 */

import { aplicaDatos } from '../src/datos/importado';
import { temporada } from '../src/datos/motor';
import { picksDePartido } from '../src/datos/picks';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const ARCHIVO = process.argv[2] ?? 'src/datos/importado.json';
const crudo = ARCHIVO.endsWith('.gz')
  ? gunzipSync(readFileSync(ARCHIVO)).toString('utf8')
  : readFileSync(ARCHIVO, 'utf8');
aplicaDatos(JSON.parse(crudo));

const COMP = 'mls';
const PARTIDO = 'mls-e761543';

const t = temporada(COMP);
const partido = t.partidos.find((p) => p.id === PARTIDO);
console.log('partido:', partido ? `${partido.id} · ${partido.fecha} · ${partido.estado}` : 'no está en estos datos');

if (partido) {
  const equipos = new Map(t.equipos.map((e) => [e.id, e]));
  for (const id of [partido.localId, partido.visitanteId]) {
    const eq = equipos.get(id);
    const suyos = t.partidos.filter(
      (p) =>
        (p.localId === id || p.visitanteId === id) &&
        p.estado === 'finalizado' &&
        p.fecha < partido.fecha,
    );
    console.log(`  ${eq?.nombre ?? id}: ${suyos.length} partidos previos jugados`);
  }
  console.log('casas con precios en este partido:', JSON.stringify(partido.cuotas).slice(0, 300));
  const casasDelPartido = Array.isArray(partido.cuotas)
    ? [...new Set(partido.cuotas.map((c: { casa?: string }) => c.casa).filter(Boolean))]
    : Object.keys(partido.cuotas ?? {});
  for (const casa of ['ajustado', 'medio', 'amplio', 'est', ...casasDelPartido] as string[]) {
    const picks = picksDePartido(COMP, PARTIDO, casa);
    console.log(`  casa "${casa}": ${picks.length} picks`);
    for (const p of picks.slice(0, 8)) {
      console.log(`    · [${p.familia}] ${p.titulo} — ${p.mercado} @${p.cuota}${p.pro ? ' (PRO)' : ''}`);
    }
  }
}

for (const comp of [COMP, 'ecuador', 'premier']) {
  const tt = temporada(comp);
  const proximos = tt.partidos
    .filter((p) => p.estado === 'previa' && new Date(p.fecha).getTime() > Date.now())
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 5);
  console.log(`\n${comp}: próximos partidos y picks de cada uno`);
  for (const p of proximos) {
    console.log(`  ${p.fecha.slice(0, 16)} ${p.id.padEnd(18)} -> ${picksDePartido(comp, p.id, 'est').length}`);
  }
}
