import { METRICAS_EQUIPO, METRICAS_JUGADOR } from './picks';
import type { PickGuardado, ResultadoPick } from './tipos';

/**
 * Resuelve un pick guardado con datos pedidos a ESPN en el momento, sin
 * esperar a la siguiente importacion. Es lo que permite avisar al usuario en
 * cuanto su pick se cumple o se cae.
 */

const RAIZ = 'https://site.api.espn.com/apis/site/v2/sports/soccer';

const limpio = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Del identificador del pick se sacan metrica, linea y sentido. */
export function troceaPick(pickId: string, partidoId: string) {
  const resto = pickId.startsWith(`${partidoId}-`) ? pickId.slice(partidoId.length + 1) : pickId;
  const trozos = resto.split('-');
  /*
   * La línea puede venir en negativo —los hándicaps lo usan— y ahí no cabe un
   * signo menos: el identificador se parte por guiones y "-1.5" lo rompería en
   * dos. Se escribe como "m1.5" al fabricarlo y se deshace aquí.
   */
  const crudaLinea = trozos[trozos.length - 2] ?? '';
  return {
    sentido: trozos[trozos.length - 1] as 'mas' | 'menos',
    linea: crudaLinea.startsWith('m') ? -Number(crudaLinea.slice(1)) : Number(crudaLinea),
    metrica: trozos[trozos.length - 3],
    sujetoId: trozos.slice(0, -3).join('-'),
  };
}

interface Resumen {
  terminado: boolean;
  golesLocal: number;
  golesVisitante: number;
  nombreLocal: string;
  nombreVisitante: string;
  /** Estadisticas de equipo, por nombre. */
  porEquipo: Map<string, Record<string, number>>;
  /** Lineas de jugador, por nombre de jugador. */
  porJugador: Map<string, Record<string, number>>;
}

/** Pide el detalle de un partido concreto a ESPN. */
export async function resumenDelPartido(slug: string, idEspn: string): Promise<Resumen | null> {
  try {
    const r = await fetch(`${RAIZ}/${slug}/summary?event=${idEspn}`);
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, any>;

    const competidores = j.header?.competitions?.[0]?.competitors ?? [];
    const local = competidores.find((x: any) => x.homeAway === 'home');
    const visitante = competidores.find((x: any) => x.homeAway === 'away');
    const estado = j.header?.competitions?.[0]?.status?.type;

    const porEquipo = new Map<string, Record<string, number>>();
    for (const t of j.boxscore?.teams ?? []) {
      const v = (n: string) =>
        num((t.statistics ?? []).find((s: any) => s.name === n)?.displayValue);
      porEquipo.set(limpio(t.team?.displayName ?? ''), {
        remates: v('totalShots'),
        rematesPuerta: v('shotsOnTarget'),
        corners: v('wonCorners'),
        tarjetas: v('yellowCards'),
      });
    }

    const porJugador = new Map<string, Record<string, number>>();
    for (const bloque of j.rosters ?? []) {
      for (const entrada of bloque.roster ?? []) {
        const nombre = entrada.athlete?.displayName;
        if (!nombre) continue;
        const s = (n: string) =>
          num((entrada.stats ?? []).find((x: any) => x.name === n)?.displayValue);
        porJugador.set(limpio(nombre), {
          goles: s('totalGoals'),
          asistencias: s('goalAssists'),
          remates: s('totalShots'),
          rematesPuerta: s('shotsOnTarget'),
          faltasCometidas: s('foulsCommitted'),
          faltasRecibidas: s('foulsSuffered'),
          amarillas: s('yellowCards'),
          paradas: s('saves'),
        });
      }
    }

    return {
      terminado: estado?.state === 'post' || !!estado?.completed,
      golesLocal: num(local?.score),
      golesVisitante: num(visitante?.score),
      nombreLocal: local?.team?.displayName ?? '',
      nombreVisitante: visitante?.team?.displayName ?? '',
      porEquipo,
      porJugador,
    };
  } catch {
    return null;
  }
}

