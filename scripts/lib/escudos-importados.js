'use strict';

/**
 * Escudos para los equipos importados que llegan sin él.
 *
 * ── Por qué ────────────────────────────────────────────────────────────────
 *
 * El escudo de un equipo importado sale de ESPN, en la misma respuesta del
 * partido. Cuando ESPN no lo manda —pasa con muchos clubes sudamericanos, de
 * segunda o de las copas—, el equipo se quedaba sin escudo para siempre: el
 * paso de imágenes solo buscaba los 224 equipos escritos a mano y a estos no
 * los miraba nunca. En la app salían con las siglas o la bandera.
 *
 * ── Cómo ───────────────────────────────────────────────────────────────────
 *
 * 1. Primero entre los equipos de su propia liga en TheSportsDB, que se piden
 *    de una vez (una petición por liga, no una por equipo). Dentro de una liga
 *    hay veinte candidatos y casi nunca dos que se parezcan: es la forma más
 *    segura de no colgarle a un club el escudo de otro.
 * 2. Si no está ahí —equipos de las copas o de ligas sin mapear—, en todas las
 *    ligas cargadas, pero solo si el nombre coincide entero.
 * 3. Y como último recurso, buscándolo por nombre, también solo si coincide
 *    entero, y con un tope por pasada para no eternizar el bot. Lo que no
 *    entre esta noche entra la siguiente: las respuestas quedan en caché.
 *
 * Un escudo que no se encuentra se deja sin poner. Mejor las siglas que el
 * escudo de otro equipo.
 *
 * ── Homónimos ──────────────────────────────────────────────────────────────
 *
 * El catálogo de la app se consulta por nombre, y hay clubes distintos que se
 * llaman igual: el River Plate argentino y el de Montevideo. Por eso cada
 * escudo se apunta también con el identificador del equipo importado
 * (`uruguay:riverplate`), que no se repite nunca, y por nombre solo cuando el
 * nombre no está en dos ligas de países distintos. Un nombre así se resuelve
 * liga por liga y nunca "por nombre exacto en cualquier liga", que es justo
 * donde se cruzarían.
 */

const { claveEstricta, parecido } = require('./thesportsdb');

/** Cuántos se buscan uno a uno como mucho en cada pasada. */
const TOPE_BUSQUEDAS = 120;

/**
 * Los equipos de los datos importados que no traen escudo, agrupados por
 * nombre. Cada grupo lleva sus apariciones: en qué competición y con qué
 * identificador.
 */
function sinEscudo(archivo) {
  const porClave = new Map();
  for (const [competicionId, c] of Object.entries(archivo?.competiciones ?? {})) {
    for (const e of c.equipos ?? []) {
      if (!e?.nombre || e.escudo) continue;
      const clave = claveEstricta(e.nombre);
      if (!clave) continue;
      const aparicion = { id: e.id, competicionId };
      const ya = porClave.get(clave);
      if (ya) ya.apariciones.push(aparicion);
      else porClave.set(clave, { nombre: e.nombre, clave, apariciones: [aparicion] });
    }
  }
  return [...porClave.values()];
}

const escudoDe = (t) => t?.strBadge || t?.strTeamBadge || null;

