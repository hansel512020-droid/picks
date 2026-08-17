/**
 * Perfiles de margen del mercado.
 *
 * ── Por qué esto no son casas de apuestas ────────────────────────────────────
 *
 * Antes esta lista tenía diez marcas reales —bet365, Pinnacle, William Hill…— y
 * la app enseñaba un precio para cada una. El problema es que esos precios no
 * venían de ellas: los datos traen **una** cuota por partido, y el resto se
 * calculaba aplicándole un margen distinto a cada marca. En un Necaxa–León la
 * fuente real era DraftKings y la app mostraba diez casas con precios que
 * ninguna había publicado.
 *
 * Eso engaña a quien paga por decidir con esos números: alguien lee "Pinnacle
 * 2.58", se va a Pinnacle y ese precio no existe. Y de paso atribuye datos
 * inventados a empresas reales.
 *
 * Así que lo calculado se presenta como lo que es —una estimación con más o
 * menos margen— y las marcas se reservan para cuando el dato viene de verdad de
 * esa casa, que es lo que dice `cuotas.casasReales`.
 */

export interface Casa {
  id: string;
  nombre: string;
  /** Iniciales para el chip cuadrado que va junto al precio. */
  sigla: string;
  fondo: string;
  texto: string;
  /** Cuanto margen se le mete. Cambia el precio final del mismo mercado. */
  margen: number;
  /** Si el precio sale de una casa concreta o lo estima la app. */
  real?: boolean;
}

/*
 * Tres niveles en vez de diez. Diez perfiles de margen no le dicen nada a
 * nadie: lo útil es saber si estás mirando un precio con margen corto —el que
 * daría una casa que compite por precio— o uno con margen ancho.
 */
export const CASAS: Casa[] = [
  { id: 'ajustado', nombre: 'Mercado ajustado', sigla: 'AJU', fondo: '#0B3D2E', texto: '#7CE2B0', margen: 1.025 },
  { id: 'medio', nombre: 'Mercado medio', sigla: 'MED', fondo: '#1E293B', texto: '#93C5FD', margen: 1.055 },
  { id: 'amplio', nombre: 'Mercado amplio', sigla: 'AMP', fondo: '#3B1E1E', texto: '#FCA5A5', margen: 1.08 },
];

export const CASA_POR_DEFECTO = 'medio';

const MAPA = new Map(CASAS.map((c) => [c.id, c]));

/*
 * Quien tenía elegido "bet365" o "Pinnacle" antes de este cambio sigue teniendo
 * eso guardado en su teléfono. Se traduce al perfil de margen equivalente en vez
 * de mandarlo al de por defecto, para que los precios que ve no le cambien de un
 * día para otro sin motivo.
 */
const EQUIVALENCIAS: Record<string, string> = {
  pinnacle: 'ajustado',
  betfair: 'ajustado',
  bet365: 'medio',
  betano: 'medio',
  williamhill: 'medio',
  bwin: 'medio',
  '1xbet': 'amplio',
  codere: 'amplio',
  betsson: 'amplio',
  rushbet: 'amplio',
};

/**
 * Qué claves antiguas sirven para cada perfil.
 *
 * El archivo que hay en el servidor se generó con el catálogo viejo: trae
 * `bet365`, `pinnacle`, `rushbet`… y ninguna de las tres nuevas. Sin esto la
 * tabla de precios sale vacía hasta que el robot vuelva a importar, que es de
 * madrugada. Se busca la primera que exista y se enseña como el perfil que le
 * corresponde por margen.
 *
 * Se puede borrar cuando todos los datos estén reimportados.
 */
export const ANTIGUOS_POR_PERFIL: Record<string, string[]> = {
  ajustado: ['pinnacle', 'betfair'],
  medio: ['bet365', 'betano', 'williamhill', 'bwin'],
  amplio: ['rushbet', 'codere', 'betsson', '1xbet'],
};

/** Nombre presentable de una casa que sí publicó el precio. */
function bonito(id: string): string {
  const conocidos: Record<string, string> = {
    bet365: 'bet365',
    draftkings: 'DraftKings',
    paddypower: 'Paddy Power',
    williamhill: 'William Hill',
    bwin: 'bwin',
    pinnacle: 'Pinnacle',
    betfair: 'Betfair',
    mejor: 'Mejor precio',
  };
  return conocidos[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

export function casa(id: string): Casa {
  const perfil = MAPA.get(id);
  if (perfil) return perfil;

  const equivalente = EQUIVALENCIAS[id] && MAPA.get(EQUIVALENCIAS[id]);
  if (equivalente) return equivalente;

  /*
   * Un identificador que no es perfil ni equivalencia viene de los datos: es
   * una casa que publicó el precio de verdad. Se enseña con su nombre y en gris
   * neutro, sin colores de marca —no somos su escaparate— y marcada como real
   * para que quien pinte sepa que ese número sí se puede ir a buscar.
   */
  return {
    id,
    nombre: bonito(id),
    sigla: id.slice(0, 3).toUpperCase(),
    fondo: '#2A2E35',
    texto: '#C9CDD4',
    margen: 1.06,
    real: true,
  };
}
