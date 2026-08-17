#!/usr/bin/env node
'use strict';
/* ==========================================================================
   Scout Picks · logos.js
   Resuelve escudos de equipos, logos de competiciones y caras de jugadores.

   Uso:
     node scripts/logos.js                      (competiciones + equipos + estrellas)
     node scripts/logos.js --solo competiciones
     node scripts/logos.js --nivel 76           (baja el corte y busca mas caras)
     node scripts/logos.js --todos              (todos los jugadores escritos a mano)

   Fuentes:
     · Los logos de competicion salen del CDN de API-Football, que sirve las
       imagenes por id sin necesidad de clave.
     · Los escudos y las caras salen de TheSportsDB, una base comunitaria
       gratuita. Cada resultado se valida antes de darlo por bueno.

   Salida: src/datos/logos.json  (solo direcciones, no imagenes: pesa nada y
   expo-image ya se encarga de cachearlas en el movil).
   ========================================================================== */

const fs = require('node:fs');
const path = require('node:path');

const { Buscador, claveEstricta } = require('./lib/thesportsdb');
const { MAPA } = require('./lib/mapa-ligas');

const RAIZ = path.join(__dirname, '..');
const SALIDA = path.join(RAIZ, 'src', 'datos', 'logos.json');
const DIR_CACHE = path.join(RAIZ, '.cache-datos', 'logos');

const CDN = 'https://media.api-sports.io/football';

