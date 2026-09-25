'use strict';
/* ==========================================================================
   Scout Picks · lib/sofascore-api.js
   SofaScore por red, sin intervencion manual.

   Es el complemento de ESPN, no su sustituto. ESPN pone el calendario, el
   estado en vivo, los escudos y las cuotas; SofaScore pone lo que ESPN no
   publica y el modelo necesita:

     · del equipo: xG real (no derivado del marcador), posesion, pases y
       precision de pase, ademas de remates, remates a puerta, corners, faltas
       y tarjetas medidos por ellos.
     · de cada jugador: nota, xG, xA, pases clave, regates, entradas,
       intercepciones, despejes, duelos, toques y centros. Son los quince
       campos que en `construir.js` se rellenaban con ceros porque ESPN no los
       da, y sin ellos la app no puede ofrecer esos mercados.

   Dos endpoints por partido: /statistics (globales de los dos equipos) y
   /lineups (la linea de cada jugador, titular o suplente).

   ── Sobre `verify: false` ──────────────────────────────────────────────────
   curl-cffi-node 0.1.8 no valida certificados en Windows: falla con
   CURLE_PEER_FAILED_VERIFICATION contra CUALQUIER host, no solo este, y su API
   no expone CAINFO ni respeta CURL_CA_BUNDLE, asi que no hay forma de darle un
   almacen de confianza. Se desactiva la verificacion solo aqui, para una API
   publica de solo lectura a la que no se le manda ninguna credencial. Si el
   paquete lo arregla, basta con quitar `verify: false` de PETICION.
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

/*
 * curl-cffi-node trae un binario nativo por sistema operativo, y ese binario
 * puede simplemente no cargar en una maquina concreta —una version de glibc
 * que no trae el simbolo que pide, una libreria del sistema con otra
 * numeracion— sin que haya nada que el propio proyecto pueda arreglar desde
 * aqui. Antes esto tumbaba TODO importar.js nada mas arrancar, antes de que
 * ninguna de las bajadas de mas abajo tuviera oportunidad de decidir nada.
 *
 * Con el require protegido, si el binario no carga, `get` queda `null` y
 * cada peticion de este archivo devuelve null en vez de reventar: la
 * importacion sigue con ESPN, exactamente como ya pasa cuando SofaScore
 * responde 403 o se corta a medias.
 */
let get = null;
try {
  ({ get } = require('curl-cffi-node'));
} catch (e) {
  console.error(`  (SofaScore por red no disponible en esta maquina: ${e.message})`);
}

const RAIZ = 'https://api.sofascore.com/api/v1';

/*
 * Se presenta como un navegador de verdad, hasta en la huella TLS. Para eso
 * esta curl-cffi-node: con `fetch` esta misma peticion devuelve 403 siempre.
 *
 * ── Por que hay varias y no una ────────────────────────────────────────────
 *
 * Aqui habia una sola, `chrome124`, y el 2026-09-24 dejo de valer: SofaScore
 * empezo a contestar `{"error":{"code":403,"reason":"challenge"}}` a TODAS las
 * huellas de Chrome —probadas chrome124, chrome131 y chrome136— mientras seguia
 * atendiendo a las de Safari y Firefox con normalidad. No fue un bloqueo de
 * esta IP ni del PC: fue un cambio de su filtro.
 *
 * El bot no se entero. Como cada competicion decia "calendario... 0 partidos" y
 * seguia adelante con ESPN, los datos se publicaron sin xG medido y sin la
 * linea completa de jugador durante un dia entero sin un solo error en rojo.
 *
 * Por eso ahora son varias y se van probando: si la primera recibe un 403, se
 * pasa a la siguiente y se dice en el registro. El orden es el de lo que
 * funciona hoy, con una de Chrome al final por si vuelven a darle la vuelta.
 */
const HUELLAS = ['safari17_0', 'firefox133', 'chrome136'];
/** Cual se esta usando. Vale para toda la ejecucion: no se busca en cada liga. */
let huella = 0;

const peticion = () => ({
  impersonate: HUELLAS[huella],
  timeout: 25,
  verify: false,
  headers: {
    Accept: 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://www.sofascore.com/',
    Origin: 'https://www.sofascore.com',
  },
});

/** Con que huella se esta hablando, para poder contarlo al terminar. */
function huellaEnUso() {
  return HUELLAS[huella];
}

