/** Formato compartido por los ficheros de clubes. */

export interface FilaClub {
  id: string;
  nombre: string;
  corto: string;
  fuerza: number;
  ataque: number;
  defensa: number;
  color: string;
  estadio: string;
  ciudad: string;
  /** Nucleo real de la plantilla: "Nombre|POS|dorsal|nivel". */
  jugadores: string[];
}

/** Parte el bloque de jugadores escrito como texto en una lista limpia. */
export const j = (s: string) =>
  s
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);

export const c = (
  id: string,
  nombre: string,
  corto: string,
  fuerza: number,
  ataque: number,
  defensa: number,
  color: string,
  estadio: string,
  ciudad: string,
  jugadores: string,
): FilaClub => ({
  id,
  nombre,
  corto,
  fuerza,
  ataque,
  defensa,
  color,
  estadio,
  ciudad,
  jugadores: j(jugadores),
});