/** Nombres que la busqueda no resuelve sola. */
const ALIAS = {
  "Paris Saint-Germain": ["Paris SG", "PSG", "Paris Saint Germain"],
  "Olympique de Marsella": ["Marseille", "Olympique Marseille"],
  "AS Mónaco": ["Monaco", "AS Monaco"],
  "Lille OSC": ["LOSC Lille", "Lille"],
  "Olympique de Lyon": ["Olympique Lyonnais", "Lyon"],
  "OGC Niza": ["OGC Nice", "Nice"],
  "Stade Rennais": ["Stade Rennais", "Rennes"],
  "RC Estrasburgo": ["RC Strasbourg", "Strasbourg"],
  "RC Lens": ["RC Lens", "Lens"],
  "Stade Brestois": ["Stade Brestois 29", "Brest"],
  "Toulouse FC": ["Toulouse FC", "Toulouse"],
  "FC Nantes": ["FC Nantes", "Nantes"],
  "AJ Auxerre": ["AJ Auxerre", "Auxerre"],
  "Angers SCO": ["Angers SCO", "Angers"],
  "Montpellier HSC": ["Montpellier HSC", "Montpellier"],
  "Le Havre AC": ["Le Havre AC", "Le Havre"],
  "FC Metz": ["FC Metz", "Metz"],
  "Newcastle United": ["Newcastle United", "Newcastle"],
  "Nottingham Forest": ["Nottingham Forest", "Nott'm Forest"],
  "Sevilla": ["Sevilla FC", "Sevilla"],
  "Bologna": ["Bologna FC", "Bologna"],
  "FC St. Pauli": ["FC St. Pauli", "St Pauli"],
  "Hamburgo SV": ["Hamburger SV", "Hamburg"],
  "Slavia Praga": ["SK Slavia Prague", "Slavia Prague"],
  "Bodø/Glimt": ["FK Bodo/Glimt", "Bodo Glimt"],
  "Inter Miami CF": ["Inter Miami CF", "Inter Miami"],
  "LAFC": ["Los Angeles FC", "LAFC"],
  "San Lorenzo": ["San Lorenzo de Almagro", "San Lorenzo"],
  "Colo-Colo": ["CSD Colo Colo", "Colo-Colo"],
  "The Strongest": ["Strongest", "The Strongest"],
  "Nacional": ["Club Nacional de Football", "Nacional Montevideo"],
  "Olimpia": ["Club Olimpia", "Olimpia Asuncion"],
  'FC Barcelona': ['Barcelona'],
  'Atlético de Madrid': ['Atletico Madrid'],
  'Athletic Club': ['Athletic Bilbao'],
  'Real Betis': ['Real Betis Balompie'],
  'RCD Espanyol': ['Espanyol'],
  'Deportivo Alavés': ['Deportivo Alaves'],
  'Real Oviedo': ['Oviedo'],
  'Celta de Vigo': ['Celta Vigo'],
  'Rayo Vallecano': ['Rayo Vallecano'],
  'Inter de Milán': ['Inter Milan', 'Internazionale'],
  'AC Milan': ['AC Milan'],
  'AS Roma': ['AS Roma'],
  'Hellas Verona': ['Hellas Verona'],
  'Bayern de Múnich': ['Bayern Munich'],
  'Borussia Dortmund': ['Borussia Dortmund'],
  'Borussia Mönchengladbach': ['Borussia Monchengladbach'],
  'Eintracht Fráncfort': ['Eintracht Frankfurt'],
  'SC Friburgo': ['SC Freiburg'],
  'VfL Wolfsburgo': ['VfL Wolfsburg'],
  'Union Berlín': ['Union Berlin'],
  'FC Augsburgo': ['FC Augsburg'],
  '1. FC Colonia': ['FC Koln', 'FC Cologne'],
  'FC Heidenheim': ['1. FC Heidenheim'],
  'Paris FC': ['Paris FC'],
  'Manchester City': ['Manchester City'],
  'Wolverhampton': ['Wolverhampton Wanderers'],
  'Brighton': ['Brighton and Hove Albion'],
  'Bournemouth': ['AFC Bournemouth'],
  'Sporting CP': ['Sporting Lisbon', 'Sporting CP'],
  'FC Oporto': ['FC Porto'],
  'SC Braga': ['Sporting Braga'],
  'Benfica': ['SL Benfica'],
  'Club Brujas': ['Club Brugge'],
  'Red Bull Salzburgo': ['Red Bull Salzburg'],
  'Shakhtar Donetsk': ['Shakhtar Donetsk'],
  'FC Copenhague': ['FC Copenhagen'],
  'Club América': ['Club America'],
  'Chivas de Guadalajara': ['Guadalajara Chivas', 'CD Guadalajara'],
  'Tigres UANL': ['Tigres UANL'],
  'Pumas UNAM': ['UNAM Pumas'],
  'Cruz Azul': ['Cruz Azul'],
  'Club León': ['Club Leon'],
  'Club Tijuana': ['Club Tijuana'],
  'FC Juárez': ['FC Juarez'],
  'LA Galaxy': ['LA Galaxy'],
  'New York Red Bulls': ['New York Red Bulls'],
  'Atlético Mineiro': ['Atletico Mineiro'],
  'River Plate': ['River Plate'],
  'Boca Juniors': ['Boca Juniors'],
  'Estudiantes de La Plata': ['Estudiantes'],
  'Vélez Sarsfield': ['Velez Sarsfield'],
  'Universidad de Chile': ['Universidad de Chile'],
  'Atlético Nacional': ['Atletico Nacional'],
  'Club Bolívar': ['Bolivar'],
  'Oriente Petrolero': ['Oriente Petrolero'],
  'LDU Quito': ['LDU Quito', 'Liga de Quito'],
  'Barcelona SC': ['Barcelona SC', 'Barcelona Sporting Club'],
  'Cerro Porteño': ['Cerro Porteno'],
  // Selecciones: TheSportsDB las guarda en ingles.
  'México': ['Mexico'], 'Sudáfrica': ['South Africa'], 'Corea del Sur': ['South Korea'],
  'Chequia': ['Czech Republic', 'Czechia'], 'Canadá': ['Canada'], 'Bélgica': ['Belgium'],
  'Catar': ['Qatar'], 'Suiza': ['Switzerland'], 'Brasil': ['Brazil'], 'Marruecos': ['Morocco'],
  'Colombia': ['Colombia'], 'Escocia': ['Scotland'], 'Estados Unidos': ['USA', 'United States'],
  'Paraguay': ['Paraguay'], 'Australia': ['Australia'], 'Turquía': ['Turkey'],
  'Argentina': ['Argentina'], 'Argelia': ['Algeria'], 'Noruega': ['Norway'], 'Japón': ['Japan'],
  'España': ['Spain'], 'Uruguay': ['Uruguay'], 'Egipto': ['Egypt'], 'Nueva Zelanda': ['New Zealand'],
  'Francia': ['France'], 'Senegal': ['Senegal'], 'Ecuador': ['Ecuador'], 'Irán': ['Iran'],
  'Inglaterra': ['England'], 'Croacia': ['Croatia'], 'Ghana': ['Ghana'], 'Panamá': ['Panama'],
  'Portugal': ['Portugal'], 'Costa de Marfil': ['Ivory Coast'], 'Arabia Saudí': ['Saudi Arabia'],
  'Curazao': ['Curacao'], 'Alemania': ['Germany'], 'Túnez': ['Tunisia'],
  'Uzbekistán': ['Uzbekistan'], 'Bolivia': ['Bolivia'], 'Países Bajos': ['Netherlands'],
  'Nigeria': ['Nigeria'], 'Jordania': ['Jordan'], 'Haití': ['Haiti'], 'Italia': ['Italy'],
  'Austria': ['Austria'], 'Cabo Verde': ['Cape Verde'], 'Honduras': ['Honduras'],
};