/** Competicion de la app -> torneo de SofaScore. */
const TORNEOS = {
  premier: 17,
  championship: 18,
  laliga: 8,
  laliga2: 54,
  seriea: 23,
  serieb: 53,
  bundesliga: 35,
  bundesliga2: 44,
  ligue1: 34,
  ligue2: 182,
  eredivisie: 37,
  portugal: 238,
  belgica: 38,
  turquia: 52,
  grecia: 185,
  escocia: 36,
  suiza: 215,
  austria: 45,
  dinamarca: 39,
  noruega: 20,
  suecia: 40,
  polonia: 202,
  rumania: 152,
  chequia: 172,
  croacia: 170,
  serbia: 1050,
  ucrania: 218,
  // Sin ESPN: son las que importaCompeticion() arma SOLO con SofaScore.
  eslovenia: 212,
  eslovaquia: 211,

  // Continentales y copas.
  champions: 7,
  europaleague: 679,
  conference: 17015,
  libertadores: 16940,
  sudamericana: 480,
  concachampions: 498,
  copadelrey: 329,
  facup: 19,
  carabao: 21,
  coppa: 328,
  dfbpokal: 217,
  coupefrance: 335,
  mundial: 16,
  euro: 1,
  copaamerica: 133,
  nationsleague: 10783,

  // America y Asia.
  ligamx: 11621,
  brasileirao: 325,
  brasileiraob: 390,
  argentina: 155,
  mls: 242,
  colombia: 11539,
  peru: 406,
  bolivia: 16736,
  ecuador: 240,
  uruguay: 18000,
  paraguay: 11541,
  japon: 196,
  corea: 208,
  australia: 209,
  china: 224,
  saudi: 955,
};

const IMPORTABLES = Object.keys(TORNEOS);

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Cliente con cache en disco y freno de mano.
 *
 * Lo de un partido terminado no cambia nunca, asi que se guarda para siempre y
 * la segunda importacion no vuelve a pedirlo: sin eso, bajar noventa partidos
 * de veinte competiciones cada dia son miles de peticiones a un servidor que no
 * nos debe nada, y acaban en bloqueo. Lo que si cambia —el calendario— caduca a
 * las seis horas.
 */
class Cliente {
  /*
   * La pausa es un rango, no un numero fijo. Un freno siempre igual —350ms,
   * clavado— es justo el patron que un antibot detecta mejor: nadie hace
   * clic cada 350ms exactos. Con un rango aleatorio cada peticion espera algo
   * distinto, como pasaria si un usuario real fuera abriendo partido tras
   * partido.
   */
  constructor(dirCache, { forzar = false, pausaMinMs = 3000, pausaMaxMs = 7000 } = {}) {
    this.dir = path.join(dirCache, 'sofascore');
    this.forzar = forzar;
    this.pausaMinMs = pausaMinMs;
    this.pausaMaxMs = Math.max(pausaMinMs, pausaMaxMs);
    this.ultima = 0;
    this.nuevas = 0;
    this.cache = 0;
    this.fallos = 0;
    /*
     * Un 403 no es un fallo de este partido: es que SofaScore ha cortado el
     * grifo. Seguir pidiendo solo alarga el castigo, asi que a partir de tres
     * seguidos se deja de pedir y la importacion sigue con lo de ESPN.
     */
    this.cortado = false;
    fs.mkdirSync(this.dir, { recursive: true });
  }

  rutaDe(url) {
    const nombre = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
    return path.join(this.dir, `${nombre}.json`);
  }

  async espera() {
    // Una espera nueva sorteada en cada peticion, no la misma de siempre.
    const objetivo = this.pausaMinMs + Math.random() * (this.pausaMaxMs - this.pausaMinMs);
    const desde = Date.now() - this.ultima;
    if (desde < objetivo) {
      await new Promise((r) => setTimeout(r, objetivo - desde));
    }
    this.ultima = Date.now();
  }

