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
/*
 * ── El reloj del publicado ──────────────────────────────────────────────────
 *
 * Publicar son unas 110 subidas, una llamada a la CLI por archivo. En un día
 * normal cada una tarda veintitantos segundos y el paso entero ronda los 40
 * minutos. La madrugada del 5 de octubre, con el PC ahogado de memoria (1,3 GB
 * libres de 7,7, casi todo Chrome), cada subida pasó a tardar DIECISIETE
 * MINUTOS: en trece horas y media solo había subido 46 archivos, le quedaban
 * otras diecisiete, y mientras tanto la tarea seguía marcada como "en marcha",
 * así que Windows rechazaba todas las pasadas siguientes.
 *
 * Es la misma avería de siempre —un paso sin final— en otro sitio. Dos relojes:
 *
 *  · Uno por archivo: si una sola subida pasa de 5 minutos, no es lentitud, es
 *    que se quedó colgada. Se corta esa y se sigue con las demás.
 *  · Uno para el paso entero: pasadas dos horas se deja lo que falte para la
 *    siguiente pasada. No se pierde nada, porque cada archivo se sube por su
 *    cuenta y lo ya subido se queda subido.
 */
const TOPE_POR_ARCHIVO = 5 * 60 * 1000;
const TOPE_DEL_PASO = 2 * 3600 * 1000;
const EMPEZO = Date.now();

class SeAcaboElTiempo extends Error {}

function quedaTiempo() {
  return Date.now() - EMPEZO < TOPE_DEL_PASO;
}

function subeConLaCli(archivoGz, nombreDestino = 'importado.json.gz') {
  if (!quedaTiempo()) {
    throw new SeAcaboElTiempo(
      `El publicado lleva ${Math.round((Date.now() - EMPEZO) / 60000)} min; se deja ` +
        `${nombreDestino} y lo que falte para la siguiente pasada.`,
    );
  }
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
      { cwd: RAIZ, encoding: 'utf8', shell: true, timeout: TOPE_POR_ARCHIVO },
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
  /*
   * Una subida que se pasa de los cinco minutos se corta y se deja estar. No
   * se tumba el publicado entero por ella: cada archivo va por su cuenta, y el
   * que falta hoy se sube en la pasada de dentro de seis horas. Lo que no
   * puede volver a pasar es quedarse esperando una sola subida durante horas
   * con la tarea bloqueada detrás.
   */
  if (subida.error?.code === 'ETIMEDOUT' || subida.signal) {
    console.log(`tardó más de ${TOPE_POR_ARCHIVO / 60000} min: se deja para la próxima pasada`);
    return;
  }

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
   * Cuánto pesaba lo publicado la vez anterior. Se mira AHORA, antes de
   * escribir nada encima: unas líneas más abajo se sobrescriben los dos
   * archivos y entonces ya no habría con qué comparar.
   */
  const pesoDe = (ruta) => (fs.existsSync(ruta) ? fs.statSync(ruta).size : 0);
  const pesabaAntes = {
    nucleo: pesoDe(path.join(RAIZ, 'src', 'datos', 'nucleo.json.gz')),
    detalle: pesoDe(path.join(RAIZ, 'src', 'datos', 'detalle.json.gz')),
  };

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
  /*
   * Quién publica. El PC (con SofaScore) y GitHub (solo ESPN) suben al mismo
   * sitio; datos.yml lee esta marca del núcleo publicado y, si el PC ha subido
   * hace poco, GitHub no pisa sus datos más completos.
   */
  const origen = process.env.GITHUB_ACTIONS === 'true' ? 'github' : 'pc';
  const nucleo = { ...datos, origen, competiciones: {} };
  const detalle = { actualizado: datos.actualizado, competiciones: {} };
  let totalRegistros = 0;
  for (const [id, c] of Object.entries(datos.competiciones ?? {})) {
    /*
     * El núcleo va SIN las estadísticas de cada partido.
     *
     * Lleva el calendario, los equipos y los marcadores, que son públicos y
     * están en cualquier web. Los remates, córners, tarjetas y posesión salen
     * aparte (`estadisticas/<liga>.json.gz`) porque son con lo que se rehacen
     * los picks de equipo: entregárselos a cualquiera con cuenta era dejar
     * abierta la puerta que acabamos de cerrar con los jugadores.
     */
    nucleo.competiciones[id] = {
      ...c,
      jugadores: [],
      registros: [],
      partidos: (c.partidos ?? []).map(({ estadisticas, ...resto }) => resto),
    };
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

  /*
   * Si lo que se va a publicar ha encogido de golpe, se dice.
   *
   * Los dos sustos de esta semana fueron silenciosos: una importación que no
   * trajo ninguna competición (se paró a tiempo por el guardia de arriba) y una
   * que trajo todo menos SofaScore, que pesa la mitad del detalle y no disparó
   * nada. El tamaño del archivo anterior está aquí mismo, en disco, y un
   * bajonazo del 25% es la forma más barata de enterarse de que falta algo.
   *
   * Solo avisa: no bloquea. Un archivo más pequeño puede ser legítimo —una
   * temporada que acaba, ligas que se quedan sin partidos—, y quien publica
   * decide mirándolo, no un umbral.
   */
  for (const [nombre, antes, ahora] of [
    ['el núcleo', pesabaAntes.nucleo, gzNucleo.length],
    ['el detalle', pesabaAntes.detalle, gzDetalle.length],
  ]) {
    if (antes > 0 && ahora < antes * 0.75) {
      const cuanto = Math.round((1 - ahora / antes) * 100);
      console.log(
        `⚠ OJO: ${nombre} pesa un ${cuanto}% menos que la última vez ` +
          `(${(antes / 1024 / 1024).toFixed(1)} MB → ${(ahora / 1024 / 1024).toFixed(1)} MB).`,
      );
      console.log('  Suele significar que una fuente no contestó. Mira el parte final del importador.');
    }
  }

  fs.writeFileSync(detalleGz, gzDetalle);
  console.log(`Núcleo:     ${(gzNucleo.length / 1024 / 1024).toFixed(1)} MB · Detalle: ${(gzDetalle.length / 1024 / 1024).toFixed(1)} MB`);
  console.log('');

  subeConLaCli(archivoGz, 'importado.json.gz');
  subeConLaCli(nucleoGz, 'nucleo.json.gz');
  subeConLaCli(detalleGz, 'detalle.json.gz');

  publicaDetallePorLiga(datos);
  publicaEstadisticasPorLiga(datos);

  console.log('\nPublicado. Los usuarios recibirán la versión nueva en su próxima visita.');
}

/**
 * Las estadísticas de cada partido, un archivo por competición.
 *
 * Remates, remates a puerta, córners, tarjetas, posesión y xG. Es lo que queda
 * del muro: con esto y el motor —que es público— se rehacen los picks de
 * equipo y de partido, que son el 31% del catálogo. Van aparte del núcleo para
 * poder entregárselas solo a quien ha comprado esa liga, igual que los
 * jugadores.
 *
 * Lo que SÍ sigue en el núcleo, abierto a cualquiera con cuenta: el
 * calendario, los equipos y los marcadores. Eso está en cualquier web de
 * resultados y cerrarlo solo serviría para que la app no funcionara.
 */
function publicaEstadisticasPorLiga(datos) {
  const dir = path.join(RAIZ, 'src', 'datos', 'estadisticas');
  fs.mkdirSync(dir, { recursive: true });

  let subidas = 0;
  let pesoTotal = 0;
  for (const [id, c] of Object.entries(datos.competiciones ?? {})) {
    const conDato = (c.partidos ?? []).filter((p) => p.estadisticas);
    if (!conDato.length) continue;
    const trozo = {
      actualizado: datos.actualizado,
      competiciones: {
        [id]: { partidos: conDato.map((p) => ({ id: p.id, estadisticas: p.estadisticas })) },
      },
    };
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(trozo)), { level: 9 });
    const ruta = path.join(dir, `${id}.json.gz`);
    fs.writeFileSync(ruta, gz);
    subeConLaCli(ruta, `estadisticas/${id}.json.gz`);
    subidas++;
    pesoTotal += gz.length;
  }
  console.log(
    `Estadísticas por liga: ${subidas} archivos · ${(pesoTotal / 1024 / 1024).toFixed(2)} MB en total`,
  );
}

