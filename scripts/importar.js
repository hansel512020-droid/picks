#!/usr/bin/env node
'use strict';
/* ==========================================================================
   Scout Picks · importar.js
   Descarga datos REALES y deja la app funcionando con ellos.

   Uso:
     node scripts/importar.js --listar
     node scripts/importar.js --liga premier
     node scripts/importar.js --liga premier --temporadas 2024-25,2025-26
     node scripts/importar.js --liga laliga --jugadores 60
     node scripts/importar.js --liga champions            (necesita clave)

   Fuentes:
     · Football-Data.co.uk  gratis y sin clave. Resultados, tiros, corners,
       faltas, tarjetas, arbitro y cuotas reales de hasta 8 casas.
     · API-Football         opcional, con APIFOOTBALL_KEY en .env. Anade
       jugadores, sus estadisticas partido a partido, alineaciones y bajas.

   Salida: src/datos/importado.json  (la app lo usa si tiene algo dentro).
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');

const { Cliente, claveDelEntorno } = require('./lib/apifootball');
const construir = require('./lib/construir');
const espn = require('./lib/espn');
const fd = require('./lib/footballdata');
const { IMPORTABLES, SIN_CLAVE, fuentesDe, temporadaActual } = require('./lib/mapa-ligas');

const RAIZ = path.join(__dirname, '..');
const DIR_CACHE = path.join(RAIZ, '.cache-datos');
const SALIDA = path.join(RAIZ, 'src', 'datos', 'importado.json');

/*
 * Los valores por defecto de una linea de jugador y de las estadisticas de un
 * equipo en un partido. Todo lo que valga esto no se escribe: la app lo repone
 * al leer (`completaRegistro` y `completaPartido` en src/datos/importado.ts).
 *
 * No es un capricho de tamaño. ESPN no publica pases clave, regates, entradas,
 * intercepciones ni duelos, asi que en cada linea van quince ceros seguidos; en
 * cincuenta mil lineas eso son treinta megas de nada dentro de la app.
 */
const REGISTRO_VACIO = {
  minutos: 0, titular: false, goles: 0, asistencias: 0, remates: 0, rematesPuerta: 0,
  rematesFuera: 0, rematesBloqueados: 0, pasesClave: 0, regates: 0, regatesIntentados: 0,
  faltasCometidas: 0, faltasRecibidas: 0, entradas: 0, intercepciones: 0, despejes: 0,
  duelosGanados: 0, duelosTotales: 0, toquesArea: 0, toques: 0, pases: 0, pasesCompletados: 0,
  centros: 0, centrosCompletados: 0, amarillas: 0, rojas: 0, paradas: 0, golesEncajados: 0,
  xg: 0, xa: 0, nota: 6.2,
};

const ESTADISTICAS_VACIAS = {
  remates: 0, rematesPuerta: 0, posesion: 0, corners: 0, faltas: 0,
  amarillas: 0, rojas: 0, fueraJuego: 0, xg: 0, pases: 0, precisionPases: 0,
};

/** Quita de un objeto los campos que valen lo mismo que el valor por defecto. */
function sinRelleno(objeto, porDefecto) {
  if (!objeto) return objeto;
  const salida = {};
  for (const [clave, valor] of Object.entries(objeto)) {
    if (clave in porDefecto && valor === porDefecto[clave]) continue;
    salida[clave] = valor;
  }
  return salida;
}

/*
 * Cerrojo. Dos importaciones a la vez se pisan el archivo: la segunda lee lo
 * que la primera dejo a medias y al guardar borra su trabajo. Pasa de verdad,
 * porque la tarea programada puede saltar mientras alguien importa a mano.
 *
 * El cerrojo caduca a las dos horas por si un proceso murio sin soltarlo.
 */
const CERROJO = path.join(RAIZ, '.cache-datos', 'importando.lock');
const CADUCA = 2 * 3600 * 1000;