  /**
   * Pide una ruta de la API. Devuelve el JSON, o null si no se pudo.
   * @param permanente true cuando la respuesta no puede cambiar (partido ya
   *        jugado): entonces la copia en disco vale para siempre.
   */
  async pide(ruta, { permanente = false } = {}) {
    const url = `${RAIZ}${ruta}`;
    const archivo = this.rutaDe(url);
    const CADUCA = 6 * 3600 * 1000;

    if (!this.forzar && fs.existsSync(archivo)) {
      const edad = Date.now() - fs.statSync(archivo).mtimeMs;
      if (permanente || edad < CADUCA) {
        try {
          const guardado = JSON.parse(fs.readFileSync(archivo, 'utf8'));
          this.cache++;
          // Un 404 tambien se recuerda: hay partidos sin estadisticas
          // publicadas y volver a pedirlos cada dia no los va a crear.
          return guardado.vacio ? null : guardado.datos;
        } catch {
          /* copia rota: se vuelve a pedir */
        }
      }
    }

    // Sin el binario nativo no hay con que pedir nada nuevo: lo de cache ya
    // se devolvio arriba: de aqui para abajo solo hay peticiones de red.
    if (!get) {
      this.cortado = true;
      return null;
    }

    if (this.cortado) return null;

    /*
     * Un 403 puede ser "no te queremos aqui" o "esa huella ya no cuela". Antes
     * se daban por lo mismo y a los tres seguidos se cerraba el grifo para toda
     * la importacion; el dia que SofaScore dejo de aceptar Chrome, eso significo
     * publicar sin sus estadisticas sin que nadie se enterara. Ahora, antes de
     * rendirse, se prueban las demas huellas.
     */
    let respuesta = null;
    for (let intento = 0; intento < HUELLAS.length; intento++) {
      await this.espera();
      try {
        respuesta = await get(url, peticion());
      } catch {
        respuesta = null;
      }
      const bloqueado = !respuesta || respuesta.status === 403 || respuesta.status === 429;
      if (!bloqueado) break;
      if (intento === HUELLAS.length - 1) break;
      const siguiente = (huella + 1) % HUELLAS.length;
      console.error(
        `  (SofaScore rechaza la huella ${HUELLAS[huella]}: se prueba con ${HUELLAS[siguiente]})`,
      );
      huella = siguiente;
    }

    if (!respuesta) {
      this.fallos++;
      return null;
    }

    if (respuesta.status === 403 || respuesta.status === 429) {
      this.fallos++;
      if (this.fallos >= 3) this.cortado = true;
      return null;
    }
    if (respuesta.status === 404) {
      // No existe y no va a existir: se apunta para no volver a preguntarlo.
      fs.writeFileSync(archivo, JSON.stringify({ vacio: true }));
      this.nuevas++;
      return null;
    }
    if (!respuesta.ok) {
      this.fallos++;
      return null;
    }

    let cuerpo = respuesta.content;
    // La API responde comprimido y curl-cffi-node no lo descomprime solo.
    if ((respuesta.headers.get('content-encoding') ?? '').includes('gzip')) {
      try {
        cuerpo = zlib.gunzipSync(cuerpo);
      } catch {
        this.fallos++;
        return null;
      }
    }

    let datos;
    try {
      datos = JSON.parse(cuerpo.toString('utf8'));
    } catch {
      this.fallos++;
      return null;
    }

    this.nuevas++;
    this.fallos = 0;
    fs.writeFileSync(archivo, JSON.stringify({ datos }));
    return datos;
  }

  resumen() {
    return {
      nuevas: this.nuevas,
      cache: this.cache,
      cortado: this.cortado,
      // Con cuál se acabó hablando: si un día vuelve a fallar, el registro dice
      // cuál dejó de valer sin tener que reproducirlo a mano.
      huella: huellaEnUso(),
    };
  }
}

/* -------------------------------------------------------------- calendario */

/** Un partido del calendario de SofaScore, con lo justo para casarlo con ESPN. */
function partidoDe(evento) {
  if (!evento?.id || !evento.homeTeam?.name || !evento.awayTeam?.name) return null;
  return {
    idSofa: evento.id,
    fecha: new Date((evento.startTimestamp ?? 0) * 1000).toISOString(),
    local: evento.homeTeam.name,
    visitante: evento.awayTeam.name,
    golesLocal: evento.homeScore?.current ?? null,
    golesVisitante: evento.awayScore?.current ?? null,
    terminado: evento.status?.type === 'finished',
  };
}

/**
 * Calendario de una competicion: lo jugado y lo que viene.
 *
 * SofaScore pagina lo jugado de mas antiguo a mas reciente, y no dice cuantas
 * paginas hay hasta que se llega al final, asi que se recorren en orden. Cada
 * pagina intermedia se cachea para siempre —ya no puede cambiar— y solo la
 * ultima y la de proximos se vuelven a pedir en cada importacion.
 */
