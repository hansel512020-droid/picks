/** Tipos de todo el modelo de datos de la app. */

export type TipoCompeticion = 'seleccion' | 'liga' | 'copa' | 'continental';

export interface Competicion {
  id: string;
  nombre: string;
  corto: string;
  pais: string;
  bandera: string;
  tipo: TipoCompeticion;
  /** Nivel medio de los equipos, 0-100. Calibra los goles esperados. */
  nivel: number;
  /** Goles por partido historicos de la competicion. */
  golesPartido: number;
  /** Solo en torneos por grupos. */
  grupos?: string[];
  /** Marca las competiciones que se ven sin Scout Pro. */
  gratis?: boolean;
  temporada: string;
}

export interface Equipo {
  id: string;
  nombre: string;
  corto: string;
  bandera: string;
  competicionId: string;
  grupo?: string;
  /** 0-100. Manda en el reparto de goles y en las cuotas. */
  fuerza: number;
  ataque: number;
  defensa: number;
  color: string;
  ciudad?: string;
  estadio?: string;
  /** Escudo real, cuando la fuente importada lo trae. */
  escudo?: string;
}

export type Posicion = 'POR' | 'DEF' | 'MED' | 'DEL';

export interface Jugador {
  id: string;
  nombre: string;
  equipoId: string;
  posicion: Posicion;
  dorsal: number;
  edad: number;
  pais: string;
  bandera: string;
  /** 0-100, calidad general. */
  nivel: number;
  /** Titular indiscutible, rotacion o suplente: decide minutos. */
  rol: 'titular' | 'rotacion' | 'suplente';
  /** Ratios por 90 minutos que alimentan el generador de registros. */
  ratios: RatiosJugador;
}

export interface RatiosJugador {
  goles: number;
  asistencias: number;
  remates: number;
  rematesPuerta: number;
  pasesClave: number;
  regates: number;
  faltasCometidas: number;
  faltasRecibidas: number;
  entradas: number;
  intercepciones: number;
  despejes: number;
  duelosGanados: number;
  toquesArea: number;
  amarillas: number;
  precisionPases: number;
  pases: number;
  centros: number;
  paradas: number;
  xg: number;
  xa: number;
}

export type EstadoPartido = 'previa' | 'en_curso' | 'descanso' | 'finalizado';

export interface Partido {
  id: string;
  /**
   * Identificador del partido en ESPN, si viene de datos reales. Es con lo que
   * se le pide el acta en directo para resolver los picks sin esperar a la
   * siguiente importación.
   */
  idEspn?: string;
  competicionId: string;
  localId: string;
  visitanteId: string;
  /** ISO. */
  fecha: string;
  estado: EstadoPartido;
  minuto?: number;
  golesLocal: number;
  golesVisitante: number;
  golesLocalDescanso: number;
  golesVisitanteDescanso: number;
  jornada: number;
  ronda?: string;
  estadio: string;
  arbitro?: string;
  estadisticas: EstadisticasPartido;
  cuotas: CuotasPartido;
}

export interface EstadisticasEquipoPartido {
  remates: number;
  rematesPuerta: number;
  posesion: number;
  corners: number;
  faltas: number;
  amarillas: number;
  rojas: number;
  fueraJuego: number;
  xg: number;
  pases: number;
  precisionPases: number;
}

export interface EstadisticasPartido {
  local: EstadisticasEquipoPartido;
  visitante: EstadisticasEquipoPartido;
}

/** Precio de un mercado en cada casa de apuestas. */
export interface CuotasPartido {
  local: number;
  empate: number;
  visitante: number;
  mas25: number;
  menos25: number;
  ambosMarcan: number;
  ambosNoMarcan: number;
  /** Mejor precio disponible por casa. */
  porCasa: Record<string, { local: number; empate: number; visitante: number }>;
  /**
   * Con datos importados, que casas publicaron el precio de verdad. El resto
   * se deriva de esas, y la app lo dice en vez de fingir que son reales.
   */
  casasReales?: string[];
  /**
   * La casa cuyo precio se enseña como cuota del partido. Es la que publicó
   * el 1X2 de verdad, no la que el usuario tiene elegida: enseñar el precio de
   * una y el sello de otra haría creer que ese precio está en su casa.
   */
  casaResumen?: string;
}

