'use strict';
/**
 * La bandera de un país a partir de su nombre en inglés, que es como lo da
 * ESPN ("France", "Korea Republic", "England").
 *
 * Los jugadores importados llevaban la bandera de la competición —todos los
 * de LaLiga con 🇪🇸, Mbappé incluido; los de la Champions con 🌟—. La
 * plantilla de ESPN dice la nacionalidad de cada uno, y con esto se convierte
 * en su bandera.
 *
 * Los nombres salen de la propia tabla de regiones de Node (Intl), así que no
 * hay que mantener una lista de doscientos países; abajo van solo los que ESPN
 * escribe a su manera y las cuatro naciones británicas, que tienen bandera
 * propia aunque no sean países ISO.
 */

const clave = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');

/** Bandera de un código ISO de dos letras: dos indicadores regionales. */
const deCodigo = (codigo) =>
  String.fromCodePoint(...[...codigo.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

/** Inglaterra, Escocia y Gales: 🏴 con su etiqueta (gbeng, gbsct, gbwls). */
const subdivision = (etiqueta) =>
  String.fromCodePoint(0x1f3f4, ...[...etiqueta].map((c) => 0xe0000 + c.charCodeAt(0)), 0xe007f);

const ESPECIALES = {
  england: subdivision('gbeng'),
  scotland: subdivision('gbsct'),
  wales: subdivision('gbwls'),
  // Irlanda del Norte no tiene emoji propio: la del Reino Unido.
  northernireland: deCodigo('GB'),
  usa: deCodigo('US'),
  unitedstates: deCodigo('US'),
  korearepublic: deCodigo('KR'),
  southkorea: deCodigo('KR'),
  korea: deCodigo('KR'),
  northkorea: deCodigo('KP'),
  koreadpr: deCodigo('KP'),
  ivorycoast: deCodigo('CI'),
  cotedivoire: deCodigo('CI'),
  czechrepublic: deCodigo('CZ'),
  turkey: deCodigo('TR'),
  turkiye: deCodigo('TR'),
  drcongo: deCodigo('CD'),
  congodr: deCodigo('CD'),
  democraticrepublicofthecongo: deCodigo('CD'),
  congo: deCodigo('CG'),
  capeverde: deCodigo('CV'),
  capeverdeislands: deCodigo('CV'),
  bosniaherzegovina: deCodigo('BA'),
  bosniaandherzegovina: deCodigo('BA'),
  republicofireland: deCodigo('IE'),
  ireland: deCodigo('IE'),
  kosovo: deCodigo('XK'),
  curacao: deCodigo('CW'),
  iran: deCodigo('IR'),
  russia: deCodigo('RU'),
  syria: deCodigo('SY'),
  vietnam: deCodigo('VN'),
  chinapr: deCodigo('CN'),
  macedonia: deCodigo('MK'),
  northmacedonia: deCodigo('MK'),
  moldova: deCodigo('MD'),
  palestine: deCodigo('PS'),
  tanzania: deCodigo('TZ'),
  venezuela: deCodigo('VE'),
  bolivia: deCodigo('BO'),
  gambia: deCodigo('GM'),
  thegambia: deCodigo('GM'),
  guineabissau: deCodigo('GW'),
  trinidadandtobago: deCodigo('TT'),
  stkittsandnevis: deCodigo('KN'),
  saintkittsandnevis: deCodigo('KN'),
  stlucia: deCodigo('LC'),
  stvincentandthegrenadines: deCodigo('VC'),
  antiguaandbarbuda: deCodigo('AG'),
  equatorialguinea: deCodigo('GQ'),
  centralafricanrepublic: deCodigo('CF'),
  saotomeandprincipe: deCodigo('ST'),
  eswatini: deCodigo('SZ'),
  swaziland: deCodigo('SZ'),
  taiwan: deCodigo('TW'),
  chinesetaipei: deCodigo('TW'),
  hongkong: deCodigo('HK'),
  laos: deCodigo('LA'),
  brunei: deCodigo('BN'),
  micronesia: deCodigo('FM'),
  myanmar: deCodigo('MM'),
  burma: deCodigo('MM'),
  saintlucia: deCodigo('LC'),
  usvirginislands: deCodigo('VI'),
};

/*
 * Códigos que ya no son países o no tienen bandera propia. Algunos comparten
 * nombre con el de ahora —"DD" (la RDA) sale como "Germany", "CS" como
 * "Serbia"— y le robarían la bandera.
 */
const RETIRADOS = new Set([
  'AC', 'AN', 'BU', 'CP', 'CS', 'DD', 'DG', 'DY', 'EA', 'EU', 'EZ', 'FX', 'HV', 'IC', 'NH', 'NT',
  'QO', 'QU', 'RH', 'SU', 'TA', 'TP', 'UK', 'UN', 'VD', 'XA', 'XB', 'YD', 'YU', 'ZR', 'ZZ',
]);

let PORNOMBRE = null;

function tabla() {
  if (PORNOMBRE) return PORNOMBRE;
  PORNOMBRE = new Map();
  try {
    const nombres = new Intl.DisplayNames(['en'], { type: 'region' });
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const codigo = String.fromCharCode(a, b);
        if (RETIRADOS.has(codigo)) continue;
        let nombre;
        try {
          nombre = nombres.of(codigo);
        } catch {
          continue;
        }
        // Lo que no es una región de verdad vuelve tal cual ("AA").
        if (!nombre || nombre === codigo) continue;
        if (!PORNOMBRE.has(clave(nombre))) PORNOMBRE.set(clave(nombre), deCodigo(codigo));
      }
    }
  } catch {
    // Sin Intl completo solo quedan los especiales.
  }
  for (const [nombre, bandera] of Object.entries(ESPECIALES)) PORNOMBRE.set(nombre, bandera);
  return PORNOMBRE;
}

/** La bandera del país, o `undefined` si no se reconoce el nombre. */
function banderaDe(pais) {
  if (!pais) return undefined;
  return tabla().get(clave(pais));
}

module.exports = { banderaDe };
