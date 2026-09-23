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
     node scripts/importar.js --liga premier --sofascore-partidos 200
     node scripts/importar.js --liga premier --sin-sofascore
     node scripts/importar.js --liga premier --sin-sofascore-red   (solo el archivo local, sin red)
     node scripts/importar.js --liga premier --sofascore-pausa-min 5000 --sofascore-pausa-max 12000

   Fuentes:
     · Football-Data.co.uk  gratis y sin clave. Resultados, tiros, corners,
       faltas, tarjetas, arbitro y cuotas reales de hasta 8 casas.
     · API-Football         opcional, con APIFOOTBALL_KEY en .env. Anade
       jugadores, sus estadisticas partido a partido, alineaciones y bajas.
     · SofaScore            automatico, sin clave y sin archivos. Se conecta
       con curl-cffi-node —que imita la huella TLS de Chrome, porque con `fetch`
       la API responde 403— y baja de cada partido sus estadisticas globales y
       la alineacion con la linea de cada jugador. Es la fuente que MANDA en
       estadisticas: pisa las de ESPN campo a campo y aporta el xG medido, la
       nota, los pases clave, los regates, las entradas, las intercepciones,
       los despejes, los duelos y los toques. Si se cae, la importacion sigue
       con lo de ESPN y no queda peor que antes. Se apaga con --sin-sofascore
       o solo la parte de red con --sin-sofascore-red.
       Ademas se sigue leyendo el volcado manual scripts/sofascore_raw.json
       (JSON entero, un JSON por linea, o texto pegado de la web) para lo que
       la red no cubra.

   Salida: src/datos/importado.json  (la app lo usa si tiene algo dentro).
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');

const { Cliente, claveDelEntorno } = require('./lib/apifootball');
const construir = require('./lib/construir');
const espn = require('./lib/espn');
const fd = require('./lib/footballdata');
const { IMPORTABLES, SIN_CLAVE, fuentesDe, temporadaActual } = require('./lib/mapa-ligas');
const pronosticos = require('./lib/pronosticos');
const sofascore = require('./lib/sofascore');
const sofared = require('./lib/sofascore-api');

const RAIZ = path.join(__dirname, '..');
const DIR_CACHE = path.join(RAIZ, '.cache-datos');
const SALIDA = path.join(RAIZ, 'src', 'datos', 'importado.json');
// El volcado de SofaScore, en esta misma carpeta. Es un archivo local: no se
// descarga, lo pone el usuario.
const SOFASCORE = path.join(__dirname, 'sofascore_raw.json');

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