async function calendario(cliente, torneoId, { desde, maxPaginas = 20 } = {}) {
  const seasons = await cliente.pide(`/unique-tournament/${torneoId}/seasons`);
  const temporadas = (seasons?.seasons ?? []).slice(0, 2);
  if (!temporadas.length) return [];

  const partidos = [];
  for (const t of temporadas) {
    const deEsta = [];
    for (let pagina = 0; pagina < maxPaginas; pagina++) {
      const r = await cliente.pide(
        `/unique-tournament/${torneoId}/season/${t.id}/events/last/${pagina}`,
        // La ultima pagina sigue creciendo con cada jornada; las de atras no.
        { permanente: false },
      );
      if (!r) break;
      for (const e of r.events ?? []) {
        const p = partidoDe(e);
        if (p) deEsta.push(p);
      }
      if (!r.hasNextPage) break;
    }
    partidos.push(...deEsta);

    // La temporada anterior solo se baja si el historial de ESPN llega antes
    // de donde empieza esta: si no, son doscientas peticiones para nada.
    const masViejo = deEsta.reduce((a, p) => (a && a < p.fecha ? a : p.fecha), null);
    if (!desde || (masViejo && masViejo <= desde)) break;
  }

  // Y lo que aun no se ha jugado, para poder pegar tambien las alineaciones
  // probables de la proxima jornada.
  for (let pagina = 0; pagina < 2; pagina++) {
    const r = await cliente.pide(`/unique-tournament/${torneoId}/season/${temporadas[0].id}/events/next/${pagina}`);
    if (!r) break;
    for (const e of r.events ?? []) {
      const p = partidoDe(e);
      if (p) partidos.push(p);
    }
    if (!r.hasNextPage) break;
  }

  return partidos;
}

/* ------------------------------------------------------ estadisticas equipo */

/**
 * Las globales de los dos equipos.
 *
 * Se lee solo el periodo 'ALL': los grupos por parte repiten las mismas claves
 * y sobreescribirian el total con los datos de media hora de juego.
 */
async function estadisticas(cliente, idSofa) {
  const datos = await cliente.pide(`/event/${idSofa}/statistics`, { permanente: true });
  const bloque = (datos?.statistics ?? []).find((s) => s.period === 'ALL');
  if (!bloque) return null;

  const crudo = {};
  for (const grupo of bloque.groups ?? []) {
    for (const item of grupo.statisticsItems ?? []) {
      if (!item.key) continue;
      crudo[item.key] = {
        local: item.homeValue,
        visitante: item.awayValue,
        localTotal: item.homeTotal,
        visitanteTotal: item.awayTotal,
      };
    }
  }
  if (!Object.keys(crudo).length) return null;

  const lado = (cual) => {
    const v = (clave) => {
      const x = crudo[clave]?.[cual];
      return x === null || x === undefined ? null : num(x);
    };
    const pases = v('passes');
    const acertados = v('accuratePasses');
    return {
      remates: v('totalShotsOnGoal'),
      rematesPuerta: v('shotsOnGoal'),
      posesion: v('ballPossession'),
      corners: v('cornerKicks'),
      faltas: v('fouls'),
      amarillas: v('yellowCards'),
      rojas: v('redCards'),
      fueraJuego: v('offsides'),
      xg: v('expectedGoals'),
      pases,
      // La API da los pases buenos, no el porcentaje; la app guarda el porcentaje.
      precisionPases:
        pases && acertados !== null ? Number(((acertados / pases) * 100).toFixed(1)) : null,
    };
  };

  return { local: lado('local'), visitante: lado('visitante') };
}

/* --------------------------------------------------- estadisticas jugador */

const POSICIONES = { G: 'POR', D: 'DEF', M: 'MED', F: 'DEL' };

/**
 * La linea de un jugador, con TODO lo que publica SofaScore traducido a los
 * campos de `RegistroJugador`. Los quince que ESPN deja siempre a cero
 * —pases clave, regates, entradas, intercepciones, despejes, duelos, toques,
 * centros, xG, xA y la nota— salen justo de aqui.
 */