/**
 * Los que TheSportsDB no encuentra por nombre de ninguna manera. Se tira del
 * CDN de API-Football por id de equipo, que sirve la imagen sin clave.
 */
const ESCUDO_DIRECTO = {
  'Nottingham Forest': `${CDN}/teams/65.png`,
};

/**
 * Guarda fusionando con lo que ya hay en disco en vez de escribir la copia que
 * este proceso tenia en memoria. Si no, lanzar dos veces el script a la vez
 * (por ejemplo escudos y caras) hace que el segundo en terminar borre lo que
 * escribio el primero.
 */
function guardaLogos(logos) {
  let enDisco = { competiciones: {}, equipos: {}, jugadores: {} };
  if (fs.existsSync(SALIDA)) {
    try {
      enDisco = { ...enDisco, ...JSON.parse(fs.readFileSync(SALIDA, 'utf8')) };
    } catch {
      /* archivo a medias: se rehace */
    }
  }
  const fusionado = {
    competiciones: { ...enDisco.competiciones, ...logos.competiciones },
    equipos: { ...enDisco.equipos, ...logos.equipos },
    jugadores: { ...enDisco.jugadores, ...logos.jugadores },
  };
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  fs.writeFileSync(SALIDA, JSON.stringify(fusionado));
  return fusionado;
}

function argumentos() {
  const a = process.argv.slice(2);
  const o = { solo: null, nivel: 80, todos: false, importados: 0 };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--solo') o.solo = a[++i];
    else if (a[i] === '--nivel') o.nivel = Number(a[++i]) || 80;
    else if (a[i] === '--todos') o.todos = true;
    // Caras de los jugadores que llegaron con los datos importados.
    else if (a[i] === '--importados') o.importados = Number(a[++i]) || 60;
  }
  return o;
}

/**
 * Pais de cada lista de clubes. Es lo que evita que al buscar "Barcelona"
 * salga el de Ecuador en vez del de Espana.
 */
const PAIS_DEL_BLOQUE = {
  PREMIER: 'England',
  LALIGA: 'Spain',
  SERIEA: 'Italy',
  BUNDESLIGA: 'Germany',
  LIGUE1: 'France',
  LIGAMX: 'Mexico',
  // La fuente escribe "United States", no "USA": si no coincide, rechaza.
  MLS: 'United States',
  BRASILEIRAO: 'Brazil',
  ARGENTINA: 'Argentina',
  // OTROS_EUROPA y OTROS_AMERICA mezclan paises: van uno a uno mas abajo.
};