function tomaElCerrojo() {
  fs.mkdirSync(path.dirname(CERROJO), { recursive: true });
  if (fs.existsSync(CERROJO)) {
    const edad = Date.now() - fs.statSync(CERROJO).mtimeMs;
    if (edad < CADUCA) {
      const quien = fs.readFileSync(CERROJO, 'utf8').trim();
      console.error(
        `Ya hay una importación en marcha (${quien}, hace ${Math.round(edad / 60000)} min).\n` +
          'Espera a que termine o borra .cache-datos/importando.lock si sabes que murió.',
      );
      return false;
    }
    console.log('Se encontró un cerrojo caducado; se ignora.');
  }
  fs.writeFileSync(CERROJO, `pid ${process.pid} · ${new Date().toISOString()}`);
  const suelta = () => {
    try {
      fs.unlinkSync(CERROJO);
    } catch {
      /* ya no estaba */
    }
  };
  process.on('exit', suelta);
  process.on('SIGINT', () => {
    suelta();
    process.exit(130);
  });
  return true;
}

/** Deja el archivo listo para escribir: sin ceros y sin objetos vacios. */
function adelgaza(acumulado) {
  for (const c of Object.values(acumulado.competiciones ?? {})) {
    c.registros = (c.registros ?? []).map((r) => sinRelleno(r, REGISTRO_VACIO));
    for (const p of c.partidos ?? []) {
      if (!p.estadisticas) continue;
      p.estadisticas.local = sinRelleno(p.estadisticas.local, ESTADISTICAS_VACIAS);
      p.estadisticas.visitante = sinRelleno(p.estadisticas.visitante, ESTADISTICAS_VACIAS);
    }
  }
  return acumulado;
}

// El catalogo de la app vive en TypeScript; aqui solo hace falta el nombre y
// la bandera, asi que se leen del fichero con una expresion regular.
function catalogoDeLaApp() {
  const texto = fs.readFileSync(path.join(RAIZ, 'src', 'datos', 'competiciones.ts'), 'utf8');
  const mapa = {};
  const filas = texto.matchAll(
    /\['([a-z0-9]+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)'/g,
  );
  for (const f of filas) {
    mapa[f[1]] = { id: f[1], nombre: f[2], corto: f[3], pais: f[4], bandera: f[5] };
  }
  return mapa;
}

/**
 * Las ligas grandes: las que de verdad se siguen. Es el preajuste que usa
 *  y deja fuera las divisiones menores.
 */
const IMPORTANTES = [
  // Ligas grandes.
  'premier', 'laliga', 'seriea', 'bundesliga', 'ligue1', 'championship',
  'eredivisie', 'portugal', 'turquia', 'belgica', 'escocia', 'grecia',
  'ligamx', 'brasileirao', 'argentina', 'mls', 'japon',
  // Continentales.
  'champions', 'europaleague', 'conference', 'libertadores', 'sudamericana',
  'concachampions',
  // Copas nacionales.
  'copadelrey', 'facup', 'carabao', 'coppa', 'dfbpokal', 'coupefrance',
  // Sudamerica.
  'colombia', 'chile', 'peru', 'bolivia', 'ecuador', 'uruguay', 'paraguay',
];

function argumentos() {
  const a = process.argv.slice(2);
  const o = {
    ligas: [],
    temporadas: null,
    jugadores: 55,
    forzar: false,
    // Refresco diario: rebaja el calendario y las cuotas, pero deja en cache
    // el detalle de los partidos ya jugados, que no cambia.
    refrescar: false,
    listar: false,
    estadisticas: false,
    // Cuantos partidos jugados se guardan por competicion.
    partidos: 200,
    // De cuantos se bajan estadisticas y jugadores desde ESPN.
    detalles: 90,
  };
  for (let i = 0; i < a.length; i++) {
    // Todas las que se pueden bajar sin clave, de una sola vez.
    if (a[i] === '--todas') o.ligas = [...SIN_CLAVE];
    else if (a[i] === '--liga' || a[i] === '--ligas') o.ligas = a[++i].split(',').map((s) => s.trim());
    else if (a[i] === '--temporadas') o.temporadas = a[++i].split(',').map((s) => s.trim());
    else if (a[i] === '--jugadores') o.jugadores = Number(a[++i]) || 0;
    else if (a[i] === '--forzar') o.forzar = true;
    else if (a[i] === '--refrescar') { o.refrescar = true; if (!o.ligas.length) o.ligas = [...IMPORTANTES]; }
    else if (a[i] === '--listar') o.listar = true;
    else if (a[i] === '--estadisticas') o.estadisticas = true;
    else if (a[i] === '--partidos') o.partidos = Number(a[++i]) || 320;
    else if (a[i] === '--detalles') o.detalles = Number(a[++i]) || 0;
    else if (a[i] === '--importantes') o.ligas = [...IMPORTANTES];
  }
  return o;
}

function temporadasPorDefecto() {
  const actual = temporadaActual();
  const anio = Number(actual.split('-')[0]);
  const fmt = (a) => `${a}-${String((a + 1) % 100).padStart(2, '0')}`;
  return [fmt(anio - 1), actual];
}

/** Convierte los fixtures de API-Football a la forma que espera el constructor. */
function desdeAPIFootball(fixtures) {
  const historial = [];
  const proximos = [];
  for (const f of fixtures) {
    const terminado = ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short);
    const comun = {
      fecha: f.fixture.date,
      local: f.teams.home.name,
      visitante: f.teams.away.name,
      arbitro: f.fixture.referee || undefined,
      cuotas: {},
    };
    if (terminado) {
      historial.push({
        ...comun,
        golesLocal: f.goals.home ?? 0,
        golesVisitante: f.goals.away ?? 0,
        golesLocalDescanso: f.score?.halftime?.home ?? 0,
        golesVisitanteDescanso: f.score?.halftime?.away ?? 0,
        estadisticas: { local: {}, visitante: {} },
        idAPI: f.fixture.id,
      });
    } else {
      proximos.push({ ...comun, idAPI: f.fixture.id });
    }
  }
  return { historial, proximos };
}