/** Deja el archivo listo para escribir: sin ceros, sin objetos vacios y sin exceso de registros. */
function adelgaza(acumulado) {
  // 40 y no 25: el modelo mira los 20 mas recientes para la racha, pero la
  // ficha del jugador y las medias de temporada se leen de todo lo que haya, y
  // con 25 un titular se quedaba sin la temporada anterior entera.
  const REGISTROS_POR_JUGADOR = 40;
  for (const c of Object.values(acumulado.competiciones ?? {})) {
    // Solo los registros de partidos que se conservan: si un partido se
    // recorto, sus registros tampoco sirven y engordan el archivo de balde.
    const idsPartidos = new Set((c.partidos ?? []).map((p) => p.id));
    const registros = (c.registros ?? []).filter((r) => idsPartidos.has(r.partidoId));

    // Solo los ultimos N por jugador: el modelo mira los 20 mas recientes
    // y el detalle del jugador no necesita mas. Sin estos dos recortes el
    // archivo crece a 60 MB y los telefonos no lo abren.
    const porJugador = new Map();
    for (const r of registros) {
      const lista = porJugador.get(r.jugadorId) ?? [];
      lista.push(r);
      porJugador.set(r.jugadorId, lista);
    }
    /*
     * Y fuera los jugadores que no llegan al minimo del modelo.
     *
     * Para publicar un pick hace falta un historial de 6 partidos (`picks.ts`
     * descarta por debajo de eso). Guardar a quien tiene uno, dos o cinco es
     * peso que no produce ni un solo pick: la mitad del archivo, unos 10 MB, y
     * eso es lo que el telefono tiene que abrir en memoria cada vez.
     *
     * No se pierde nada recuperable: los registros se rehacen en cada pasada a
     * partir de los partidos con detalle, asi que si alguno llega a seis en la
     * proxima, entra solo. Lo unico que se nota es que la ficha de un suplente
     * con dos partidos sale sin historial.
     */
    const MINIMO_PARA_PICK = 6;
    const recortados = [];
    for (const lista of porJugador.values()) {
      if (lista.length < MINIMO_PARA_PICK) continue;
      lista.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
      recortados.push(...lista.slice(-REGISTROS_POR_JUGADOR));
    }
    c.registros = recortados.map((r) => sinRelleno(r, REGISTRO_VACIO));
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
  // Segundas divisiones. Estaban dadas de alta en la app y en el catalogo de
  // ESPN, pero no aqui: como esta lista es la que decide que se descarga, no
  // llegaban a bajarse nunca y en la app salian vacias.
  'laliga2', 'serieb', 'brasileiraob',
  // Ligas domesticas de paises cuyos clubes aparecen en las fases previas de
  // Champions/Europa/Conference en agosto. Sin esto, `partidosDelEquipoEnTodas`
  // (importado.ts) no tiene de donde sacar el historial de un Viking FK o un
  // Dinamo Zagreb, y el motor de picks se queda con uno o dos partidos. Noruega
  // funciona en ESPN (nor.1); croacia no tiene ESPN (cro.1 devolvio 0
  // partidos) asi que va por el respaldo de SofaScore como unica fuente,
  // igual que eslovenia y eslovaquia, que ESPN ni siquiera tiene dadas de
  // alta.
  'noruega', 'croacia', 'eslovenia', 'eslovaquia',
  // Y el resto de ligas europeas medianas, por lo mismo: sus clubes llenan las
  // previas continentales de julio y agosto. AGF (danes) y Mjallby (sueco)
  // llegaron a jugar la previa con 5 partidos de historial —todos de la propia
  // previa— porque su liga no se bajaba; con su liga domestica pasan de largo
  // el minimo que pide el modelo. Las tres fuentes ya las tenian configuradas.
  'dinamarca', 'suecia', 'suiza', 'austria', 'polonia', 'chequia',
  'serbia', 'ucrania', 'rumania',
  // Copa nacional de Brasil (Copa Betano do Brasil). Solo ESPN; sus equipos
  // pequeños de primeras rondas no traen estadística, así que darán sobre todo
  // picks de goles y hándicap, como el resto de copas con clubes menores.
  'copadobrasil',
  // Continentales.
  'champions', 'europaleague', 'conference', 'libertadores', 'sudamericana',
  'concachampions',
  // Copas nacionales.
  'copadelrey', 'facup', 'carabao', 'coppa', 'dfbpokal', 'coupefrance',
  // Sudamerica.
  'colombia', 'chile', 'peru', 'bolivia', 'ecuador', 'uruguay', 'paraguay',
];

/*
 * Fases previas continentales.
 *
 * En ESPN la clasificación de Champions, Europa y Conference es un calendario
 * aparte, con su propio slug. En la app, en cambio, esos partidos van DENTRO de
 * su competición: los de la previa de Champions se guardan como 'champions'.
 *
 * Así, al abrir Champions se ven las eliminatorias de julio y agosto sin crear
 * una competición temporal que luego haya que retirar —cuando la fase acaba,
 * esos partidos se juegan y desaparecen del inicio solos—. Son datos reales de
 * ESPN: equipos, fechas y resultados de verdad. Los clubes son pequeños y casi
 * no traen historial, así que saldrán sobre todo como partidos con resultado y
 * pocos picks, y marcados con "Fase previa" para que se distingan.
 */
const PREVIA_ESPN = {
  champions: espn.LIGAS.championsprevia,
  europaleague: espn.LIGAS.europaprevia,
  conference: espn.LIGAS.conferenceprevia,
};

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
    /*
     * Cuantos partidos jugados se guardan DE CADA EQUIPO.
     *
     * Es lo que decide cuanta historia tiene el modelo para hablar: pide seis
     * partidos con el dato para publicar un pick, y mira los ultimos diez o
     * veinte para la racha. Con 35 entra casi una temporada entera de liga mas
     * lo que llevan de la actual, que es lo que describe a un equipo hoy.
     *
     * Por equipo y no por liga: ver el recorte, mas abajo. Con un tope por liga,
     * cuantos mas equipos tenia, menos historia le quedaba a cada uno.
     */
    porEquipo: 35,
    /*
     * Techo de seguridad por competicion, ya con el recorte por equipo hecho.
     *
     * Una liga de 32 equipos guarda unos 560 partidos, asi que 400 volvia a
     * cortar justo lo que el recorte por equipo acababa de salvar. Se sube a
     * 1200: solo salta si una competicion trae un numero absurdo.
     */
    partidos: 1200,
    // De cuantos se bajan estadisticas y jugadores desde ESPN. Es un minimo:
    // el numero real sale de `actasPorEquipo` x equipos de la liga.
    detalles: 90,
    /*
     * Actas por equipo. Doce y no seis: seis es el minimo que el modelo exige
     * para hablar, y si se apunta justo al minimo, en cuanto un equipo juega
     * un partido menos que los demas —o a alguno le falta el acta— se queda
     * sin picks. Con doce hay margen para la racha de los ultimos diez.
     */
    actasPorEquipo: 12,
    // El volcado local de SofaScore. Se puede apuntar a otro archivo o
    // desactivarlo del todo para importar solo con ESPN, como antes.
    sofascore: SOFASCORE,
    sinSofascore: false,
    /*
     * La descarga de SofaScore por red va APAGADA por defecto.
     *
     * Estaba en `true` y colgó el bot diez horas: sin `sofascore_raw.json`
     * local, intentaba la red de SofaScore —que imita Chrome para saltarse el
     * 403— en cada liga, SofaScore la bloqueaba y la importación se quedaba
     * esperando una respuesta que no llegaba nunca, con el cerrojo puesto y sin
     * publicar nada. Ahora es opt-in: se activa con `--sofascore-red` si de
     * verdad se quiere y se asume el riesgo. Sin ella, se importa con ESPN, que
     * es fiable y no se cuelga.
     */
    sofascoreRed: false,
    /*
     * De cuantos partidos se baja el detalle de SofaScore.
     *
     * Cuestan tres peticiones cada uno —globales, alineaciones y acta— asi que
     * es el numero que decide lo que tarda la primera pasada. Las siguientes
     * van de cache: lo de un partido terminado no cambia nunca.
     */
    sofascorePartidos: 90,
    /*
     * Freno entre peticiones, en milisegundos: un rango, no un numero fijo.
     * Cada peticion espera algo distinto dentro de este rango, para no dejar
     * un patron de tiempos identicos que un antibot reconoce a la legua.
     * Bajarlo, o volverlo fijo, acaba en bloqueo.
     */
    sofascorePausaMin: 3000,
    sofascorePausaMax: 7000,
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
    else if (a[i] === '--partidos') o.partidos = Number(a[++i]) || 1200;
    else if (a[i] === '--por-equipo') o.porEquipo = Number(a[++i]) || 35;
    else if (a[i] === '--actas-por-equipo') o.actasPorEquipo = Number(a[++i]) || 12;
    else if (a[i] === '--detalles') o.detalles = Number(a[++i]) || 0;
    else if (a[i] === '--importantes') o.ligas = [...IMPORTANTES];
    else if (a[i] === '--sofascore') o.sofascore = path.resolve(a[++i]);
    else if (a[i] === '--sin-sofascore') o.sinSofascore = true;
    else if (a[i] === '--sofascore-red') o.sofascoreRed = true;
    else if (a[i] === '--sin-sofascore-red') o.sofascoreRed = false;
    else if (a[i] === '--sofascore-partidos') o.sofascorePartidos = Number(a[++i]) || 0;
    else if (a[i] === '--sofascore-pausa-min') o.sofascorePausaMin = Number(a[++i]) || 3000;
    else if (a[i] === '--sofascore-pausa-max') o.sofascorePausaMax = Number(a[++i]) || 7000;
  }
  return o;
}