function registroDe(entrada) {
  const s = entrada?.statistics;
  if (!s) return null;

  const remates = num(s.totalShots);
  const puerta = num(s.onTargetScoringAttempt);
  const bloqueados = num(s.blockedScoringAttempt);
  const fuera = num(s.shotOffTarget) + num(s.hitWoodwork);

  return {
    minutos: num(s.minutesPlayed),
    titular: !entrada.substitute,
    goles: num(s.goals),
    asistencias: num(s.goalAssist),
    remates,
    rematesPuerta: puerta,
    // Si no vienen desglosados, lo que queda de restar al total.
    rematesFuera: fuera || Math.max(0, remates - puerta - bloqueados),
    rematesBloqueados: bloqueados,
    pasesClave: num(s.keyPass),
    regates: num(s.wonContest),
    regatesIntentados: num(s.totalContest),
    faltasCometidas: num(s.fouls),
    faltasRecibidas: num(s.wasFouled),
    entradas: num(s.totalTackle),
    intercepciones: num(s.interceptionWon),
    despejes: num(s.totalClearance),
    duelosGanados: num(s.duelWon),
    duelosTotales: num(s.duelWon) + num(s.duelLost),
    toquesArea: num(s.touchesInOppBox),
    toques: num(s.touches),
    pases: num(s.totalPass),
    pasesCompletados: num(s.accuratePass),
    centros: num(s.totalCross),
    centrosCompletados: num(s.accurateCross),
    // Las tarjetas no vienen en las estadisticas del jugador; las pone el
    // acta del partido (`incidents`), que se lee aparte.
    amarillas: 0,
    rojas: 0,
    paradas: num(s.saves),
    golesEncajados: num(s.goalsConceded),
    // Redondeados: la API da el xA con siete decimales y son veinte mil
    // registros, o sea medio mega de digitos que no cambian ningun pronostico.
    xg: Number(num(s.expectedGoals).toFixed(2)),
    xa: Number(num(s.expectedAssists).toFixed(2)),
    nota: num(s.rating) || 6.2,
  };
}

/** Los jugadores de los dos equipos, con su ficha y su linea del partido. */
async function alineaciones(cliente, idSofa) {
  const datos = await cliente.pide(`/event/${idSofa}/lineups`, { permanente: true });
  if (!datos?.home?.players && !datos?.away?.players) return null;

  const lado = (bloque) =>
    (bloque?.players ?? [])
      .filter((p) => p.player?.id && p.player?.name)
      .map((p) => ({
        idSofa: p.player.id,
        nombre: p.player.name,
        dorsal: num(p.shirtNumber ?? p.jerseyNumber),
        posicion: POSICIONES[p.position ?? p.player.position] ?? 'MED',
        pais: p.player.country?.name ?? '',
        registro: registroDe(p),
      }));

  return {
    local: lado(datos.home),
    visitante: lado(datos.away),
    formacionLocal: datos.home?.formation,
    formacionVisitante: datos.away?.formation,
  };
}

/**
 * Las tarjetas de cada jugador, que no van en su linea de estadisticas sino en
 * el acta. Devuelve un mapa idSofa -> {amarillas, rojas}.
 */
async function tarjetas(cliente, idSofa) {
  const datos = await cliente.pide(`/event/${idSofa}/incidents`, { permanente: true });
  const salida = new Map();
  for (const i of datos?.incidents ?? []) {
    if (i.incidentType !== 'card') continue;
    const jugador = i.player?.id;
    if (!jugador) continue;
    const actual = salida.get(jugador) ?? { amarillas: 0, rojas: 0 };
    if (i.incidentClass === 'red' || i.incidentClass === 'yellowRed') actual.rojas++;
    else actual.amarillas++;
    salida.set(jugador, actual);
  }
  return salida;
}

/** Todo lo de un partido en una sola llamada: globales, jugadores y tarjetas. */
async function detalle(cliente, idSofa) {
  const [globales, plantillas] = await Promise.all([
    estadisticas(cliente, idSofa),
    alineaciones(cliente, idSofa),
  ]);
  if (!globales && !plantillas) return null;

  if (plantillas) {
    const porJugador = await tarjetas(cliente, idSofa);
    for (const lista of [plantillas.local, plantillas.visitante]) {
      for (const j of lista) {
        const t = porJugador.get(j.idSofa);
        if (t && j.registro) {
          j.registro.amarillas = t.amarillas;
          j.registro.rojas = t.rojas;
        }
      }
    }
  }

  return { globales, plantillas };
}

module.exports = {
  Cliente,
  TORNEOS,
  IMPORTABLES,
  calendario,
  estadisticas,
  alineaciones,
  detalle,
  // Para `scripts/probar-sofascore.js`: la prueba tiene que usar exactamente
  // las mismas huellas que el bot, o no dice nada de lo que el bot hace.
  HUELLAS,
};