/** Mete las estadisticas de /fixtures/statistics en el partido correspondiente. */
function aplicaEstadisticas(partido, respuesta) {
  const valor = (bloque, tipo) => {
    const v = bloque?.statistics?.find((s) => s.type === tipo)?.value;
    if (v === null || v === undefined) return 0;
    return Number(String(v).replace('%', '')) || 0;
  };
  const [local, visitante] = respuesta;
  const lado = (bloque) => ({
    remates: valor(bloque, 'Total Shots'),
    rematesPuerta: valor(bloque, 'Shots on Goal'),
    corners: valor(bloque, 'Corner Kicks'),
    faltas: valor(bloque, 'Fouls'),
    amarillas: valor(bloque, 'Yellow Cards'),
    rojas: valor(bloque, 'Red Cards'),
  });
  partido.estadisticas = { local: lado(local), visitante: lado(visitante) };
}

async function importaCompeticion(id, opciones, catalogo, clave) {
  const fuentes = fuentesDe(id);
  const meta = catalogo[id];
  if (!fuentes || !meta) throw new Error(`La competicion "${id}" no se puede importar.`);

  const temporadas = opciones.temporadas ?? temporadasPorDefecto();
  const dirCache = path.join(DIR_CACHE, id);
  const aviso = [];
  let historial = [];
  let proximos = [];
  let cliente = null;
  let fixturesAPI = [];

  // ---------------------------------------- 1. ESPN: calendario y resultados
  // Es la unica fuente gratuita que cubre copas y competiciones continentales,
  // y la unica que trae el calendario completo de lo que viene y el en vivo.
  const slugEspn = espn.LIGAS[id];
  let detallesEspn = [];

  if (slugEspn) {
    const desde = new Date(Date.now() - 400 * 86400000);
    const hasta = new Date(Date.now() + 120 * 86400000);
    process.stdout.write(`  ESPN (${slugEspn})… `);
    const calendario = await espn.calendario(slugEspn, desde, hasta, dirCache, opciones.forzar || opciones.refrescar);
    const convertido = construir.desdeEspn(calendario);
    historial = convertido.historial;
    proximos = convertido.proximos;
    const vivos = calendario.filter((p) => p.estado === 'en_curso' || p.estado === 'descanso').length;
    console.log(
      `${historial.length} jugados, ${proximos.length} por jugar` + (vivos ? `, ${vivos} en vivo` : ''),
    );

    // Cuotas reales de los partidos que aun no se han jugado. Son las que
    // publican las casas con las que trabaja ESPN, en formato americano, y se
    // convierten a decimal. Solo se piden los pendientes, que son pocos.
    if (proximos.length) {
      process.stdout.write(`  ESPN (cuotas de ${proximos.length} partidos)… `);
      let conCuotas = 0;
      for (const p of proximos) {
        const q = await espn.cuotas(slugEspn, p.idEspn, dirCache, opciones.forzar || opciones.refrescar);
        if (q) {
          p.cuotas = q;
          conCuotas++;
        }
      }
      console.log(`${conCuotas} con precios reales`);

      /*
       * Y encima de eso, las cuotas de Football-Data.
       *
       * ESPN publica el precio de su proveedor, que es DraftKings: una casa
       * estadounidense que no le sirve de mucho a quien apuesta en Europa, y
       * que ademas solo cubre una parte de los partidos. Football-Data publica
       * bet365, Pinnacle, William Hill, Betfair, Bwin y 1xBet de las ligas
       * europeas, que son las que de verdad importan aqui.
       *
       * Antes esta fuente solo se leia cuando la competicion no estaba en ESPN,
       * asi que en Premier, LaLiga, Serie A y compania no se llegaba a mirar
       * nunca. Ahora ESPN pone el calendario y Football-Data anade sus precios
       * encima, que es lo que cada una hace mejor.
       */
      if (fuentes.fd) {
        process.stdout.write('  Football-Data (cuotas de casas europeas)… ');
        try {
          const deFD = await fd.proximos(fuentes, dirCache, opciones.forzar || opciones.refrescar);
          const clave = (n) =>
            (n || '')
              .toLowerCase()
              .normalize('NFD')
              .replace(/[̀-ͯ]/g, '')
              .replace(/[^a-z0-9]/g, '');

          let pegadas = 0;
          for (const p of proximos) {
            /*
             * Se casa por pareja de equipos y fecha cercana. Football-Data
             * abrevia y no siempre por delante: escribe "Vallecano" donde ESPN
             * pone "Rayo Vallecano", y "Ath Bilbao" donde pone "Athletic Club".
             * Comparar por prefijo dejaba fuera media LaLiga, asi que se mira
             * si uno contiene al otro. Con los dos equipos y la fecha cuadrando
             * a la vez, un falso positivo es practicamente imposible.
             */
            const encaje = deFD.find((f) => {
              const dias = Math.abs(new Date(f.fecha) - new Date(p.fecha)) / 86400000;
              if (dias > 2) return false;
              const casan = (x, y) => {
                const [a, b] = [clave(x), clave(y)];
                if (!a || !b) return false;
                // Con menos de cuatro letras "contiene" empareja cualquier cosa.
                const corto = Math.min(a.length, b.length);
                return corto >= 4 && (a.includes(b) || b.includes(a));
              };
              return casan(f.local, p.local) && casan(f.visitante, p.visitante);
            });
            if (!encaje?.cuotas?.porCasa) continue;

            // Las de Football-Data mandan sobre las de ESPN: son las casas con
            // las que el usuario va a apostar de verdad.
            p.cuotas = {
              ...(p.cuotas ?? {}),
              ...encaje.cuotas,
              porCasa: { ...(p.cuotas?.porCasa ?? {}), ...encaje.cuotas.porCasa },
            };
            pegadas++;
          }
          console.log(`${pegadas} partidos con bet365 y compañía`);
        } catch {
          console.log('no disponible');
        }
      }

      if (!conCuotas) {
        aviso.push('Ninguna casa publica todavía precios para estos partidos.');
      }
    }

    // El detalle (estadisticas y jugadores) cuesta una peticion por partido,
    // asi que solo se piden los mas recientes: el modelo mira los ultimos 10.
    const recientes = historial.slice(-opciones.detalles);
    if (recientes.length) {
      process.stdout.write(`  ESPN (detalle de ${recientes.length} partidos)… `);
      let hechos = 0;
      for (const p of recientes) {
        const d = await espn.detalle(slugEspn, p.idEspn, dirCache, opciones.forzar);
        if (d) {
          detallesEspn.push({ idEspn: p.idEspn, detalle: d });
          hechos++;
        }
      }
      console.log(`${hechos} con estadísticas`);
    }
  }

  // ------------------------------------------------ 2. resultados y cuotas
  if (fuentes.fd && !slugEspn) {
    process.stdout.write(`  Football-Data (${fuentes.fd})… `);
    historial = await fd.historial(fuentes, temporadas, dirCache, opciones.forzar);
    try {
      proximos = await fd.proximos(fuentes, dirCache, opciones.forzar);
    } catch {
      aviso.push('No se pudo leer el archivo de próximos partidos.');
    }
    console.log(`${historial.length} jugados, ${proximos.length} por jugar`);
  }

  if (clave) {
    cliente = new Cliente(clave, path.join(dirCache, 'api'), opciones.jugadores + 6);
  }

  // Football-Data solo publica el calendario un par de dias antes de cada
  // jornada, asi que entre semana su archivo de proximos esta caducado. Si hay
  // clave, el calendario lo pone API-Football, que lo tiene entero.
  if (cliente && fuentes.fd && fuentes.af) {
    const anio = Number(temporadas[temporadas.length - 1].split('-')[0]);
    process.stdout.write('  API-Football (calendario)… ');
    fixturesAPI = await cliente.fixtures(fuentes.af, anio);
    const pendientes = desdeAPIFootball(fixturesAPI).proximos;
    if (cliente.ultimoRechazo) {
      console.log('no disponible');
      aviso.push(`API-Football rechazó el calendario: ${cliente.ultimoRechazo}`);
      cliente.agotado = false;
      cliente.ultimoRechazo = null;
    } else if (pendientes.length) {
      // Se conservan las cuotas de Football-Data cuando coinciden los equipos.
      const conCuotas = pendientes.map((p) => {
        const gemelo = proximos.find(
          (q) =>
            construir.parecido(q.local, p.local) >= 0.62 &&
            construir.parecido(q.visitante, p.visitante) >= 0.62,
        );
        return gemelo ? { ...p, cuotas: gemelo.cuotas } : p;
      });
      proximos = conCuotas;
      console.log(`${proximos.length} partidos por jugar`);
    } else {
      console.log('sin partidos pendientes');
    }
  }

  // Sin ESPN ni Football-Data, la unica fuente posible es API-Football.
  if (!fuentes.fd && !slugEspn) {
    if (!cliente) {
      throw new Error(
        `"${id}" no está ni en ESPN ni en Football-Data, y no hay clave de API-Football.`,
      );
    }
    process.stdout.write('  API-Football (partidos)… ');
    const anio = Number(temporadas[temporadas.length - 1].split('-')[0]);
    fixturesAPI = await cliente.fixtures(fuentes.af, anio);
    const convertido = desdeAPIFootball(fixturesAPI);
    historial = convertido.historial;
    proximos = convertido.proximos;
    console.log(`${historial.length} jugados, ${proximos.length} por jugar`);
    if (!opciones.estadisticas) {
      aviso.push(
        'Sin --estadisticas no hay tiros, córners ni tarjetas: solo funcionan los mercados de goles y resultado.',
      );
    }
  }

  if (!historial.length) {
    throw new Error(`No se descargó ningún partido de "${id}". Prueba con otras temporadas.`);
  }

  // Las ligas del formato "nuevo" traen todas las temporadas de su historia:
  // seis mil partidos por liga no caben en una app y tampoco sirven, porque el
  // modelo mira los ultimos diez. Se recortan a las dos ultimas temporadas.
  const DIAS = 86400000;
  const corte = Date.now() - 800 * DIAS;
  const recortado = historial.filter((p) => new Date(p.fecha).getTime() >= corte);
  if (recortado.length >= 40) historial = recortado;

  // ------------------------------------------------------- 2. equipos y partidos
  // Solo entran los equipos que han jugado en la temporada en curso: si no,
  // la liga se llena de descendidos de hace dos anos.
  const recientes = new Set();
  const corteEquipos = Date.now() - 400 * DIAS;
  for (const p of historial) {
    if (new Date(p.fecha).getTime() >= corteEquipos) {
      recientes.add(p.local);
      recientes.add(p.visitante);
    }
  }
  for (const p of proximos) {
    recientes.add(p.local);
    recientes.add(p.visitante);
  }

  const equipos = construir
    .equiposDelHistorial(id, historial, meta.bandera)
    .filter((e) => !recientes.size || recientes.has(e.nombre));
  let partidos = construir.partidosDeHistorial(id, historial, proximos, equipos);

  // Las estadisticas y las lineas de cada jugador que bajo ESPN se pegan a su
  // partido. De aqui salen los props y los mercados de tiros y corners.
  let jugadoresEspn = [];
  let registrosEspn = [];
  if (detallesEspn.length) {
    const porEspn = new Map(partidos.filter((p) => p.idEspn).map((p) => [p.idEspn, p]));
    for (const { idEspn, detalle } of detallesEspn) {
      const partido = porEspn.get(idEspn);
      if (!partido) continue;
      const salida = construir.aplicaDetalleEspn(partido, detalle, equipos, id);
      registrosEspn.push(...salida.registros);
      jugadoresEspn.push(...salida.jugadores);
    }
    // Un jugador sale en varios partidos: se queda una ficha por jugador.
    jugadoresEspn = [...new Map(jugadoresEspn.map((j) => [j.id, j])).values()];
  }

  // El modelo mira los ultimos diez o veinte partidos de cada equipo, asi que
  // guardar tres temporadas enteras solo engorda la app. Se queda con los mas
  // recientes y con todos los que aun no se han jugado.
  const tope = opciones.partidos;
  if (partidos.length > tope) {
    const jugados = partidos.filter((p) => p.estado === 'finalizado').slice(-tope);
    const abiertosTodos = partidos.filter((p) => p.estado !== 'finalizado');
    partidos = [...jugados, ...abiertosTodos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }
  const abiertos = partidos.filter((p) => p.estado !== 'finalizado').length;
  console.log(`  ${equipos.length} equipos · ${partidos.length} partidos · ${abiertos} por jugar`);

  if (!abiertos) {
    aviso.push(
      'No hay ningún partido por jugar, así que la app no podrá generar picks de esta competición. Suele pasar entre temporadas: vuelve a importar cuando se publique el calendario, o prueba con una liga que ya esté en marcha.',
    );
  }

  // --------------------------------------- 3. estadisticas de partido por API
  if (cliente && opciones.estadisticas && !fuentes.fd) {
    const recientes = historial.slice(-opciones.jugadores).filter((p) => p.idAPI);
    process.stdout.write(`  API-Football (estadísticas de ${recientes.length} partidos)… `);
    let hechos = 0;
    for (const p of recientes) {
      const r = await cliente.pide('/fixtures/statistics', { fixture: p.idAPI });
      if (!r) break;
      if (r.response?.length === 2) {
        const destino = partidos.find(
          (x) => Math.abs(new Date(x.fecha) - new Date(p.fecha)) < 6e5,
        );
        if (destino) {
          aplicaEstadisticas(destino, r.response);
          hechos++;
        }
      }
    }
    console.log(`${hechos} completados`);
  }

  // -------------------------------------------------- 4. jugadores y registros
  // Los partidos ya jugados no necesitan el desglose de las diez casas: nadie
  // apuesta un partido terminado. Guardar solo el 1X2 de resumen recorta el
  // archivo casi a la mitad y no quita nada que la app enseñe.
  for (const p of partidos) {
    if (p.estado === 'finalizado' && p.cuotas) p.cuotas.porCasa = {};
  }

  // Lo que trajo ESPN es la base; API-Football, si hay clave, lo amplia.
  let jugadores = jugadoresEspn.map((j) => ({ ...j, bandera: meta.bandera }));
  let registros = registrosEspn;
  if (registros.length) {
    console.log(`  ${jugadores.length} jugadores · ${registros.length} registros (ESPN)`);
  }

  if (cliente && opciones.jugadores > 0) {
    const anio = Number(temporadas[temporadas.length - 1].split('-')[0]);
    if (!fixturesAPI.length) {
      process.stdout.write('  API-Football (calendario)… ');
      fixturesAPI = await cliente.fixtures(fuentes.af, anio);
      console.log(`${fixturesAPI.length} partidos`);
    }

    // De los mas recientes hacia atras: la app mira los ultimos 10 de cada uno.
    const terminados = fixturesAPI
      .filter((f) => ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short))
      .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date))
      .slice(0, opciones.jugadores);

    process.stdout.write(`  API-Football (jugadores de ${terminados.length} partidos)… `);
    const normalizado = [];
    for (const f of terminados) {
      const equiposAPI = await cliente.jugadoresDePartido(f.fixture.id);
      if (!equiposAPI.length) {
        if (cliente.agotado) break;
        continue;
      }
      // El constructor necesita la fecha y los dos equipos junto a las lineas.
      normalizado.push({ fixture: { ...f.fixture, teams: f.teams }, equiposAPI });
    }
    console.log(`${normalizado.length} descargados`);

    const armado = construir.jugadoresDeAPI(id, normalizado, equipos, partidos, meta.bandera);
    jugadores = armado.jugadores;
    registros = armado.registros;
    console.log(`  ${jugadores.length} jugadores · ${registros.length} registros`);

    const r = cliente.resumen();
    console.log(`  Peticiones: ${r.nuevas} nuevas, ${r.cache} de caché${r.agotado ? ' (presupuesto agotado)' : ''}`);
    if (r.agotado) {
      aviso.push(
        'Se acabó el presupuesto de peticiones. Vuelve a lanzarlo mañana y seguirá donde lo dejó: lo ya descargado queda en caché.',
      );
    }
  } else if (!clave && !registros.length) {
    aviso.push(
      'Sin APIFOOTBALL_KEY no hay estadísticas por jugador, así que solo salen picks de equipo y de partido.',
    );
  }

  return {
    competicionId: id,
    nombre: meta.nombre,
    temporadas,
    importadoEn: new Date().toISOString(),
    fuentes: [fuentes.fd ? 'Football-Data.co.uk' : null, cliente ? 'API-Football' : null].filter(Boolean),
    equipos,
    partidos,
    jugadores,
    registros,
    aviso,
  };
}