/** Los nombres con los que TheSportsDB conoce a un equipo. */
function nombresDe(t) {
  return [t.strTeam, ...String(t.strTeamAlternate ?? '').split(',')]
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * El equipo de la lista que mejor casa con el nombre.
 *
 * `umbral` 2 significa "solo nombre exacto". Si hay dos candidatos distintos
 * empatados en lo más alto no se elige ninguno: es justo el caso en el que se
 * le pondría a un equipo el escudo de otro.
 */
function mejorEn(nombre, lista, umbral) {
  const clave = claveEstricta(nombre);
  let mejor = null;
  let puntos = 0;
  let empate = false;
  for (const t of lista) {
    if (!escudoDe(t)) continue;
    const nombres = nombresDe(t);
    const p = nombres.some((n) => claveEstricta(n) === clave)
      ? 2
      : Math.max(...nombres.map((n) => parecido(nombre, n)));
    if (p > puntos) {
      puntos = p;
      mejor = t;
      empate = false;
    } else if (p === puntos && mejor && escudoDe(t) !== escudoDe(mejor)) {
      empate = true;
    }
  }
  if (!mejor || puntos < umbral || empate) return null;
  return mejor;
}

/**
 * Busca y apunta en `logos.equipos` los escudos que faltan.
 *
 * @param buscador el de `thesportsdb.js` (o uno que conteste igual)
 * @param logos el catálogo que se está construyendo; se modifica aquí
 * @param archivo los datos importados (`importado.json` ya leído)
 * @param ligaEnIngles competición de la app → nombre de su liga en TheSportsDB
 * @returns el recuento, para el parte del bot
 */
async function resuelveEscudosImportados(buscador, logos, archivo, ligaEnIngles) {
  const faltan = sinEscudo(archivo).filter(
    (e) => !logos.equipos[e.clave] && !e.apariciones.every((a) => a.id && logos.equipos[a.id]),
  );
  const parte = { sinEscudo: faltan.length, porLiga: 0, porNombre: 0, buscados: 0, quedan: [] };
  if (!faltan.length) return parte;

  // Las ligas que se van a necesitar, cada una con todos sus equipos.
  const ligas = await buscador.ligas();
  /*
   * Si ni siquiera contesta la lista de ligas, la fuente está caída: se deja
   * para la próxima pasada. Seguir buscando uno a uno con los reintentos
   * alargaría el bot un cuarto de hora para no encontrar nada.
   */
  if (!ligas?.length) {
    parte.quedan = faltan.map((e) => e.nombre);
    return parte;
  }
  const idDeLiga = new Map(ligas.map((l) => [claveEstricta(l.strLeague), l.idLeague]));
  const equiposDeLaLiga = new Map();
  const todos = [];
  for (const [competicionId, nombreLiga] of Object.entries(ligaEnIngles)) {
    const id = idDeLiga.get(claveEstricta(nombreLiga));
    if (!id) continue;
    const equipos = await buscador.equiposDeLiga(id);
    equiposDeLaLiga.set(competicionId, equipos);
    todos.push(...equipos);
  }

  /** Apunta un escudo para todas las apariciones del grupo, y por nombre si se puede. */
  const apunta = (e, url, porNombre) => {
    for (const a of e.apariciones) if (a.id) logos.equipos[a.id] = url;
    if (porNombre) logos.equipos[e.clave] = url;
  };

  let busquedas = 0;
  for (const e of faltan) {
    // ¿Está el nombre en dos ligas de países distintos? Entonces son clubes
    // distintos que se llaman igual.
    const ligasPropias = new Set(
      e.apariciones.map((a) => a.competicionId).filter((c) => equiposDeLaLiga.has(c)),
    );
    if (ligasPropias.size > 1) {
      // Uno a uno, cada cual en su liga, y solo por identificador.
      let alguno = false;
      for (const a of e.apariciones) {
        const t = equiposDeLaLiga.has(a.competicionId)
          ? mejorEn(e.nombre, equiposDeLaLiga.get(a.competicionId), 0.85)
          : null;
        if (t && a.id) {
          logos.equipos[a.id] = escudoDe(t);
          alguno = true;
        }
      }
      if (alguno) parte.porLiga++;
      else parte.quedan.push(e.nombre);
      continue;
    }

    // 1. En su propia liga, con margen para "FC", "Club"... y nombres largos.
    let t = null;
    for (const c of ligasPropias) {
      t = mejorEn(e.nombre, equiposDeLaLiga.get(c), 0.85);
      if (t) break;
    }
    if (t) {
      apunta(e, escudoDe(t), true);
      parte.porLiga++;
      continue;
    }

    // 2. En cualquier liga cargada, solo con el nombre exacto (y sin empates).
    t = mejorEn(e.nombre, todos, 2);
    if (t) {
      apunta(e, escudoDe(t), true);
      parte.porNombre++;
      continue;
    }

    // 3. Buscándolo, también solo exacto, y con tope.
    if (busquedas < TOPE_BUSQUEDAS) {
      busquedas++;
      parte.buscados++;
      const r = await buscador.escudo(e.nombre);
      if (r?.url && claveEstricta(r.fuente) === e.clave) {
        apunta(e, r.url, true);
        parte.porNombre++;
        continue;
      }
    }
    parte.quedan.push(e.nombre);
  }
  return parte;
}

module.exports = { resuelveEscudosImportados, sinEscudo, mejorEn, TOPE_BUSQUEDAS };