/** Para los dos bloques mezclados, el pais club por club. */
const PAIS_DEL_CLUB = {
  // En la fuente el Mónaco figura en su propio país, no en Francia.
  'AS Mónaco': 'Monaco',
  'Sporting CP': 'Portugal', Benfica: 'Portugal', 'FC Oporto': 'Portugal', 'SC Braga': 'Portugal',
  Ajax: 'Netherlands', 'PSV Eindhoven': 'Netherlands', Feyenoord: 'Netherlands',
  Galatasaray: 'Turkey', Fenerbahçe: 'Turkey',
  Celtic: 'Scotland', Rangers: 'Scotland',
  'Red Bull Salzburgo': 'Austria', 'Club Brujas': 'Belgium', Olympiacos: 'Greece',
  'Shakhtar Donetsk': 'Ukraine', 'Slavia Praga': 'Czech Republic',
  'FC Copenhague': 'Denmark', 'Bodø/Glimt': 'Norway',
  'Atlético Nacional': 'Colombia', Millonarios: 'Colombia',
  'Colo-Colo': 'Chile', 'Universidad de Chile': 'Chile',
  Universitario: 'Peru',
  'Club Bolívar': 'Bolivia', 'The Strongest': 'Bolivia', 'Oriente Petrolero': 'Bolivia',
  Peñarol: 'Uruguay', Nacional: 'Uruguay',
  Olimpia: 'Paraguay', 'Cerro Porteño': 'Paraguay',
  'Barcelona SC': 'Ecuador', 'LDU Quito': 'Ecuador',
};

/** Saca los clubes y sus jugadores de los ficheros de datos escritos a mano. */
function leeClubes() {
  const equipos = [];
  for (const archivo of ['clubes-europa.ts', 'clubes-america.ts']) {
    const texto = fs.readFileSync(path.join(RAIZ, 'src', 'datos', archivo), 'utf8');
    // El fichero se parte por listas para saber a que liga pertenece cada club.
    // El nombre lleva digitos (LIGUE1): sin ellos, esa lista se fundia con la
    // anterior y sus clubes heredaban el pais equivocado.
    const listas = texto.split(/export const ([A-Z_0-9]+): FilaClub\[\] = \[/);
    for (let i = 1; i < listas.length; i += 2) {
      const bloque = listas[i];
      const cuerpo = listas[i + 1] ?? '';
      const paisBloque = PAIS_DEL_BLOQUE[bloque] ?? null;

      // Los campos de texto pueden ir con comilla simple o doble: el estadio
      // del Newcastle es "St James' Park" y lleva apostrofo dentro.
      const clubes = cuerpo.matchAll(
        /c\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*\d+,\s*\d+,\s*\d+,\s*(?:'[^']*'|"[^"]*"),\s*(?:'[^']*'|"[^"]*"),\s*(?:'[^']*'|"[^"]*"),\s*`([\s\S]*?)`\s*\)/g,
      );
      for (const b of clubes) {
        const nombre = b[2];
        equipos.push({
          id: b[1],
          nombre,
          pais: PAIS_DEL_CLUB[nombre] ?? paisBloque,
          jugadores: b[4]
            .split(';')
            .map((x) => x.trim())
            .filter(Boolean)
            .map((linea) => {
              const [nombreJugador, , , nivel] = linea.split('|');
              return { nombre: nombreJugador.trim(), nivel: Number(nivel) || 70, equipo: nombre };
            }),
        });
      }
    }
  }
  return equipos;
}

/** Igual para las selecciones del Mundial. */
function leeSelecciones() {
  const texto = fs.readFileSync(path.join(RAIZ, 'src', 'datos', 'selecciones.ts'), 'utf8');
  const equipos = [];
  const bloques = texto.matchAll(
    /nombre:\s*'([^']+)',\s*corto:\s*'[^']+',\s*bandera:\s*'[^']*',\s*pais:\s*'([^']+)',[\s\S]*?jugadores:\s*j\(`([\s\S]*?)`\)/g,
  );
  for (const b of bloques) {
    equipos.push({
      nombre: b[1],
      // TheSportsDB escribe los paises en ingles: si se le pasa "Sudáfrica"
      // no casa con "South Africa" y la seleccion se queda sin escudo.
      pais: ALIAS[b[1]]?.[0] ?? b[2],
      seleccion: true,
      jugadores: b[3]
        .split(';')
        .map((x) => x.trim())
        .filter(Boolean)
        .map((linea) => {
          const [nombre, , , nivel] = linea.split('|');
          return { nombre: nombre.trim(), nivel: Number(nivel) || 70, equipo: b[1] };
        }),
    });
  }
  return equipos;
}

