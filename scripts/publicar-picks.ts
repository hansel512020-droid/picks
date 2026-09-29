/* ============================================================================
   Cocina los picks y los deja en la base de datos, uno por fila.

   ── Por qué existe ─────────────────────────────────────────────────────────

   Hasta ahora los picks se calculaban en el teléfono a partir del archivo de
   datos, y ese archivo se le entrega a cualquiera que tenga cuenta. O sea que
   el muro de pago tapaba la pantalla, no el dato: con el archivo y el código
   —que es público— cualquiera reproduce los picks de todas las ligas sin pagar
   una.

   Aquí se calculan una sola vez, donde nadie mira, y se guardan en una tabla
   con un permiso que mira la tabla `derechos`: cada usuario recibe el pick
   gratis del día y los de las ligas que haya comprado. Lo que no es suyo no
   sale del servidor, así que no hay nada que tapar.

   De paso, la app deja de bajarse 8 MB y de analizar cien partidos para pintar
   la portada: pide una lista hecha.

   ── Quién lo ejecuta ───────────────────────────────────────────────────────

   El mismo que acaba de importar: el PC cuando está encendido y GitHub cuando
   no. Va detrás de `publicar-datos.js` en los dos sitios.

   ── Uso ────────────────────────────────────────────────────────────────────

     node --max-old-space-size=4096 node_modules/.cache/publicar-picks.cjs
     ... --simular      calcula y cuenta, pero no sube nada
     ... --dias 14      cuántos días por delante se cocinan (por defecto 10)

   Se compila antes con esbuild, como el backtest: el motor es TypeScript y
   vive en src/, que es de la app.
   ========================================================================== */

import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { aplicaDatos, competicionesImportadas } from '../src/datos/importado';
import { temporada } from '../src/datos/motor';
import { partidosAbiertos, pickDelDia, picksDePartido } from '../src/datos/picks';
import type { Pick } from '../src/datos/tipos';

const args = process.argv.slice(2);
const opcion = (nombre: string) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const SIMULAR = args.includes('--simular');
const DIAS = Number(opcion('dias') ?? 10);
const ARCHIVO = opcion('archivo') ?? 'src/datos/importado.json';

/*
 * La casa con la que se tarifica.
 *
 * Antes cada usuario elegía la suya y los picks se recalculaban con su margen.
 * Ahora se cocinan una vez para todos, así que hay una y es la de en medio. No
 * cambia lo que se enseña: desde que los precios estimados no se publican, la
 * casa solo mueve el filtro de admisión, no nada que el usuario vea.
 */
const CASA = 'medio';

/** Lee el entorno o el .env.local, igual que respaldo.js. */
function deEnv(nombre: string): string | undefined {
  if (process.env[nombre]) return process.env[nombre];
  for (const archivo of ['.env.local', '.env']) {
    try {
      for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
        const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && m[1] === nombre) return m[2].trim().replace(/^["']|["']$/g, '');
      }
    } catch {
      /* no está, se sigue */
    }
  }
  return undefined;
}

interface Fila {
  id: string;
  competicion: string;
  partido_id: string;
  cuando: string;
  pro: boolean;
  gratis: boolean;
  datos: Pick;
  escaparate: Partial<Pick>;
}

/**
 * El mismo pick, vaciado: lo que se le manda a quien no ha pagado esa liga.
 *
 * Tiene que quedar lo justo para que la tarjeta con candado se pinte y se
 * entienda —de quién es, de qué partido, de qué competición— y no puede quedar
 * nada de lo que se vende: ni el mercado, ni la línea, ni el argumento, ni la
 * racha, ni la probabilidad. Se construye nombrando lo que se queda y no
 * borrando lo que se va: así, el día que el motor añada un campo nuevo, entra
 * cerrado por defecto en vez de colarse abierto.
 *
 * Los tres valores de relleno (mercado, cuota, casa) son para que el
 * componente no reciba huecos; con el candado puesto no se pintan.
 */
function vacia(p: Pick): Partial<Pick> {
  return {
    id: p.id,
    partidoId: p.partidoId,
    competicionId: p.competicionId,
    cuando: p.cuando,
    sujeto: p.sujeto,
    sujetoId: p.sujetoId,
    titulo: p.titulo,
    equipo: p.equipo,
    contexto: p.contexto,
    imagen: p.imagen,
    nombres: p.nombres,
    familia: p.familia,
    pro: true,
    mercado: '',
    cuota: 0,
    casa: p.casa,
    argumento: '',
  };
}

function cargaDatos(): void {
  const crudo = ARCHIVO.endsWith('.gz')
    ? gunzipSync(readFileSync(ARCHIVO)).toString('utf8')
    : readFileSync(ARCHIVO, 'utf8');
  aplicaDatos(JSON.parse(crudo));
}