async function main() {
  const o = argumentos();
  const catalogo = catalogoDeLaApp();

  if (o.listar || !o.ligas.length) {
    console.log('\nCompeticiones importables:\n');
    console.log('  Sin clave (Football-Data: resultados, estadísticas y cuotas reales)');
    console.log(`    ${SIN_CLAVE.join(', ')}\n`);
    console.log('  Solo con APIFOOTBALL_KEY en .env');
    console.log(`    ${IMPORTABLES.filter((x) => !SIN_CLAVE.includes(x)).join(', ')}\n`);
    console.log('  Ejemplo:  node scripts/importar.js --liga premier\n');
    return;
  }

  // Solo listar no toca el archivo; a partir de aqui si, asi que hace falta
  // tener el cerrojo antes de descargar nada.
  if (!tomaElCerrojo()) {
    process.exitCode = 1;
    return;
  }

  const clave = claveDelEntorno(path.join(RAIZ, '.env'));
  console.log(
    clave
      ? '\nClave de API-Football encontrada: se importarán también los jugadores.\n'
      : '\nSin clave de API-Football: se importan equipos, partidos y cuotas reales.\n',
  );

  // Lo ya importado se conserva: asi se pueden ir sumando competiciones.
  let acumulado = { competiciones: {} };
  if (fs.existsSync(SALIDA)) {
    try {
      acumulado = JSON.parse(fs.readFileSync(SALIDA, 'utf8'));
      if (!acumulado.competiciones) acumulado = { competiciones: {} };
    } catch {
      acumulado = { competiciones: {} };
    }
  }

  for (const id of o.ligas) {
    console.log(`${catalogo[id]?.nombre ?? id}`);
    try {
      acumulado.competiciones[id] = await importaCompeticion(id, o, catalogo, clave);
    } catch (e) {
      console.error(`  ✗ ${e.message}\n`);
      continue;
    }
    for (const a of acumulado.competiciones[id].aviso) console.log(`  · ${a}`);

    // Se guarda al terminar cada competicion: una importacion larga que se
    // corte a la mitad deja aprovechable todo lo que ya bajo.
    acumulado.actualizado = new Date().toISOString();
    fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
    fs.writeFileSync(SALIDA, JSON.stringify(adelgaza(acumulado)));
    console.log('');
  }

  acumulado.actualizado = new Date().toISOString();
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(SALIDA, JSON.stringify(adelgaza(acumulado)));

  const total = Object.keys(acumulado.competiciones).length;
  const tamano = (fs.statSync(SALIDA).size / 1024 / 1024).toFixed(2);
  console.log(`Guardado en src/datos/importado.json · ${total} competiciones · ${tamano} MB`);
  console.log('Reinicia la app para verlas con datos reales.\n');
}

main().catch((e) => {
  console.error(`\nError: ${e.message}\n`);
  process.exit(1);
});