/**
 * Valor que lleva el sujeto del pick en este partido, sea jugador, equipo o
 * el partido entero. Devuelve `undefined` cuando el acta no tiene ese dato.
 *
 * Está fuera de `compruebaPick` porque hace falta en dos momentos: al acabar
 * el partido, para decidir, y con el partido en juego, para ver si un "más de"
 * ya cruzó la línea.
 */
function valorDe(
  guardado: PickGuardado,
  resumen: Resumen,
  metrica: string,
): number | undefined {
  // El nombre del sujeto es el titulo de la tarjeta: jugador o equipo.
  const clave = limpio(guardado.titulo);

  /*
   * Manda el sujeto del pick, no el nombre de la metrica.
   *
   * La métrica `goles` está en las dos tablas —la de jugador y la de equipo—
   * y antes se
   * miraba primero la de jugador: un pick de "menos de 1.5 goles del equipo"
   * buscaba a "Blooming" entre los futbolistas del acta, no lo encontraba y se
   * daba por nulo. Salia en gris cuando tenia que salir en rojo.
   */
  if (guardado.sujeto === 'jugador') {
    return resumen.porJugador.get(clave)?.[metrica];
  }
  if (guardado.sujeto === 'equipo') {
    /*
     * De cuál de los dos equipos habla el pick.
     *
     * Antes bastaba con "no es el local" para dar por hecho que era el
     * visitante: `clave === local ? golesLocal : golesVisitante`. Con eso, un
     * nombre que no encajara carácter por carácter —"FC Barcelona" contra el
     * "Barcelona" que devuelve ESPN— se resolvía con el marcador del rival, y
     * el pick se cerraba en verde o en rojo por los goles de otro equipo. Un
     * fallo así no se ve: el resultado parece plausible.
     *
     * Ahora se comprueban los dos, tolerando que un nombre contenga al otro, y
     * si no se sabe de quién habla no se devuelve nada. Un pick sin resolver
     * es molesto; uno resuelto al revés es peor.
     */
    const local = limpio(resumen.nombreLocal);
    const visitante = limpio(resumen.nombreVisitante);
    const encaja = (a: string, b: string) => !!a && !!b && (a.includes(b) || b.includes(a));

    const esLocal = encaja(clave, local);
    const esVisitante = encaja(clave, visitante);
    // Ni uno ni otro, o los dos a la vez: no hay certeza, así que no se decide.
    if (esLocal === esVisitante) return undefined;

    if (metrica === 'goles') return esLocal ? resumen.golesLocal : resumen.golesVisitante;
    /*
     * Hándicap: lo que cuenta es la diferencia de goles vista desde el equipo
     * del pick. Cubrirlo es que esa diferencia supere la línea, y de compararla
     * ya se encarga quien llama.
     */
    if (metrica === 'handicap') {
      return esLocal
        ? resumen.golesLocal - resumen.golesVisitante
        : resumen.golesVisitante - resumen.golesLocal;
    }
    // Se busca por el nombre que usa ESPN, que es con el que está indexado.
    return resumen.porEquipo.get(esLocal ? local : visitante)?.[metrica];
  }
  if (metrica === 'golesTotales') return resumen.golesLocal + resumen.golesVisitante;
  if (metrica === 'cornersTotales' || metrica === 'tarjetasTotales' || metrica === 'rematesTotales') {
    const campo = {
      cornersTotales: 'corners',
      tarjetasTotales: 'tarjetas',
      rematesTotales: 'remates',
    }[metrica]!;
    let suma = 0;
    for (const e of resumen.porEquipo.values()) suma += e[campo] ?? 0;
    return suma;
  }
  return undefined;
}

/**
 * Comprueba un pick guardado contra el resumen del partido. Devuelve
 * `pendiente` mientras no haya terminado o falte el dato.
 */