/**
 * Jugadores que llegaron con los datos importados. No estan escritos a mano,
 * asi que sus caras no salen del catalogo: hay que buscarlas igual que las
 * demas. Se ordenan por cuantos partidos han jugado y se cogen los primeros,
 * que son los que de verdad aparecen en los picks.
 */
function jugadoresImportados(porCompeticion) {
  const ruta = path.join(RAIZ, 'src', 'datos', 'importado.json');
  if (!fs.existsSync(ruta)) return [];
  let archivo;
  try {
    archivo = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  } catch {
    return [];
  }

  const salida = [];
  for (const c of Object.values(archivo.competiciones ?? {})) {
    const apariciones = new Map();
    for (const r of c.registros ?? []) {
      apariciones.set(r.jugadorId, (apariciones.get(r.jugadorId) ?? 0) + 1);
    }
    const porEquipo = new Map((c.equipos ?? []).map((e) => [e.id, e.nombre]));
    const ordenados = (c.jugadores ?? [])
      .map((j) => ({
        nombre: j.nombre,
        equipo: porEquipo.get(j.equipoId) ?? '',
        partidos: apariciones.get(j.id) ?? 0,
      }))
      .filter((j) => j.nombre && j.partidos > 0)
      .sort((a, b) => b.partidos - a.partidos)
      .slice(0, porCompeticion);
    salida.push(...ordenados);
  }
  return salida;
}