/** Una linea de estadisticas de un jugador en un partido concreto. */
export interface RegistroJugador {
  partidoId: string;
  jugadorId: string;
  equipoId: string;
  rivalId: string;
  local: boolean;
  fecha: string;
  minutos: number;
  titular: boolean;
  /** Minuto en el que salio del campo, si fue sustituido. */
  sustituidoEn?: number;
  goles: number;
  asistencias: number;
  remates: number;
  rematesPuerta: number;
  rematesFuera: number;
  rematesBloqueados: number;
  pasesClave: number;
  regates: number;
  regatesIntentados: number;
  faltasCometidas: number;
  faltasRecibidas: number;
  entradas: number;
  intercepciones: number;
  despejes: number;
  duelosGanados: number;
  duelosTotales: number;
  toquesArea: number;
  toques: number;
  pases: number;
  pasesCompletados: number;
  centros: number;
  centrosCompletados: number;
  amarillas: number;
  rojas: number;
  paradas: number;
  golesEncajados: number;
  xg: number;
  xa: number;
  /** Nota 0-10. */
  nota: number;
}

/** Familias de mercados que filtran los chips de la app. */
export type Familia =
  | 'goles'
  | 'tiros'
  | 'corners'
  | 'tarjetas'
  | 'resultado'
  | 'asistencias'
  | 'pases'
  | 'faltas'
  | 'defensa'
  | 'combinadas';

export type SujetoPick = 'jugador' | 'equipo' | 'partido';

export interface Pick {
  id: string;
  partidoId: string;
  competicionId: string;
  sujeto: SujetoPick;
  /** Id del jugador o del equipo al que se refiere. */
  sujetoId: string;
  /** Titulo grande de la tarjeta. */
  titulo: string;
  /**
   * Club del sujeto, cuando el pick es de un jugador. Va junto al nombre en la
   * tarjeta: "Willumsson" a secas no dice de quien se habla, y en una lista
   * que mezcla treinta competiciones eso es justo lo primero que hace falta.
   */
  equipo?: string;
  /** Linea de contexto: "MEX vs SUD - Hoy 16:00". */
  contexto: string;
  /** Texto explicativo con el dato que sostiene el pick. */
  argumento: string;
  familia: Familia;
  /** Nombre del mercado: "Mas de 2.5 goles". */
  mercado: string;
  /** Metrica sobre la que va la linea. */
  metrica: string;
  linea: number;
  /** Por encima o por debajo de la linea. */
  sentido: 'mas' | 'menos' | 'si' | 'no';
  cuota: number;
  casa: string;
  /**
   * `true` solo cuando el precio viene de una cuota publicada de verdad. Las
   * fuentes gratuitas publican el 1X2 y poco mas: en los mercados de jugador
   * y de equipo el precio lo pone el modelo, y hay que decirlo en pantalla en
   * lugar de colgarle el sello de una casa de apuestas.
   */
  precioReal?: boolean;
  /**
   * Si la app lo recomienda o solo lo enseña.
   *
   * Los recomendados son los que pasan el corte de ventaja que salio de medir
   * el modelo contra 3.446 partidos. El resto existe para que la ficha de un
   * partido no salga vacia, pero no va a la portada ni cuenta como consejo.
   */
  recomendado: boolean;
  /** Historial de los ultimos 10: true cuando el pick habria acertado. */
  racha: boolean[];
  aciertosL5: number;
  aciertosL10: number;
  aciertosL20: number;
  muestraL20: number;
  /** Media de la metrica en los ultimos 10. */
  media: number;
  /** Probabilidad estimada por el modelo, 0-1. */
  probabilidad: number;
  /** Ventaja sobre la probabilidad implicita de la cuota, en puntos. */
  ventaja: number;
  /** Cuanta gente guardo el pick. */
  fuego: number;
  /** Bandera o foto que va a la izquierda. */
  imagen: string;
  esBandera: boolean;
  /**
   * Nombres con los que buscar el escudo o la cara: uno para los picks de
   * jugador y de equipo, y los dos equipos en los picks de partido.
   */
  nombres: string[];
  /** Solo con Scout Pro. */
  pro?: boolean;
}

export type ResultadoPick = 'pendiente' | 'ganado' | 'perdido' | 'nulo';

/** Un pick guardado por el usuario, con su desenlace. */
export interface PickGuardado {
  pickId: string;
  titulo: string;
  /** Club del jugador, para poder enseñarlo en el historial. */
  equipo?: string;
  mercado: string;
  contexto: string;
  cuota: number;
  imagen: string;
  esBandera: boolean;
  /** Igual que en `Pick`: con qué buscar el escudo o la cara. */
  nombres?: string[];
  sujeto?: SujetoPick;
  competicionId: string;
  partidoId: string;
  guardadoEn: string;
  resultado: ResultadoPick;
  /** Valor real que saco la metrica, cuando ya se jugo. */
  valorReal?: number;
}

export interface Lesion {
  jugadorId: string;
  nombre: string;
  equipoId: string;
  tipo: string;
  estado: 'baja' | 'duda' | 'sancionado';
  vuelta: string;
}

export interface Alineacion {
  formacion: string;
  once: { jugadorId: string; x: number; y: number }[];
  suplentes: string[];
  confirmada: boolean;
}
