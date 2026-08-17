import { competicionVisible } from './importado';
import type { Competicion } from './tipos';

/**
 * Catalogo de competiciones. El orden es el que se ve en el carrusel de la
 * portada: primero el Mundial, luego las grandes ligas europeas y las
 * americanas, y despues el resto ordenado por continente.
 */

/*
 * El ultimo campo marca las ligas gratuitas. Son exactamente cinco —Champions,
 * Premier, LaLiga, Liga MX y Brasileirao— y ninguna mas: el resto se ve con el
 * candado puesto hasta que se compre, que es de donde sale el negocio.
 */
type Fila = [
  id: string,
  nombre: string,
  corto: string,
  pais: string,
  bandera: string,
  tipo: Competicion['tipo'],
  nivel: number,
  golesPartido: number,
  gratis?: boolean,
];

const FILAS: Fila[] = [
  ['mundial', 'Copa Mundial de la FIFA', 'Mundial', 'FIFA', '🏆', 'seleccion', 92, 2.7],
  ['champions', 'UEFA Champions League', 'Champions', 'UEFA', '🌟', 'continental', 94, 3.0, true],
  ['premier', 'Premier League', 'Premier', 'Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'liga', 92, 2.85, true],
  ['laliga', 'LaLiga EA Sports', 'LaLiga', 'España', '🇪🇸', 'liga', 89, 2.55, true],
  ['seriea', 'Serie A', 'Serie A', 'Italia', '🇮🇹', 'liga', 88, 2.75],
  ['bundesliga', 'Bundesliga', 'Bundesliga', 'Alemania', '🇩🇪', 'liga', 87, 3.15],
  ['ligue1', 'Ligue 1', 'Ligue 1', 'Francia', '🇫🇷', 'liga', 84, 2.8],
  ['europaleague', 'UEFA Europa League', 'Europa League', 'UEFA', '🥈', 'continental', 82, 2.9],
  ['conference', 'UEFA Conference League', 'Conference', 'UEFA', '🥉', 'continental', 74, 3.0],
  ['ligamx', 'Liga MX', 'Liga MX', 'México', '🇲🇽', 'liga', 76, 2.75, true],
  ['libertadores', 'CONMEBOL Libertadores', 'Libertadores', 'CONMEBOL', '🏅', 'continental', 80, 2.5],
  ['sudamericana', 'CONMEBOL Sudamericana', 'Sudamericana', 'CONMEBOL', '🎖️', 'continental', 73, 2.6],
  ['brasileirao', 'Brasileirão Série A', 'Brasileirão', 'Brasil', '🇧🇷', 'liga', 79, 2.45, true],
  ['argentina', 'Liga Profesional Argentina', 'Liga Argentina', 'Argentina', '🇦🇷', 'liga', 76, 2.3],
  ['mls', 'Major League Soccer', 'MLS', 'Estados Unidos', '🇺🇸', 'liga', 72, 3.0],
  ['eredivisie', 'Eredivisie', 'Eredivisie', 'Países Bajos', '🇳🇱', 'liga', 78, 3.2],
  ['portugal', 'Liga Portugal Betclic', 'Liga Portugal', 'Portugal', '🇵🇹', 'liga', 78, 2.65],
  ['championship', 'EFL Championship', 'Championship', 'Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'liga', 72, 2.5],
  ['copadelrey', 'Copa del Rey', 'Copa del Rey', 'España', '🇪🇸', 'copa', 80, 2.9],
  ['facup', 'Emirates FA Cup', 'FA Cup', 'Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'copa', 80, 2.95],
  ['carabao', 'Carabao Cup', 'Carabao', 'Inglaterra', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'copa', 78, 3.1],
  ['coppa', 'Coppa Italia', 'Coppa Italia', 'Italia', '🇮🇹', 'copa', 79, 2.8],
  ['dfbpokal', 'DFB-Pokal', 'DFB-Pokal', 'Alemania', '🇩🇪', 'copa', 79, 3.2],
  ['coupefrance', 'Coupe de France', 'Coupe de France', 'Francia', '🇫🇷', 'copa', 75, 3.0],
  ['euro', 'UEFA EURO', 'Eurocopa', 'UEFA', '🇪🇺', 'seleccion', 90, 2.5],
  ['copaamerica', 'CONMEBOL Copa América', 'Copa América', 'CONMEBOL', '🌎', 'seleccion', 84, 2.3],
  ['nationsleague', 'UEFA Nations League', 'Nations League', 'UEFA', '🇪🇺', 'seleccion', 86, 2.8],
  ['eliminatoriassud', 'Eliminatorias CONMEBOL', 'Eliminatorias', 'CONMEBOL', '🌎', 'seleccion', 78, 2.4],
  ['concachampions', 'Concacaf Champions Cup', 'Concachampions', 'Concacaf', '🌐', 'continental', 71, 2.9],
  ['saudi', 'Saudi Pro League', 'Saudi League', 'Arabia Saudí', '🇸🇦', 'liga', 73, 2.9],
  ['turquia', 'Süper Lig', 'Süper Lig', 'Turquía', '🇹🇷', 'liga', 74, 2.95],
  ['belgica', 'Jupiler Pro League', 'Pro League', 'Bélgica', '🇧🇪', 'liga', 74, 2.9],
  ['escocia', 'Scottish Premiership', 'Premiership', 'Escocia', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'liga', 70, 2.8],
  ['suiza', 'Super League', 'Super League', 'Suiza', '🇨🇭', 'liga', 70, 3.05],
  ['austria', 'Bundesliga Austria', 'Bundesliga AUT', 'Austria', '🇦🇹', 'liga', 69, 2.9],
  ['grecia', 'Super League Grecia', 'Super League GRE', 'Grecia', '🇬🇷', 'liga', 69, 2.5],
  ['dinamarca', 'Superliga', 'Superliga', 'Dinamarca', '🇩🇰', 'liga', 70, 2.85],
  ['noruega', 'Eliteserien', 'Eliteserien', 'Noruega', '🇳🇴', 'liga', 68, 3.05],
  ['suecia', 'Allsvenskan', 'Allsvenskan', 'Suecia', '🇸🇪', 'liga', 68, 2.8],
  ['polonia', 'Ekstraklasa', 'Ekstraklasa', 'Polonia', '🇵🇱', 'liga', 67, 2.7],
  ['chequia', 'Chance Liga', 'Chance Liga', 'Chequia', '🇨🇿', 'liga', 68, 2.75],
  ['croacia', 'HNL', 'HNL', 'Croacia', '🇭🇷', 'liga', 68, 2.6],
  ['serbia', 'Superliga Serbia', 'Superliga SRB', 'Serbia', '🇷🇸', 'liga', 66, 2.7],
  ['rumania', 'SuperLiga', 'SuperLiga ROU', 'Rumanía', '🇷🇴', 'liga', 65, 2.6],
  ['ucrania', 'Premier Liga', 'Premier UKR', 'Ucrania', '🇺🇦', 'liga', 68, 2.5],
  ['japon', 'J1 League', 'J1 League', 'Japón', '🇯🇵', 'liga', 71, 2.6],
  ['corea', 'K League 1', 'K League', 'Corea del Sur', '🇰🇷', 'liga', 69, 2.5],
  ['australia', 'A-League Men', 'A-League', 'Australia', '🇦🇺', 'liga', 66, 2.95],
  ['china', 'Chinese Super League', 'CSL', 'China', '🇨🇳', 'liga', 64, 2.8],
  ['colombia', 'Liga BetPlay Dimayor', 'Liga BetPlay', 'Colombia', '🇨🇴', 'liga', 70, 2.3],
  ['chile', 'Liga de Primera', 'Primera Chile', 'Chile', '🇨🇱', 'liga', 68, 2.4],
  ['peru', 'Liga 1', 'Liga 1', 'Perú', '🇵🇪', 'liga', 65, 2.5],
  ['bolivia', 'División Profesional', 'División Profesional', 'Bolivia', '🇧🇴', 'liga', 63, 3.1],
  ['ecuador', 'LigaPro Serie A', 'LigaPro', 'Ecuador', '🇪🇨', 'liga', 67, 2.4],
  ['uruguay', 'Primera División', 'Primera URU', 'Uruguay', '🇺🇾', 'liga', 68, 2.4],
  ['paraguay', 'División Profesional', 'Primera PAR', 'Paraguay', '🇵🇾', 'liga', 66, 2.35],
  ['venezuela', 'Liga FUTVE', 'Liga FUTVE', 'Venezuela', '🇻🇪', 'liga', 62, 2.4],
  ['egipto', 'Premier League Egipto', 'Premier EGY', 'Egipto', '🇪🇬', 'liga', 65, 2.2],
  ['sudafrica', 'Betway Premiership', 'PSL', 'Sudáfrica', '🇿🇦', 'liga', 63, 2.3],
  ['marruecos', 'Botola Pro', 'Botola', 'Marruecos', '🇲🇦', 'liga', 64, 2.2],
];

/**
 * Competición ficticia que abarca a todas las demás. No es un torneo: es la
 * forma de usar la app sin filtrar por competición, con los partidos, los
 * equipos y las picks de todas las descargadas a la vez.
 */
export const TODAS = 'todas';

export const COMPETICIONES: Competicion[] = FILAS.map(
  ([id, nombre, corto, pais, bandera, tipo, nivel, golesPartido, gratis]) => ({
    id,
    nombre,
    corto,
    pais,
    bandera,
    tipo,
    nivel,
    golesPartido,
    gratis: !!gratis,
    temporada: tipo === 'seleccion' ? '2026' : '2026/27',
    grupos:
      id === 'mundial'
        ? ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
        : undefined,
  }),
);

// Va la primera de la rejilla: es el atajo para no tener que elegir.
COMPETICIONES.unshift({
  id: TODAS,
  nombre: 'Todas las competiciones',
  corto: 'Todas',
  pais: 'Mundo',
  bandera: '🌍',
  tipo: 'liga',
  nivel: 80,
  golesPartido: 2.7,
  // No es gratuita ni de pago: cada pick se bloquea según su liga de verdad.
  gratis: false,
  temporada: '2026/27',
});

const PORID = new Map(COMPETICIONES.map((c) => [c.id, c]));

export function competicion(id: string): Competicion {
  const c = PORID.get(id);
  if (!c) throw new Error(`Competicion desconocida: ${id}`);
  return c;
}

export function competicionOpcional(id: string | undefined) {
  return id ? PORID.get(id) : undefined;
}

/**
 * Las que se enseñan en la app. Cuando hay datos importados solo salen esas:
 * los torneos que no se están jugando (Mundial, Eurocopa, Copa América) se
 * ocultan hasta que vuelvan a importarse, sin borrarlos del catálogo.
 */
export function competicionesVisibles(): Competicion[] {
  const visibles = COMPETICIONES.filter((c) => competicionVisible(c.id));
  return visibles.length ? visibles : COMPETICIONES;
}
