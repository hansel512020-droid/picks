/*
 * Diagnóstico: picks y clasificación de una competición, fuera de la app.
 *
 * Ejecuta el mismo motor que la app contra los datos ya importados, para poder
 * comprobar contra la fuente si una tabla o unos picks salen raros. Uso:
 *
 *   npx esbuild scripts/porque-sin-picks.ts --bundle --platform=node --format=cjs \
 *     --outfile=node_modules/.cache/porque.cjs && node node_modules/.cache/porque.cjs
 */

import { aplicaDatos } from '../src/datos/importado';
import { posicionesEnLiga, temporada } from '../src/datos/motor';
import { picksDePartido } from '../src/datos/picks';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const ARCHIVO = process.argv[2] ?? 'src/datos/importado.json';
const crudo = ARCHIVO.endsWith('.gz')
  ? gunzipSync(readFileSync(ARCHIVO)).toString('utf8')
  : readFileSync(ARCHIVO, 'utf8');
aplicaDatos(JSON.parse(crudo));

for (const comp of ['mls', 'premier', 'ecuador']) {
  const t = temporada(comp);
  const puestos = posicionesEnLiga(t, comp);
  const nombres = new Map(t.equipos.map((e) => [e.id, e.nombre]));

  // Partidos de la temporada que la app considera en curso, por equipo.
  const jugados = t.partidos.filter((p) => p.competicionId === comp && p.estado === 'finalizado');
  const años = [...new Set(jugados.map((p) => p.temporada).filter(Boolean))].sort();
  const ultima = años.at(-1);
  const deLaUltima = jugados.filter((p) => p.temporada === ultima);
  const pj = new Map<string, number>();
  for (const p of deLaUltima) {
    pj.set(p.localId, (pj.get(p.localId) ?? 0) + 1);
    pj.set(p.visitanteId, (pj.get(p.visitanteId) ?? 0) + 1);
  }

  const primeros = [...puestos.entries()].sort((a, b) => a[1] - b[1]).slice(0, 5);
  console.log(`\n=== ${comp} · temporadas en los datos: ${años.join(', ') || '(sin año)'} · en curso: ${ultima}`);
  for (const [equipoId, puesto] of primeros) {
    console.log(`  ${String(puesto).padStart(2)}. ${(nombres.get(equipoId) ?? equipoId).padEnd(26)} PJ ${pj.get(equipoId) ?? 0}`);
  }

  const proximos = t.partidos
    .filter((p) => p.competicionId === comp && p.estado === 'previa' && new Date(p.fecha).getTime() > Date.now())
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, 3);
  for (const p of proximos) {
    console.log(`  ${p.fecha.slice(0, 16)} ${p.id.padEnd(18)} -> ${picksDePartido(comp, p.id, 'medio').length} picks`);
  }
}