/*
 * Tres temporadas, no dos: la de ahora y las dos anteriores.
 *
 * Con dos, un equipo que juega la previa continental en julio —cuando su liga
 * apenas ha empezado— se quedaba practicamente sin historial, porque la
 * temporada que de verdad lo describe es la que acaba de terminar. El recorte
 * por fecha de mas abajo (1150 dias) esta puesto para conservar justo esto.
 */
function temporadasPorDefecto() {
  const actual = temporadaActual();
  const anio = Number(actual.split('-')[0]);
  const fmt = (a) => `${a}-${String((a + 1) % 100).padStart(2, '0')}`;
  return [fmt(anio - 2), fmt(anio - 1), actual];
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

/* ------------------------------------------------------------- SofaScore */

/** Un nombre de persona comparable: sin acentos, sin puntos y sin mayusculas. */
function claveNombre(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/*
 * Los campos de un registro que trae SofaScore. Se listan para poder copiarlos
 * encima de lo que puso ESPN sin tocar el contexto del registro —de que partido
 * es, de que jugador, contra quien— que se calcula aqui y SofaScore no sabe.
 */
const CAMPOS_REGISTRO = Object.keys(REGISTRO_VACIO);

/**
 * Baja SofaScore y lo pone POR DELANTE de ESPN.
 *
 * ESPN sigue mandando en lo que sabe mejor —el calendario, el estado en vivo,
 * los escudos y las cuotas— y ahi no se toca nada. Pero en lo que los dos
 * publican, manda SofaScore: su xG esta medido y el de ESPN no existe (se
 * estimaba a partir del propio gol), y de cada jugador da la nota, los pases
 * clave, los regates, las entradas, las intercepciones, los despejes, los
 * duelos y los toques, que son quince campos que con ESPN se quedaban a cero y
 * dejaban esos mercados sin poder ofrecerse.
 *
 * Lo que SofaScore no publica de un partido concreto se queda como lo dejo
 * ESPN: es una capa encima, no un reemplazo, asi que un corte de esta fuente
 * nunca deja la importacion peor que antes.
 */
async function aplicaSofaScore(id, opciones, dirCache, contexto) {
  const { partidos, equipos, jugadores, registros, bandera } = contexto;
  const torneoId = sofared.TORNEOS[id];
  if (!torneoId) return null;

  const jugados = partidos
    .filter((p) => p.estado === 'finalizado')
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const objetivo = jugados.slice(-opciones.sofascorePartidos);
  if (!objetivo.length) return null;

  const cli = new sofared.Cliente(dirCache, {
    forzar: opciones.forzar,
    pausaMinMs: opciones.sofascorePausaMin,
    pausaMaxMs: opciones.sofascorePausaMax,
  });

  process.stdout.write('  SofaScore (calendario)… ');
  const calendario = await sofared.calendario(cli, torneoId, { desde: objetivo[0].fecha });
  console.log(`${calendario.length} partidos`);
  if (!calendario.length) {
    return { pegados: 0, conXgReal: new Set(), cortado: cli.resumen().cortado };
  }

  const nombreDe = new Map(equipos.map((e) => [e.id, e.nombre]));

  /*
   * El encaje pide las dos cosas: que los dos nombres se parezcan y que la
   * fecha cuadre. En una liga los mismos dos equipos se ven dos veces por
   * temporada, asi que solo con los nombres las estadisticas de la vuelta
   * acabarian en el partido de la ida.
   */
  const encajeDe = (p) => {
    const local = nombreDe.get(p.localId);
    const visitante = nombreDe.get(p.visitanteId);
    if (!local || !visitante) return null;
    return calendario.find((s) => {
      if (Math.abs(new Date(s.fecha) - new Date(p.fecha)) > 2 * 86400000) return false;
      if (construir.parecido(s.local, local) < 0.72) return false;
      if (construir.parecido(s.visitante, visitante) < 0.72) return false;
      // Y el marcador de cerrojo: si no cuadra, no es este partido.
      if (s.terminado && s.golesLocal !== null) {
        if (s.golesLocal !== p.golesLocal || s.golesVisitante !== p.golesVisitante) return false;
      }
      return true;
    });
  };

  /*
   * El mismo futbolista tiene un identificador en ESPN y otro en SofaScore. Si
   * cada fuente crea su ficha, la app acaba con dos "Declan Rice" a media
   * temporada cada uno y ninguno llega a los seis partidos que pide un pick.
   * Se casan por nombre dentro de su propio equipo, que es donde no hay dos
   * personas que se llamen igual, y gana el identificador que ya existia.
   */
  const porJugador = new Map(jugadores.map((j) => [j.id, j]));
  const indice = new Map();
  for (const j of jugadores) {
    indice.set(`${j.equipoId}|${claveNombre(j.nombre)}`, j.id);
  }
  const registroDe = new Map(registros.map((r) => [`${r.partidoId}|${r.jugadorId}`, r]));

  const resuelve = (equipoId, nombre) => {
    const exacto = indice.get(`${equipoId}|${claveNombre(nombre)}`);
    if (exacto) return exacto;
    // Sin coincidencia exacta, el mas parecido de su equipo: ESPN escribe
    // "Emile Smith Rowe" donde SofaScore pone "E. Smith Rowe".
    let mejor = null;
    let puntos = 0;
    for (const j of jugadores) {
      if (j.equipoId !== equipoId) continue;
      const p = construir.parecido(j.nombre, nombre);
      if (p > puntos) {
        puntos = p;
        mejor = j;
      }
    }
    return puntos >= 0.82 ? mejor.id : null;
  };

  const conXgReal = new Set();
  const notas = new Map();
  const minutos = new Map();
  let pegados = 0;
  let conJugadores = 0;

  process.stdout.write(`  SofaScore (detalle de ${objetivo.length} partidos)… `);
  for (const partido of objetivo) {
    const evento = encajeDe(partido);
    if (!evento) continue;

    const detalle = await sofared.detalle(cli, evento.idSofa);
    if (!detalle) {
      if (cli.resumen().cortado) break;
      continue;
    }

    // --- globales del equipo: SofaScore pisa a ESPN campo a campo
    if (detalle.globales) {
      for (const lado of ['local', 'visitante']) {
        const suyas = detalle.globales[lado];
        if (!suyas) continue;
        for (const [campo, valor] of Object.entries(suyas)) {
          if (valor !== null && valor !== undefined) partido.estadisticas[lado][campo] = valor;
        }
        if (suyas.xg > 0) conXgReal.add(partido.id);
      }
      pegados++;
    }

    // --- la linea de cada jugador
    if (!detalle.plantillas) continue;
    for (const lado of ['local', 'visitante']) {
      const esLocal = lado === 'local';
      const equipoId = esLocal ? partido.localId : partido.visitanteId;
      const rivalId = esLocal ? partido.visitanteId : partido.localId;

      for (const j of detalle.plantillas[lado]) {
        if (!j.registro) continue;
        const jugadorId = resuelve(equipoId, j.nombre) ?? `${id}:s${j.idSofa}`;

        // Ficha: la de ESPN se completa, y si el jugador no estaba, se crea.
        const ficha = porJugador.get(jugadorId);
        if (ficha) {
          ficha.posicion = j.posicion || ficha.posicion;
          ficha.dorsal = ficha.dorsal || j.dorsal;
          ficha.pais = ficha.pais || j.pais;
        } else {
          const nuevo = {
            id: jugadorId,
            nombre: j.nombre,
            equipoId,
            posicion: j.posicion,
            dorsal: j.dorsal,
            edad: 0,
            pais: j.pais,
            bandera,
            nivel: 75,
            rol: 'rotacion',
          };
          jugadores.push(nuevo);
          porJugador.set(jugadorId, nuevo);
          indice.set(`${equipoId}|${claveNombre(j.nombre)}`, jugadorId);
        }

        // Los que no llegaron a saltar al campo no dejan registro: un cero de
        // quien no jugo hunde su media y fabrica rachas de "menos de" falsas.
        if (!j.registro.minutos) continue;

        const clave = `${partido.id}|${jugadorId}`;
        const existente = registroDe.get(clave);
        if (existente) {
          for (const campo of CAMPOS_REGISTRO) {
            if (j.registro[campo] !== undefined) existente[campo] = j.registro[campo];
          }
        } else {
          const nuevo = {
            partidoId: partido.id,
            jugadorId,
            equipoId,
            rivalId,
            local: esLocal,
            fecha: partido.fecha,
            ...j.registro,
          };
          registros.push(nuevo);
          registroDe.set(clave, nuevo);
        }

        notas.set(jugadorId, [...(notas.get(jugadorId) ?? []), j.registro.nota]);
        minutos.set(jugadorId, (minutos.get(jugadorId) ?? 0) + j.registro.minutos);
      }
    }
    conJugadores++;
  }
  console.log(`${pegados} con estadísticas, ${conJugadores} con alineaciones`);

  /*
   * El nivel del jugador sale de su nota media real, no de un 75 fijo. Importa
   * porque el orden de la portada lo usa: sin esto, un pick de un suplente sale
   * por delante de uno de Haaland.
   */
  for (const [jugadorId, lista] of notas) {
    const ficha = porJugador.get(jugadorId);
    if (!ficha || !lista.length) continue;
    const media = lista.reduce((a, b) => a + b, 0) / lista.length;
    ficha.nivel = Math.max(58, Math.min(94, Math.round(40 + media * 6.2)));
  }

  // Y el rol, por minutos jugados dentro de su equipo: la app descarta los
  // picks de quien marca como suplente.
  const porEquipo = new Map();
  for (const j of jugadores) {
    if (!minutos.has(j.id)) continue;
    porEquipo.set(j.equipoId, [...(porEquipo.get(j.equipoId) ?? []), j]);
  }
  for (const plantel of porEquipo.values()) {
    plantel.sort((a, b) => (minutos.get(b.id) ?? 0) - (minutos.get(a.id) ?? 0));
    plantel.forEach((j, i) => {
      j.rol = i < 11 ? 'titular' : i < 16 ? 'rotacion' : 'suplente';
    });
  }

  return { pegados, conJugadores, conXgReal, ...cli.resumen() };
}

async function importaCompeticion(id, opciones, catalogo, clave, sofa) {
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
  const slugPrevia = PREVIA_ESPN[id];
  let detallesEspn = [];
  // Los idEspn de la fase previa, para pedir sus cuotas con el slug correcto.
  const idsPrevia = new Set();

  if (slugEspn) {
    /*
     * 1150 dias hacia atras: tres temporadas.
     *
     * Estaba en 400 —poco mas de una temporada— y ESPN es la fuente principal,
     * asi que ese era el techo real del historial por mucho que el resto del
     * script conservara mas. Un club que juega la previa continental en julio
     * salia con cuatro o cinco partidos porque su temporada anterior no se
     * habia llegado a pedir.
     */
    const desde = new Date(Date.now() - 1150 * 86400000);
    const hasta = new Date(Date.now() + 120 * 86400000);
    process.stdout.write(`  ESPN (${slugEspn})… `);
    let calendario = await espn.calendario(slugEspn, desde, hasta, dirCache, opciones.forzar || opciones.refrescar);
    // La fase previa es un calendario aparte en ESPN; se baja y se une a esta
    // misma competición, marcando cada partido para distinguirlo en la app.
    if (slugPrevia) {
      const previa = await espn.calendario(slugPrevia, desde, hasta, dirCache, opciones.forzar || opciones.refrescar);
      for (const m of previa) {
        m.fasePrevia = true;
        idsPrevia.add(m.idEspn);
      }
      calendario = calendario.concat(previa);
    }
    const convertido = construir.desdeEspn(calendario);
    historial = convertido.historial;
    proximos = convertido.proximos;
    const vivos = calendario.filter((p) => p.estado === 'en_curso' || p.estado === 'descanso').length;
    console.log(
      `${historial.length} jugados, ${proximos.length} por jugar` +
        (vivos ? `, ${vivos} en vivo` : '') +
        (slugPrevia ? ', con fase previa' : ''),
    );

    // Cuotas reales de los partidos que aun no se han jugado. Son las que
    // publican las casas con las que trabaja ESPN, en formato americano, y se
    // convierten a decimal. Solo se piden los pendientes, que son pocos.
    if (proximos.length) {
      process.stdout.write(`  ESPN (cuotas de ${proximos.length} partidos)… `);
      let conCuotas = 0;
      for (const p of proximos) {
        // Cada partido pide sus cuotas con el slug del que vino: un id de la
        // previa contra el slug principal devolvería el partido equivocado.
        const slugCuotas = idsPrevia.has(p.idEspn) ? slugPrevia : slugEspn;
        const q = await espn.cuotas(slugCuotas, p.idEspn, dirCache, opciones.forzar || opciones.refrescar);
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

    /*
     * El detalle (estadisticas y jugadores) cuesta una peticion por partido,
     * asi que solo se piden los mas recientes: el modelo mira los ultimos 10.
     *
     * Con 0 no se pide ninguno —es la pasada ligera, solo resultados y cuotas—.
     * OJO: `slice(-0)` es `slice(0)`, que devuelve el array ENTERO, no vacío:
     * por eso `--detalles 0` bajaba el acta de todos los partidos, tardaba
     * horas y llenaba el disco del runner. Hay que cortar en seco cuando es 0.
     *
     * Cuantas, lo decide el tamaño de la liga, no un numero fijo. Con 90 para
     * todas, una liga de 32 equipos dejaba tres actas por equipo y el modelo
     * —que pide seis partidos con el dato— no publicaba ni un pick de remates,
     * corners o tarjetas: la MLS daba UN pick por partido. Contando doce por
     * equipo, ese mismo partido pasa a diecisiete y aparecen los de jugador.
     * En una liga de 18 equipos son 216 actas; en una de 32, 384. Un acta ya
     * descargada no se vuelve a pedir, asi que esto solo pesa la primera vez.
     */
    const equiposEnHistorial = new Set(historial.flatMap((p) => [p.local, p.visitante])).size;
    const cuantasActas =
      opciones.detalles > 0
        ? Math.max(opciones.detalles, equiposEnHistorial * opciones.actasPorEquipo)
        : 0;
    const recientes = cuantasActas > 0 ? historial.slice(-cuantasActas) : [];
    if (recientes.length) {
      process.stdout.write(`  ESPN (detalle de ${recientes.length} partidos)… `);
      let hechos = 0;
      for (const p of recientes) {
        // Si el partido ya terminó y su acta está en cache, se lee del disco
        // sin tocar la red: una temporada cerrada no se vuelve a descargar.
        const yaCerrado = p.estado === 'finalizado';
        const d = await espn.detalle(slugEspn, p.idEspn, dirCache, opciones.forzar, yaCerrado);
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
  if (!fuentes.fd && !slugEspn && cliente) {
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

  /*
   * Ultimo recurso: SofaScore como unica fuente, sin ESPN.
   *
   * Pasa con paises que ESPN no cubre pero SofaScore si (Croacia, ID 170:
   * ESPN devuelve "cro.1" pero con cero partidos). Sin esto la competicion
   * ni se guardaba, y un club que juega ahi contra la ronda previa de la
   * Champions se quedaba con uno o dos partidos de historial en vez de con
   * el de su liga: `partidosDelEquipoEnTodas` (importado.ts) no tenia de
   * donde sacarlo.
   *
   * Sale mas pobre que un import normal —solo equipo, marcador y fecha, sin
   * cuotas ni jugadores, porque aqui solo hace falta el historial para el
   * cruce entre competiciones—, pero es mejor que nada.
   */
  if (!historial.length && sofared.TORNEOS[id]) {
    process.stdout.write(`  SofaScore (unica fuente, ESPN no tiene "${id}")… `);
    try {
      const cli = new sofared.Cliente(dirCache, {
        forzar: opciones.forzar,
        pausaMinMs: opciones.sofascorePausaMin,
        pausaMaxMs: opciones.sofascorePausaMax,
      });
      const desde = new Date(Date.now() - 800 * 86400000).toISOString();
      const crudos = await sofared.calendario(cli, sofared.TORNEOS[id], { desde });
      const adaptados = crudos.map((p) => ({
        idEspn: `sofa:${p.idSofa}`,
        fecha: p.fecha,
        local: p.local,
        visitante: p.visitante,
        golesLocal: p.golesLocal,
        golesVisitante: p.golesVisitante,
        estado: p.terminado ? 'finalizado' : 'previa',
      }));
      const convertido = construir.desdeEspn(adaptados);
      historial = convertido.historial;
      proximos = convertido.proximos;
      console.log(`${historial.length} jugados, ${proximos.length} por jugar`);
      if (historial.length) {
        aviso.push(
          'Esta competición viene solo de SofaScore, sin ESPN: hay resultados y calendario, pero sin cuotas ni jugadores.',
        );
      }
    } catch (e) {
      console.log(`no disponible (${e.message})`);
    }
  }

  if (!historial.length) {
    throw new Error(`No se descargó ningún partido de "${id}". Prueba con otras temporadas.`);
  }

  // Las ligas del formato "nuevo" traen todas las temporadas de su historia:
  // seis mil partidos por liga no caben en una app. Se recortan a las tres
  // ultimas temporadas: con dos, un equipo que juega la previa continental en
  // julio se quedaba sin nada de la temporada que acababa de terminar, que es
  // justo el historial que lo describe.
  const DIAS = 86400000;
  const corte = Date.now() - 1150 * DIAS;
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

  /*
   * El recorte va por EQUIPO, no por competicion.
   *
   * Antes se guardaban los ultimos 400 partidos de la liga entera, y eso
   * repartia historia muy distinta segun cuantos equipos tuviera: en Ecuador
   * (18 equipos) le tocaban unos 44 a cada uno, y en la MLS (32) solo 25. El
   * modelo pide 6 partidos con el dato para publicar un pick, asi que las ligas
   * con muchos equipos se quedaban casi sin picks -la MLS daba uno o dos por
   * partido, y ninguno de jugador-. Se bajaban tres temporadas de SofaScore y
   * se tiraban aqui.
   *
   * Ahora se conservan los ultimos PARTIDOS_POR_EQUIPO de cada equipo. Un
   * partido cuenta para los dos, asi que la suma no es equipos x tope: en una
   * liga de 20 equipos son unos 350 partidos, en una de 32 unos 560. Todas las
   * ligas quedan con la misma profundidad, tengan los equipos que tengan.
   *
   * `--partidos` se queda como techo de seguridad por si una competicion trae
   * un numero absurdo (torneos con cientos de equipos).
   */
  const abiertosTodos = partidos.filter((p) => p.estado !== 'finalizado');
  const jugadosOrdenados = partidos
    .filter((p) => p.estado === 'finalizado')
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const cuenta = new Map();
  const guardados = [];
  // Del mas reciente al mas viejo: los primeros en entrar son los que importan.
  for (let i = jugadosOrdenados.length - 1; i >= 0; i--) {
    const p = jugadosOrdenados[i];
    const delLocal = cuenta.get(p.localId) ?? 0;
    const delVisitante = cuenta.get(p.visitanteId) ?? 0;
    // Basta con que uno de los dos todavia necesite partidos.
    if (delLocal >= opciones.porEquipo && delVisitante >= opciones.porEquipo) continue;
    guardados.push(p);
    cuenta.set(p.localId, delLocal + 1);
    cuenta.set(p.visitanteId, delVisitante + 1);
  }
  guardados.reverse();

  const tope = opciones.partidos;
  const jugados = guardados.length > tope ? guardados.slice(-tope) : guardados;
  partidos = [...jugados, ...abiertosTodos].sort((a, b) => a.fecha.localeCompare(b.fecha));
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

  // ----------------------------------------- 5. SofaScore (red, la principal)
  // Se baja sola con curl-cffi-node salvo que se pida --sin-sofascore o
  // --sin-sofascore-red. Es la fuente que manda en estadisticas: pisa las de
  // ESPN campo a campo y añade la linea completa de cada jugador.
  let conXgReal = new Set();
  let resumenSofa = null;
  let redSofa = null;
  if (opciones.sofascoreRed && !opciones.sinSofascore && opciones.sofascorePartidos > 0) {
    try {
      redSofa = await aplicaSofaScore(id, opciones, dirCache, {
        partidos,
        equipos,
        jugadores,
        registros,
        bandera: meta.bandera,
      });
    } catch (e) {
      console.log(`no disponible (${e.message})`);
    }
    if (redSofa) {
      for (const x of redSofa.conXgReal) conXgReal.add(x);
      console.log(
        `  ${jugadores.length} jugadores · ${registros.length} registros (SofaScore sobre ESPN)` +
          ` · ${redSofa.nuevas} peticiones nuevas, ${redSofa.cache} de caché`,
      );
      if (redSofa.cortado) {
        aviso.push(
          'SofaScore dejó de responder a mitad de la descarga y se siguió con lo de ESPN. Lo ya bajado queda en caché: al volver a lanzarlo seguirá donde lo dejó.',
        );
      }
    } else if (!sofared.TORNEOS[id]) {
      aviso.push('Esta competición no está dada de alta en SofaScore, así que va solo con ESPN.');
    }
  }

  // ------------------------------------------- 6. SofaScore (archivo local)
  // El volcado a mano, para lo que la red no cubra. Solo rellena estadisticas
  // de partidos que ya existen: nunca crea partidos ni equipos, para que un
  // archivo con otra liga dentro no ensucie esta.
  if (sofa?.partidos?.length) {
    process.stdout.write(`  SofaScore (archivo local, ${sofa.partidos.length} partidos)… `);
    const r = sofascore.pega(partidos, equipos, sofa.partidos, construir.parecido);
    conXgReal = r.conXgReal;
    resumenSofa = { pegados: r.pegados, conXgReal: r.conXgReal.size, formato: sofa.formato };
    console.log(`${r.pegados} encajados, ${r.conXgReal.size} con xG real`);
    if (!r.pegados) {
      aviso.push(
        'El archivo de SofaScore no tiene ningún partido de esta competición, o los nombres de los equipos no se parecen a los de ESPN.',
      );
    }
  }

  // ------------------------------------------------------ 6. los pronosticos
  // Las formulas viven en lib/pronosticos.js. Se calculan aqui, en la
  // importacion, para que la app se los encuentre hechos.
  const calculado = pronosticos.deCompeticion(partidos, equipos, conXgReal);
  if (calculado.pronosticos.length) {
    const altas = calculado.pronosticos.filter((p) => p.confianza === 'alta').length;
    const conValor = calculado.pronosticos.filter((p) => p.valor.some((v) => v.valorEsperado > 0)).length;
    console.log(
      `  ${calculado.pronosticos.length} pronósticos · ${altas} de confianza alta · ${conValor} con valor sobre la cuota`,
    );
  } else if (calculado.aviso) {
    aviso.push(calculado.aviso);
  }

  return {
    competicionId: id,
    nombre: meta.nombre,
    temporadas,
    importadoEn: new Date().toISOString(),
    fuentes: [
      redSofa?.pegados ? 'SofaScore' : null,
      slugEspn ? 'ESPN' : null,
      fuentes.fd ? 'Football-Data.co.uk' : null,
      cliente ? 'API-Football' : null,
      resumenSofa?.pegados ? 'SofaScore (volcado local)' : null,
    ].filter(Boolean),
    equipos,
    partidos,
    jugadores,
    registros,
    pronosticos: calculado.pronosticos,
    modelo: calculado.modelo ?? null,
    sofascore: resumenSofa,
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

  /*
   * El volcado de SofaScore se lee una sola vez, aqui, y se reparte a todas las
   * competiciones. Es un archivo local y no cambia a mitad de la pasada, asi que
   * abrirlo una vez por liga solo seria mas lento.
   */
  let sofa = null;
  if (!o.sinSofascore) {
    sofa = sofascore.lee(o.sofascore);
    const donde = path.relative(RAIZ, o.sofascore).replace(/\\/g, '/');
    if (!sofa.existe) {
      console.log(`Sin ${donde}: se importa solo con ESPN y los pronósticos irán con goles, sin xG real.\n`);
    } else if (sofa.partidos.length) {
      console.log(`SofaScore: ${sofa.partidos.length} partidos leídos de ${donde} (formato ${sofa.formato}).\n`);
    } else {
      console.log(`SofaScore: ${donde} está pero no se entendió nada dentro.`);
      for (const a of sofa.avisos) console.log(`  · ${a}`);
      console.log('');
    }
  }

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
      acumulado.competiciones[id] = await importaCompeticion(id, o, catalogo, clave, sofa);
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

/*
 * Un fallo de red no puede tumbar una importacion de hora y media.
 *
 * Node 24 trae un fallo suyo en el cliente HTTP (undici): cuando el servidor
 * corta una conexion en un momento concreto, revienta con
 * "AssertionError: assert(!this.paused)" desde un callback interno de socket.
 * Eso ocurre FUERA de cualquier try/catch —no hay await que lo atrape, porque
 * no viaja por la promesa— asi que se llevaba por delante el proceso entero a
 * mitad de la pasada, con cuarenta y tantas competiciones sin bajar.
 *
 * Aqui se atrapa a nivel de proceso: se apunta y se sigue. Lo que se pierde es
 * esa peticion suelta (el partido se queda sin detalle, y ya esta); lo que se
 * gana es que las competiciones que faltaban se importen igual.
 *
 * No se enmascara nada mas: un error de verdad del script sigue subiendo por
 * su camino normal y cortando la pasada, que es lo que debe hacer.
 */
let fallosDeRed = 0;
process.on('uncaughtException', (e) => {
  const esFalloDeRed =
    e?.code === 'ERR_ASSERTION' ||
    e?.code === 'ECONNRESET' ||
    e?.code === 'ETIMEDOUT' ||
    e?.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
    /undici|socket|ECONNRESET/i.test(e?.stack ?? '');
  if (!esFalloDeRed) throw e;
  fallosDeRed++;
  // Solo los primeros: si la red esta mal, cien lineas iguales no dicen nada.
  if (fallosDeRed <= 3) {
    console.error(`  (fallo de red del cliente HTTP, se continua: ${e.message.split('\n')[0]})`);
  }
});

main()
  .then(() => {
    if (fallosDeRed) {
      console.log(`\n${fallosDeRed} peticiones se perdieron por fallos de red y se siguio sin ellas.`);
    }
    /*
     * Se cierra a mano en vez de dejar que Node termine solo.
     *
     * Con los datos ya escritos, Node reventaba al salir con un
     * "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)": un fallo suyo
     * en Windows al desmontar los manejadores de red que dejan abiertos las
     * descargas. No corrompia nada —el archivo ya estaba en disco— pero
     * ensuciaba el registro y, sobre todo, dejaba el codigo de salida al azar:
     * el .cmd del refresco no podia distinguir una pasada buena de una rota.
     *
     * Se espera a que salga el texto pendiente y se sale con un cero explicito.
     */
    process.stdout.write('', () => process.exit(0));
  })
  .catch((e) => {
    console.error(`\nError: ${e.message}\n`);
    process.exit(1);
  });
