'use strict';
/* ==========================================================================
   Scout Picks · lib/sofascore.js
   Lee un volcado LOCAL de SofaScore y lo convierte en estadisticas de partido.

   No hace ni una peticion de red: la fuente es un archivo de texto que el
   usuario deja en scripts/sofascore_raw.txt. De ahi salen las cuatro cosas que
   ESPN no da, o da estimadas —xG real, remates, remates a puerta y corners— y
   que el modelo de pronosticos necesita.

   Por que el analizador es tan permisivo:
   ese archivo lo genera una persona, no una API con contrato. Puede ser el
   JSON crudo del endpoint, un JSON por linea, o el copiar-y-pegar de la tabla
   de estadisticas de la web. Los tres caen aqui y los tres se entienden, en
   ingles o en español. Lo que no se entienda se cuenta en `avisos` en vez de
   romper la importacion: ESPN ya trajo sus datos y no se pierden por esto.
   ========================================================================== */

const fs = require('node:fs');

/** Quita acentos, signos y mayusculas: para comparar etiquetas y nombres. */
const normaliza = (s) =>
  (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

/*
 * Las etiquetas de cada estadistica, en los idiomas y variantes con que
 * SofaScore las publica. La clave es el campo de la app; el valor, todo lo que
 * puede aparecer escrito en el archivo.
 *
 * Se comparan normalizadas, asi que "Expected goals (xG)", "expectedgoals" y
 * "Goles esperados" caen en la misma casilla.
 */
const ETIQUETAS = {
  xg: ['expected goals', 'expected goals xg', 'xg', 'goles esperados', 'expectedgoals'],
  remates: ['total shots', 'shots', 'remates', 'tiros', 'disparos', 'tiros totales', 'remates totales'],
  rematesPuerta: [
    'shots on target', 'shots on goal', 'on target', 'tiros a puerta', 'remates a puerta',
    'tiros al arco', 'disparos a puerta', 'tiros a porteria',
  ],
  corners: ['corner kicks', 'corners', 'saques de esquina', 'tiros de esquina'],
  posesion: ['ball possession', 'possession', 'posesion', 'posesion de balon'],
  faltas: ['fouls', 'faltas'],
  amarillas: ['yellow cards', 'tarjetas amarillas', 'amarillas'],
  rojas: ['red cards', 'tarjetas rojas', 'rojas'],
  fueraJuego: ['offsides', 'fuera de juego', 'fueras de juego', 'offside'],
  pases: ['passes', 'total passes', 'pases', 'pases totales'],
  precisionPases: ['accurate passes', 'pass accuracy', 'precision de pases', 'pases acertados'],
};

/** Devuelve el campo de la app al que corresponde una etiqueta, o null. */
function campoDe(etiqueta) {
  const e = normaliza(etiqueta);
  if (!e) return null;
  // Igualdad primero: "shots" no debe llevarse lo que es "shots on target".
  for (const [campo, variantes] of Object.entries(ETIQUETAS)) {
    for (const v of variantes) if (e === normaliza(v)) return campo;
  }
  // Y despues por contenido, que es como llegan los sufijos de la web:
  // "Expected goals (xG)" o "Corner kicks 1st half".
  for (const [campo, variantes] of Object.entries(ETIQUETAS)) {
    for (const v of variantes) {
      const n = normaliza(v);
      if (n.length >= 5 && e.includes(n)) return campo;
    }
  }
  return null;
}

/*
 * Un numero de dentro del archivo.
 *
 * Aqui llegan cosas como "55%", "1.85", "12", "1,85" y "342/389 (88%)". De la
 * ultima interesa el primer numero, que son los pases dados, no el porcentaje.
 * Devuelve null si no hay ninguno, que no es lo mismo que un cero.
 */
function numero(bruto) {
  if (bruto === null || bruto === undefined) return null;
  if (typeof bruto === 'number') return Number.isFinite(bruto) ? bruto : null;
  const texto = String(bruto).trim();
  if (!texto) return null;
  const m = texto.match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  const n = Number(m[0].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Una fecha ISO a partir de lo que traiga el archivo, o null. */
function fecha(bruto) {
  if (bruto === null || bruto === undefined) return null;
  // Marca de tiempo de la API de SofaScore: viene en segundos, no en milisegundos.
  if (typeof bruto === 'number') {
    const d = new Date(bruto > 1e11 ? bruto : bruto * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const texto = String(bruto).trim();
  if (!texto) return null;
  // dd/mm/aaaa y dd-mm-aaaa, que es como lo escribe la web en español.
  const eur = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (eur) {
    const d = new Date(Date.UTC(Number(eur[3]), Number(eur[2]) - 1, Number(eur[1])));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(texto);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Ficha vacia de un partido leido del archivo. */
function partidoVacio() {
  return {
    fecha: null,
    local: '',
    visitante: '',
    golesLocal: null,
    golesVisitante: null,
    estadisticas: { local: {}, visitante: {} },
  };
}

/** true si el partido trae algo aprovechable ademas de los dos nombres. */
function tieneSustancia(p) {
  if (!p || !p.local || !p.visitante) return false;
  return (
    Object.keys(p.estadisticas.local).length > 0 ||
    Object.keys(p.estadisticas.visitante).length > 0 ||
    p.golesLocal !== null
  );
}

/* ------------------------------------------------------------------ JSON  */

/** Saca un nombre de equipo de un objeto o de una cadena. */
function nombreEquipo(bruto) {
  if (!bruto) return '';
  if (typeof bruto === 'string') return bruto.trim();
  return (bruto.name || bruto.nombre || bruto.shortName || bruto.slug || '').toString().trim();
}

/** Saca el marcador de {current: 2} o de un numero suelto. */
function marcador(bruto) {
  if (bruto === null || bruto === undefined) return null;
  if (typeof bruto === 'number') return bruto;
  if (typeof bruto === 'object') return numero(bruto.current ?? bruto.normaltime ?? bruto.display);
  return numero(bruto);
}

/*
 * Las estadisticas dentro del JSON de SofaScore van en tres niveles:
 * statistics[] -> groups[] -> statisticsItems[] -> {name, home, away}.
 * Se recorre sin dar por hecha la forma: si falta un nivel, se salta.
 */
function estadisticasDeJson(nodo, destino) {
  if (!nodo) return;
  for (const bloque of Array.isArray(nodo) ? nodo : [nodo]) {
    if (!bloque || typeof bloque !== 'object') continue;
    // Solo el partido entero: los periodos repiten las mismas etiquetas y
    // sobreescribirian el total con los datos de una sola parte.
    if (bloque.period && normaliza(bloque.period) !== 'all') continue;
    for (const grupo of bloque.groups ?? []) {
      for (const item of grupo.statisticsItems ?? []) {
        const campo = campoDe(item.name ?? item.key);
        if (!campo) continue;
        const local = numero(item.home ?? item.homeValue);
        const visitante = numero(item.away ?? item.awayValue);
        if (local !== null) destino.local[campo] = local;
        if (visitante !== null) destino.visitante[campo] = visitante;
      }
    }
  }
}

/** Convierte un objeto suelto del JSON en un partido, si lo parece. */
function partidoDeJson(nodo) {
  if (!nodo || typeof nodo !== 'object') return null;
  const p = partidoVacio();
  p.local = nombreEquipo(nodo.homeTeam ?? nodo.home ?? nodo.local);
  p.visitante = nombreEquipo(nodo.awayTeam ?? nodo.away ?? nodo.visitante);
  if (!p.local || !p.visitante) return null;

  p.fecha = fecha(nodo.startTimestamp ?? nodo.fecha ?? nodo.date ?? nodo.startTime);
  p.golesLocal = marcador(nodo.homeScore ?? nodo.golesLocal ?? nodo.homeGoals);
  p.golesVisitante = marcador(nodo.awayScore ?? nodo.golesVisitante ?? nodo.awayGoals);

  estadisticasDeJson(nodo.statistics ?? nodo.estadisticas, p.estadisticas);

  /*
   * Y el caso plano: {xg: {home, away}}, que es como queda cuando alguien se
   * arma el volcado a mano en vez de guardar la respuesta tal cual.
   */
  for (const campo of Object.keys(ETIQUETAS)) {
    const directo = nodo[campo];
    if (directo && typeof directo === 'object') {
      const l = numero(directo.home ?? directo.local);
      const v = numero(directo.away ?? directo.visitante);
      if (l !== null) p.estadisticas.local[campo] = l;
      if (v !== null) p.estadisticas.visitante[campo] = v;
    }
  }
  return tieneSustancia(p) ? p : null;
}

/** Recorre un JSON de cualquier forma y recoge todo lo que parezca partido. */
function recorreJson(nodo, salida, profundidad = 0) {
  if (!nodo || typeof nodo !== 'object' || profundidad > 6) return;
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) recorreJson(hijo, salida, profundidad + 1);
    return;
  }
  const p = partidoDeJson(nodo);
  if (p) {
    salida.push(p);
    return; // este nivel ya esta leido entero; bajar mas duplicaria el partido
  }
  for (const hijo of Object.values(nodo)) recorreJson(hijo, salida, profundidad + 1);
}

/* ------------------------------------------------------------------ texto */

/*
 * La cabecera de un partido dentro del texto pegado.
 *
 * Cubre "Arsenal 2 - 1 Chelsea", "Arsenal 2-1 Chelsea", "Arsenal vs Chelsea" y
 * "Arsenal - Chelsea". Los nombres se quedan con lo que haya a cada lado, que
 * luego se casa por parecido contra los equipos que ya trajo ESPN.
 */
const CON_MARCADOR = /^(.{2,60}?)\s+(\d{1,2})\s*[-:]\s*(\d{1,2})\s+(.{2,60}?)$/;
const SIN_MARCADOR = /^(.{2,60}?)\s+(?:vs\.?|v\.?|-|–|contra)\s+(.{2,60}?)$/i;

/*
 * Una linea de estadistica. Los dos ordenes que se ven en la practica:
 *   "1.85  Expected goals (xG)  0.94"   (columnas de la web)
 *   "Expected goals (xG)  1.85  0.94"   (tabla exportada)
 * El separador puede ser tabulador o varios espacios.
 */
const VALOR_ETIQUETA_VALOR = /^([\d.,]+%?)\s+(.+?)\s+([\d.,]+%?)$/;
const ETIQUETA_VALOR_VALOR = /^(.+?)[\s:]+([\d.,]+%?)\s+([\d.,]+%?)$/;

/** Analiza el volcado como texto pegado de la web. */
function analizaTexto(texto, avisos) {
  const partidos = [];
  let actual = null;
  let fechaSuelta = null;
  let sinReconocer = 0;

  const cierra = () => {
    if (actual && tieneSustancia(actual)) partidos.push(actual);
    actual = null;
  };

  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.trim();
    if (!linea) continue;

    // Una fecha sola en su linea se guarda para el partido que venga detras.
    if (linea.length <= 30 && /^(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})/.test(linea)) {
      const f = fecha(linea);
      if (f) {
        fechaSuelta = f;
        continue;
      }
    }

    /*
     * Las estadisticas se prueban antes que la cabecera.
     *
     * "12 Corners 8" tambien encaja en el patron de marcador, y si se mirase
     * primero la cabecera cada linea de estadistica abriria un partido nuevo
     * llamado "12" contra "8". Estando dentro de un partido, una linea con dos
     * numeros es siempre una estadistica.
     */
    if (actual) {
      let etiqueta = null;
      let local = null;
      let visitante = null;
      let m = linea.match(VALOR_ETIQUETA_VALOR);
      if (m) {
        [etiqueta, local, visitante] = [m[2], numero(m[1]), numero(m[3])];
      } else {
        m = linea.match(ETIQUETA_VALOR_VALOR);
        if (m) [etiqueta, local, visitante] = [m[1], numero(m[2]), numero(m[3])];
      }
      if (etiqueta) {
        const campo = campoDe(etiqueta);
        if (campo) {
          if (local !== null) actual.estadisticas.local[campo] = local;
          if (visitante !== null) actual.estadisticas.visitante[campo] = visitante;
        }
        // Si no se reconocio, es una estadistica que la app no usa (duelos,
        // despejes, paradas...). Se ignora sin contarla como linea perdida.
        continue;
      }
    }

    const conMarcador = linea.match(CON_MARCADOR);
    if (conMarcador) {
      cierra();
      actual = partidoVacio();
      actual.local = conMarcador[1].trim();
      actual.golesLocal = Number(conMarcador[2]);
      actual.golesVisitante = Number(conMarcador[3]);
      actual.visitante = conMarcador[4].trim();
      actual.fecha = fechaSuelta;
      fechaSuelta = null;
      continue;
    }

    const sinMarcador = linea.match(SIN_MARCADOR);
    if (sinMarcador) {
      cierra();
      actual = partidoVacio();
      actual.local = sinMarcador[1].trim();
      actual.visitante = sinMarcador[2].trim();
      actual.fecha = fechaSuelta;
      fechaSuelta = null;
      continue;
    }

    if (!actual) sinReconocer++;
  }
  cierra();

  if (sinReconocer > 0 && !partidos.length) {
    avisos.push(
      `No se reconoció ninguna cabecera de partido en ${sinReconocer} líneas. ` +
        'Se espera algo como "Arsenal 2 - 1 Chelsea" y debajo sus estadísticas.',
    );
  }
  return partidos;
}

/* ----------------------------------------------------------------- publico */

/**
 * Lee y analiza el archivo. Nunca lanza por un archivo raro: devuelve lo que
 * haya entendido y el resto en `avisos`, porque esto es un extra encima de
 * ESPN y no debe tumbar una importacion que ya trae datos buenos.
 */
function lee(ruta) {
  const vacio = { partidos: [], avisos: [], formato: null, existe: false };
  if (!fs.existsSync(ruta)) return vacio;

  let texto;
  try {
    texto = fs.readFileSync(ruta, 'utf8');
  } catch (e) {
    return { ...vacio, existe: true, avisos: [`No se pudo leer el archivo: ${e.message}`] };
  }
  // El Bloc de notas de Windows guarda con marca de orden de bytes, y el
  // JSON.parse revienta por ese caracter invisible del principio.
  texto = texto.replace(/^﻿/, '');
  if (!texto.trim()) return { ...vacio, existe: true, avisos: ['El archivo está vacío.'] };

  const avisos = [];

  // 1. JSON entero.
  try {
    const json = JSON.parse(texto);
    const partidos = [];
    recorreJson(json, partidos);
    if (partidos.length) return { partidos, avisos, formato: 'json', existe: true };
    avisos.push('El archivo es JSON válido, pero no se encontró ningún partido dentro.');
    return { partidos: [], avisos, formato: 'json', existe: true };
  } catch {
    /* no era JSON entero; se sigue probando */
  }

  // 2. Un JSON por linea.
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim().startsWith('{'));
  if (lineas.length) {
    const partidos = [];
    let rotas = 0;
    for (const l of lineas) {
      try {
        recorreJson(JSON.parse(l), partidos);
      } catch {
        rotas++;
      }
    }
    if (partidos.length) {
      if (rotas) avisos.push(`${rotas} líneas JSON no se pudieron leer y se saltaron.`);
      return { partidos, avisos, formato: 'json-por-linea', existe: true };
    }
  }

  // 3. Texto pegado de la web.
  const partidos = analizaTexto(texto, avisos);
  return { partidos, avisos, formato: 'texto', existe: true };
}

/*
 * Pega lo leido encima de los partidos que ya armo ESPN.
 *
 * Solo rellena partidos que ya existen: nunca crea partidos ni equipos, para
 * que un archivo con otra liga dentro no ensucie esta.
 *
 * El encaje se hace por los dos nombres de equipo y, si el archivo trae fecha,
 * tambien por fecha. Y hay un tercer cerrojo: si el archivo trae marcador y no
 * cuadra con el del partido, no es ese partido y se descarta. Sin esa
 * comprobacion, dos temporadas de historial hacen que "Arsenal - Chelsea"
 * encaje con el del año pasado y las estadisticas acaben en el partido
 * equivocado, que es peor que no tenerlas.
 *
 * `parecido` se recibe de fuera (`construir.parecido`) para no duplicar aqui la
 * unica funcion que sabe que "Man City" y "Manchester City" son lo mismo.
 */
function pega(partidos, equipos, leidos, parecido) {
  const nombre = new Map(equipos.map((e) => [e.id, e.nombre]));
  const conXgReal = new Set();
  let pegados = 0;
  let sinEncaje = 0;

  for (const s of leidos) {
    const candidatos = partidos.filter((p) => {
      const local = nombre.get(p.localId);
      const visitante = nombre.get(p.visitanteId);
      if (!local || !visitante) return false;
      if (parecido(s.local, local) < 0.72) return false;
      if (parecido(s.visitante, visitante) < 0.72) return false;
      if (s.fecha) {
        const dias = Math.abs(new Date(s.fecha) - new Date(p.fecha)) / 86400000;
        if (dias > 2) return false;
      }
      if (s.golesLocal !== null && s.golesVisitante !== null && p.estado === 'finalizado') {
        if (s.golesLocal !== p.golesLocal || s.golesVisitante !== p.golesVisitante) return false;
      }
      return true;
    });
    if (!candidatos.length) {
      sinEncaje++;
      continue;
    }

    // Sin fecha en el archivo pueden quedar varios: se coge el mas reciente,
    // que es el que casi siempre se acaba de copiar de la web.
    const partido = candidatos.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')).pop();

    let algo = false;
    for (const lado of ['local', 'visitante']) {
      const suyas = s.estadisticas[lado];
      if (!suyas || !Object.keys(suyas).length) continue;
      partido.estadisticas[lado] = { ...partido.estadisticas[lado], ...suyas };
      algo = true;
      // El xG de ESPN no existe: `construir.js` lo estima a partir del propio
      // gol. El de SofaScore es medido, y es el que hace util el modelo.
      if (typeof suyas.xg === 'number' && suyas.xg > 0) conXgReal.add(partido.id);
    }
    if (algo) pegados++;
  }

  return { pegados, sinEncaje, conXgReal };
}

module.exports = { lee, pega, campoDe, numero, normaliza, ETIQUETAS };