/** Sube en tandas: una sola petición con treinta mil filas no la traga nadie. */
async function sube(url: string, clave: string, filas: Fila[]): Promise<void> {
  const TANDA = 500;
  for (let i = 0; i < filas.length; i += TANDA) {
    const trozo = filas.slice(i, i + TANDA);
    const r = await fetch(`${url}/rest/v1/picks`, {
      method: 'POST',
      headers: {
        apikey: clave,
        Authorization: `Bearer ${clave}`,
        'Content-Type': 'application/json',
        // Upsert: el mismo pick del mismo partido se pisa, no se duplica.
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(trozo),
    });
    if (!r.ok) {
      throw new Error(`No se pudieron subir los picks (HTTP ${r.status}): ${(await r.text()).slice(0, 300)}`);
    }
    process.stdout.write(`\r  subidos ${Math.min(i + TANDA, filas.length)} de ${filas.length}…`);
  }
  process.stdout.write('\n');
}

/**
 * Borra lo que ya no sirve: los picks de partidos que empezaron hace más de
 * tres horas. Si no, la tabla crece sin fin y la app tendría que filtrar por
 * fecha en cada consulta.
 */
async function limpia(url: string, clave: string): Promise<void> {
  const corte = new Date(Date.now() - 3 * 3600_000).toISOString();
  const r = await fetch(`${url}/rest/v1/picks?cuando=lt.${encodeURIComponent(corte)}`, {
    method: 'DELETE',
    headers: { apikey: clave, Authorization: `Bearer ${clave}`, Prefer: 'return=minimal' },
  });
  if (!r.ok) {
    console.log(`  (no se pudo limpiar lo viejo: HTTP ${r.status})`);
  }
}

async function main(): Promise<void> {
  cargaDatos();

  const url = deEnv('EXPO_PUBLIC_SUPABASE_URL')?.replace(/\/+$/, '');
  const clave = deEnv('SUPABASE_SECRET_KEY') ?? deEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!SIMULAR && (!url || !clave)) {
    console.log('Picks: falta EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY. No se suben.');
    console.log('  (con --simular se puede calcular sin subir nada)');
    return;
  }

  const hasta = Date.now() + DIAS * 86400000;
  const filas: Fila[] = [];
  const porCompeticion = new Map<string, number>();
  const t0 = Date.now();

  for (const comp of competicionesImportadas()) {
    if (comp === 'todas') continue;
    let partidos;
    try {
      partidos = partidosAbiertos(comp).filter((p) => Date.parse(p.fecha) <= hasta);
    } catch {
      continue;
    }
    let cuenta = 0;
    for (const partido of partidos) {
      /*
       * SIN derechos, a propósito.
       *
       * El motor marca `pro` comparando la liga del pick con lo que el usuario
       * tiene comprado, así que si aquí se le pasa el comodín "lo tiene todo"
       * —que fue lo primero que probé— sale TODO sin candado, y la tabla se
       * publica abierta de par en par. Medido antes de darme cuenta: 1.531
       * picks y los 1.531 visibles para una cuenta sin plan.
       *
       * Cocinando sin derechos, cada pick queda marcado como lo que es. Quién
       * ve cuál lo decide después el permiso de la tabla, con los derechos de
       * cada usuario.
       */
      for (const pick of picksDePartido(comp, partido.id, CASA)) {
        filas.push({
          id: pick.id,
          competicion: pick.competicionId,
          partido_id: pick.partidoId,
          cuando: pick.cuando ?? partido.fecha,
          pro: !!pick.pro,
          gratis: false,
          datos: pick,
          escaparate: vacia(pick),
        });
        cuenta++;
      }
    }
    if (cuenta) porCompeticion.set(comp, cuenta);
  }

  /*
   * El gratis del día, marcado en su fila. Se calcula igual que en la app
   * —mismo criterio, mismos datos— para que sea el mismo pick para todo el
   * mundo, con cuenta o sin ella.
   */
  const gratis = pickDelDia(CASA);
  if (gratis) {
    const fila = filas.find((f) => f.id === gratis.id);
    if (fila) fila.gratis = true;
    else {
      filas.push({
        id: gratis.id,
        competicion: gratis.competicionId,
        partido_id: gratis.partidoId,
        cuando: gratis.cuando ?? new Date().toISOString(),
        pro: !!gratis.pro,
        gratis: true,
        datos: gratis,
        escaparate: vacia(gratis),
      });
    }
  }

  const segundos = ((Date.now() - t0) / 1000).toFixed(1);
  const pesoMb = (JSON.stringify(filas).length / 1048576).toFixed(1);
  const conCandado = filas.filter((f) => f.pro && !f.gratis).length;
  console.log(
    `Picks cocinados: ${filas.length} de ${porCompeticion.size} competiciones · ` +
      `próximos ${DIAS} días · ${segundos} s · ${pesoMb} MB`,
  );
  /*
   * Cuántos llevan candado, dicho siempre.
   *
   * La primera versión los cocinó todos abiertos —le pasé al motor unos
   * derechos de "lo tiene todo"— y la tabla quedó publicada sin cerradura. Se
   * vio contando filas después; con esta línea se habría visto al momento.
   */
  console.log(
    `  Con candado: ${conCandado} de ${filas.length}` +
      (conCandado === 0 && filas.length > 0 ? '  ⚠ NINGUNO: la tabla quedaría abierta' : ''),
  );
  console.log(`  El gratis de hoy: ${gratis ? `${gratis.titulo} — ${gratis.mercado}` : '(ninguno)'}`);

  if (SIMULAR) {
    const top = [...porCompeticion.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    console.log('  Por competición: ' + top.map(([c, n]) => `${c} ${n}`).join(' · '));
    console.log('  (simulación: no se ha subido nada)');
    return;
  }

  await sube(url!, clave!, filas);
  await limpia(url!, clave!);
  console.log('Picks publicados.');
}

main().catch((e) => {
  // Que esto falle no puede tumbar el refresco: los datos ya están publicados.
  console.error(`Picks: ${e.message}`);
  process.exitCode = 0;
});
