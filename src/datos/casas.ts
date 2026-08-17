/** Casas de apuestas que se pueden elegir para ver los precios. */

export interface Casa {
  id: string;
  nombre: string;
  /** Iniciales para el chip cuadrado que va junto a la cuota. */
  sigla: string;
  fondo: string;
  texto: string;
  /** Cuanto margen mete la casa. Cambia el precio final del mismo mercado. */
  margen: number;
}

export const CASAS: Casa[] = [
  { id: 'bet365', nombre: 'bet365', sigla: 'b365', fondo: '#027B5B', texto: '#FFE500', margen: 1.055 },
  { id: 'betano', nombre: 'Betano', sigla: 'BTN', fondo: '#FF5A00', texto: '#FFFFFF', margen: 1.06 },
  { id: '1xbet', nombre: '1xBet', sigla: '1x', fondo: '#0A5F38', texto: '#FFFFFF', margen: 1.07 },
  { id: 'betfair', nombre: 'Betfair', sigla: 'BF', fondo: '#FFB80C', texto: '#111111', margen: 1.03 },
  { id: 'pinnacle', nombre: 'Pinnacle', sigla: 'PIN', fondo: '#0B0B0B', texto: '#FFFFFF', margen: 1.025 },
  { id: 'bwin', nombre: 'bwin', sigla: 'bw', fondo: '#000000', texto: '#FFD700', margen: 1.065 },
  { id: 'williamhill', nombre: 'William Hill', sigla: 'WH', fondo: '#00285E', texto: '#FFFFFF', margen: 1.06 },
  { id: 'codere', nombre: 'Codere', sigla: 'CDR', fondo: '#00893D', texto: '#FFFFFF', margen: 1.075 },
  { id: 'betsson', nombre: 'Betsson', sigla: 'BTS', fondo: '#FF6A13', texto: '#FFFFFF', margen: 1.07 },
  { id: 'rushbet', nombre: 'Rushbet', sigla: 'RSH', fondo: '#E4002B', texto: '#FFFFFF', margen: 1.08 },
];

export const CASA_POR_DEFECTO = 'bet365';

const MAPA = new Map(CASAS.map((c) => [c.id, c]));

export function casa(id: string): Casa {
  const conocida = MAPA.get(id);
  if (conocida) return conocida;
  /*
   * Una casa que no está en el catálogo —el proveedor de cuotas de ESPN suele
   * serlo— se enseña con sus propias siglas en gris. Antes se devolvía la
   * primera de la lista, así que un precio de DraftKings salía con el sello de
   * bet365 y parecía de bet365.
   */
  return {
    id,
    nombre: id.charAt(0).toUpperCase() + id.slice(1),
    sigla: id.slice(0, 3).toUpperCase(),
    fondo: '#2A2E35',
    texto: '#C9CDD4',
    margen: 1.06,
  } as Casa;
}