/**
 * El detalle de jugadores, un archivo por competición.
 *
 * ── Por qué partirlo ───────────────────────────────────────────────────────
 *
 * Los jugadores y sus líneas partido a partido son la materia prima del 69% de
 * los picks: los de jugador. En un solo archivo, cualquiera con una cuenta
 * gratis se lo bajaba entero y, con el motor —que es público—, reconstruía
 * esos picks sin pagar. Era el agujero grande que quedaba después de cerrar
 * los picks.
 *
 * Partido por ligas, cada archivo se puede cerrar por separado: el permiso del
 * almacén mira los derechos del usuario y le deja bajar solo las ligas que ha
 * comprado. Quien no ha pagado nada no se baja ninguna, y quien pagó LaLiga se
 * baja LaLiga, que es exactamente lo que compró.
 *
 * El archivo entero se sigue subiendo mientras haya apps con la versión
 * anterior instalada; se retira en cuanto dejen de pedirlo.
 */
function publicaDetallePorLiga(datos) {
  const dir = path.join(RAIZ, 'src', 'datos', 'detalle');
  fs.mkdirSync(dir, { recursive: true });

  let subidas = 0;
  let pesoTotal = 0;
  for (const [id, c] of Object.entries(datos.competiciones ?? {})) {
    const registros = c.registros ?? [];
    // Una liga sin actas no tiene nada que cerrar ni que subir.
    if (!registros.length) continue;
    const trozo = {
      actualizado: datos.actualizado,
      competiciones: { [id]: { jugadores: c.jugadores ?? [], registros } },
    };
    const gz = zlib.gzipSync(Buffer.from(JSON.stringify(trozo)), { level: 9 });
    const ruta = path.join(dir, `${id}.json.gz`);
    fs.writeFileSync(ruta, gz);
    subeConLaCli(ruta, `detalle/${id}.json.gz`);
    subidas++;
    pesoTotal += gz.length;
  }
  console.log(
    `\nDetalle por liga: ${subidas} archivos · ${(pesoTotal / 1024 / 1024).toFixed(1)} MB en total` +
      ` (el mayor manda solo lo que cada usuario ha comprado)`,
  );
}

main().catch((e) => {
  /*
   * Quedarse sin tiempo no es un fallo: lo subido está subido y lo que falta
   * se sube en la siguiente pasada, dentro de seis horas. Se cuenta y se sale
   * con bien, para que el .cmd siga con los picks y el respaldo en vez de
   * dejar la pasada a medias por algo que se arregla solo.
   */
  if (e instanceof SeAcaboElTiempo) {
    console.log(`\n⏱ ${e.message}`);
    console.log('   Lo ya subido se queda; el resto va en la próxima pasada.');
    return;
  }
  console.error(`\nError: ${e.message}`);
  process.exit(1);
});