function competicionesDeLaApp() {
  const texto = fs.readFileSync(path.join(RAIZ, 'src', 'datos', 'competiciones.ts'), 'utf8');
  const salida = [];
  for (const f of texto.matchAll(
    /\['([a-z0-9]+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'/g,
  )) {
    salida.push({ id: f[1], nombre: f[2], corto: f[3], pais: f[4] });
  }
  return salida;
}

/** Nombre de la liga en TheSportsDB, que va en inglés. */
const LIGA_EN_INGLES = {
  premier: 'English Premier League',
  championship: 'English League Championship',
  laliga: 'Spanish La Liga',
  seriea: 'Italian Serie A',
  bundesliga: 'German Bundesliga',
  ligue1: 'French Ligue 1',
  eredivisie: 'Dutch Eredivisie',
  portugal: 'Portuguese Primeira Liga',
  belgica: 'Belgian First Division A',
  turquia: 'Turkish Super Lig',
  grecia: 'Greek Superleague Greece',
  escocia: 'Scottish Premiership',
  ligamx: 'Mexican Primera League',
  mls: 'American Major League Soccer',
  brasileirao: 'Brazilian Serie A',
  argentina: 'Argentinian Primera Division',
  japon: 'Japanese J League',
  corea: 'South Korean K League 1',
  china: 'Chinese Super League',
  australia: 'Australian A-League',
  suiza: 'Swiss Super League',
  austria: 'Austrian Football Bundesliga',
  dinamarca: 'Danish Superliga',
  noruega: 'Norwegian Eliteserien',
  suecia: 'Swedish Allsvenskan',
  polonia: 'Polish Ekstraklasa',
  rumania: 'Romanian Liga I',
  chequia: 'Czech First League',
  croacia: 'Croatian Prva HNL',
  serbia: 'Serbian Super Liga',
  ucrania: 'Ukrainian Premier League',
  colombia: 'Colombian Primera A',
  chile: 'Chilean Primera Division',
  peru: 'Peruvian Primera Division',
  bolivia: 'Bolivian Primera Division',
  ecuador: 'Ecuadorian Serie A',
  uruguay: 'Uruguayan Primera Division',
  paraguay: 'Paraguayan Primera Division',
  venezuela: 'Venezuelan Primera Division',
  saudi: 'Saudi Professional League',
  egipto: 'Egyptian Premier League',
  sudafrica: 'South African Premier Division',
  marruecos: 'Moroccan Botola Pro',
};


async function main() {
  const o = argumentos();
  const buscador = new Buscador(DIR_CACHE);

  let logos = { competiciones: {}, equipos: {}, jugadores: {} };
  if (fs.existsSync(SALIDA)) {
    try {
      logos = { ...logos, ...JSON.parse(fs.readFileSync(SALIDA, 'utf8')) };
    } catch {
      /* archivo corrupto: se rehace */
    }
  }

  // -------------------------------------------------------- competiciones
  if (!o.solo || o.solo === 'competiciones') {
    const comps = competicionesDeLaApp();
    let puestos = 0;
    for (const c of comps) {
      const af = MAPA[c.id]?.af;
      if (!af) continue;
      logos.competiciones[c.id] = `${CDN}/leagues/${af}.png`;
      puestos++;
    }
    console.log(`Competiciones: ${puestos} de ${comps.length} con logo`);
  }

  const clubes = leeClubes();
  const selecciones = leeSelecciones();
  const todos = [...clubes, ...selecciones];

  // --------------------------------------------------------------- equipos
  if (!o.solo || o.solo === 'equipos') {
    let encontrados = 0;
    const sinEscudo = [];
    for (const e of todos) {
      if (logos.equipos[claveEstricta(e.nombre)]) encontrados++;
      else sinEscudo.push(e);
    }

    // Cada club se busca por su nombre completo, y el pais desempata cuando
    // hay homonimos: sin el, "FC Barcelona" acaba con el escudo del de Ecuador.
    let i = 0;
    for (const e of sinEscudo) {
      i++;
      // Los que la fuente no encuentra por nombre de ninguna forma.
      if (ESCUDO_DIRECTO[e.nombre]) {
        logos.equipos[claveEstricta(e.nombre)] = ESCUDO_DIRECTO[e.nombre];
        encontrados++;
        continue;
      }
      const r = await buscador.escudo(e.nombre, ALIAS[e.nombre] ?? [], e.pais);
      if (r) {
        logos.equipos[claveEstricta(e.nombre)] = r.url;
        encontrados++;
      }
      if (i % 10 === 0) {
        process.stdout.write(`\r  Buscando uno a uno: ${i}/${sinEscudo.length} · ${encontrados} en total`);
        buscador.guarda();
        guardaLogos(logos);
      }
    }
    console.log(`\r  Equipos: ${encontrados} de ${todos.length} con escudo            `);
  }

  // ------------------------------------------------------------- jugadores
  if (!o.solo || o.solo === 'jugadores') {
    const plantel = todos.flatMap((e) => e.jugadores);
    const escritos = o.todos ? plantel : plantel.filter((j) => j.nivel >= o.nivel);
    // Los importados no tienen nivel: entran por numero de partidos jugados.
    const candidatos = o.importados
      ? [...escritos, ...jugadoresImportados(o.importados)]
      : escritos;
    // Un mismo jugador sale en su club y en su seleccion: se busca una vez.
    const unicos = [...new Map(candidatos.map((j) => [claveEstricta(j.nombre), j])).values()];
    console.log(`Jugadores a buscar: ${unicos.length} (nivel ${o.todos ? 'todos' : `>= ${o.nivel}`})`);

    let encontrados = 0;
    let i = 0;
    for (const j of unicos) {
      i++;
      const clave = claveEstricta(j.nombre);
      if (logos.jugadores[clave]) {
        encontrados++;
        continue;
      }
      const r = await buscador.cara(j.nombre, j.equipo);
      if (r) {
        logos.jugadores[clave] = r.url;
        encontrados++;
      }
      if (i % 25 === 0) {
        process.stdout.write(`\r  Jugadores: ${i}/${unicos.length} · ${encontrados} con foto`);
        buscador.guarda();
        guardaLogos(logos);
      }
    }
    console.log(`\r  Jugadores: ${unicos.length}/${unicos.length} · ${encontrados} con foto      `);
  }

  buscador.guarda();
  guardaLogos(logos);

  const tam = (fs.statSync(SALIDA).size / 1024).toFixed(0);
  console.log(
    `\nGuardado en src/datos/logos.json · ${Object.keys(logos.competiciones).length} competiciones, ` +
      `${Object.keys(logos.equipos).length} escudos, ${Object.keys(logos.jugadores).length} caras · ${tam} kB`,
  );
  console.log(`Peticiones nuevas a TheSportsDB: ${buscador.peticiones}\n`);
}

main().catch((e) => {
  console.error(`\nError: ${e.message}\n`);
  process.exit(1);
});