export function compruebaPick(
  guardado: PickGuardado,
  resumen: Resumen,
): { resultado: ResultadoPick; valorReal?: number } {
  /*
   * Con el partido aun en juego solo se puede cerrar una cosa: un "mas de"
   * que ya haya cruzado la linea. Si el jugador lleva cuatro remates y el
   * pick pedia mas de 1.5, eso ya esta ganado y no puede desandarse, asi que
   * se avisa en el momento en vez de hacer esperar noventa minutos.
   *
   * Un "menos de" es al reves: hasta el pitido final siempre puede romperse.
   * Y el 1X2 tampoco vale, que un 1-0 al descanso no es una victoria.
   */
  if (!resumen.terminado) {
    if (guardado.pickId.includes('-1x2-')) return { resultado: 'pendiente' };
    const enCurso = troceaPick(guardado.pickId, guardado.partidoId);
    if (enCurso.sentido !== 'mas' || Number.isNaN(enCurso.linea)) {
      return { resultado: 'pendiente' };
    }
    /*
     * El hándicap tampoco se cierra en marcha, aunque sea un "más de": una
     * ventaja de dos goles en el minuto 60 se puede deshacer, y darlo por
     * ganado ahí sería anunciar un acierto que luego se cae.
     */
    if (enCurso.metrica === 'handicap') return { resultado: 'pendiente' };
    const valorAhora = valorDe(guardado, resumen, enCurso.metrica);
    if (valorAhora !== undefined && valorAhora > enCurso.linea) {
      return { resultado: 'ganado', valorReal: valorAhora };
    }
    return { resultado: 'pendiente' };
  }

  // 1X2 se decide con el marcador.
  if (guardado.pickId.includes('-1x2-')) {
    if (guardado.mercado === 'Empate') {
      return {
        resultado: resumen.golesLocal === resumen.golesVisitante ? 'ganado' : 'perdido',
      };
    }
    /*
     * De qué equipo hablaba el pick. El mercado dice "Gana <club>" con el
     * nombre entero, así que se compara normalizado contra los dos nombres de
     * ESPN y gana el que más se parezca. Antes se miraban las tres primeras
     * letras del local, y bastaba con que aparecieran en cualquier parte del
     * texto para dar por bueno el equipo equivocado.
     */
    const dicho = limpio(guardado.mercado.replace(/^Gana\s+/i, ''));
    const esLocal = dicho.includes(limpio(resumen.nombreLocal)) ||
      limpio(resumen.nombreLocal).includes(dicho);
    const gana = esLocal
      ? resumen.golesLocal > resumen.golesVisitante
      : resumen.golesVisitante > resumen.golesLocal;
    return { resultado: gana ? 'ganado' : 'perdido' };
  }

  const { metrica, linea, sentido } = troceaPick(guardado.pickId, guardado.partidoId);
  if (!metrica || Number.isNaN(linea)) return { resultado: 'pendiente' };

  // Un jugador que no aparece en el acta no jugo: el pick se anula. Solo
  // aplica a los picks de jugador; un equipo siempre esta en el acta.
  if (guardado.sujeto === 'jugador' && !resumen.porJugador.has(limpio(guardado.titulo))) {
    return { resultado: 'nulo' };
  }

  const valor = valorDe(guardado, resumen, metrica);
  if (valor === undefined) return { resultado: 'pendiente' };
  const acierta = sentido === 'mas' ? valor > linea : valor < linea;
  return { resultado: acierta ? 'ganado' : 'perdido', valorReal: valor };
}

/**
 * Cuánto lleva el sujeto del pick a estas alturas del partido, y qué línea
 * tenía que batir. Es lo que permite enseñar "3 de 1.5 remates · 62'" en el
 * historial en vez de un simple "pendiente".
 */
export function progresoDelPick(
  guardado: PickGuardado,
  resumen: Resumen,
): { valor: number; linea: number; sentido: 'mas' | 'menos' } | null {
  if (guardado.pickId.includes('-1x2-')) return null;
  const { metrica, linea, sentido } = troceaPick(guardado.pickId, guardado.partidoId);
  if (!metrica || Number.isNaN(linea)) return null;
  const valor = valorDe(guardado, resumen, metrica);
  if (valor === undefined) return null;
  return { valor, linea, sentido };
}
