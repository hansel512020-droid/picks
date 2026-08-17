import { equiposImportados, cuandoCambienLosDatos } from './importado';
import logos from './logos.json';

/**
 * Escudos, logos de competicion y caras de jugador que resolvio
 * `scripts/logos.js`. Solo se guardan direcciones: las imagenes se piden al
 * vuelo y expo-image las cachea en el movil.
 *
 *   node scripts/logos.js
 */

interface Archivo {
  competiciones: Record<string, string>;
  equipos: Record<string, string>;
  jugadores: Record<string, string>;
}

const LOGOS = logos as Archivo;

/**
 * Clave de busqueda: el nombre completo del club, sin tocar. Antes se le
 * quitaban las siglas ("FC", "SC", "CD"...) y eso hacia que "FC Barcelona" y
 * "Barcelona SC" acabaran en la misma clave compartiendo escudo. El nombre
 * entero es lo unico que distingue a un club de su homonimo.
 *
 * Tiene que ser identica a la del script `logos.js` o no encaja ni un escudo.
 */
export function claveNombre(nombre: string): string {
  return (nombre || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function logoCompeticion(competicionId: string): string | undefined {
  return LOGOS.competiciones?.[competicionId];
}

/**
 * Escudos que vienen dentro de los datos importados. Cubren a los equipos que
 * la app no tiene escritos a mano —los de las copas, los sudamericanos, los de
 * segunda— y por eso mandan sobre el catálogo resuelto por nombre.
 */
let escudosImportados: Record<string, string> | null = null;

// El índice de escudos se rehace cuando cambian los datos: los equipos nuevos
// traen los suyos y los viejos pueden haber cambiado de identificador.
cuandoCambienLosDatos(() => {
  escudosImportados = null;
});

function indiceImportado(): Record<string, string> {
  if (escudosImportados) return escudosImportados;
  escudosImportados = {};
  for (const equipo of equiposImportados()) {
    if (!equipo.escudo) continue;
    /*
     * Se indexa por identificador **y** por nombre.
     *
     * Por nombre solo no valía: hay clubes distintos que se llaman igual —el
     * River Plate argentino y el de Montevideo, por ejemplo— y compartían
     * clave, así que el último en cargarse le robaba el escudo al otro. En la
     * app se veía al River argentino con el escudo del uruguayo.
     *
     * El identificador lleva la competición dentro (`uruguay:riverplate`), así
     * que no choca nunca. El nombre se mantiene como respaldo para los equipos
     * escritos a mano, que no tienen identificador importado.
     */
    escudosImportados[equipo.id] = equipo.escudo;
    const porNombre = claveNombre(equipo.nombre);
    if (!escudosImportados[porNombre]) escudosImportados[porNombre] = equipo.escudo;
  }
  return escudosImportados;
}

/**
 * El escudo de un equipo. Se le puede pasar su identificador además del
 * nombre, y conviene: es lo único que distingue a dos clubes homónimos.
 */
export function escudoEquipo(nombre: string, id?: string): string | undefined {
  const indice = indiceImportado();
  if (id && indice[id]) return indice[id];
  const clave = claveNombre(nombre);
  return indice[clave] ?? LOGOS.equipos?.[clave];
}

export function caraJugador(nombre: string): string | undefined {
  return LOGOS.jugadores?.[claveNombre(nombre)];
}

/** Cuantas imagenes hay resueltas, para enseñarlo en la pantalla del método. */
export const RESUMEN_IMAGENES = {
  competiciones: Object.keys(LOGOS.competiciones ?? {}).length,
  equipos: Object.keys(LOGOS.equipos ?? {}).length,
  jugadores: Object.keys(LOGOS.jugadores ?? {}).length,
};
