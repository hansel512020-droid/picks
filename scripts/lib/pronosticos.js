'use strict';
/* ==========================================================================
   Scout Picks · lib/pronosticos.js
   Las formulas. Convierte el historial de una competicion en probabilidades
   para cada partido por jugar, y de ahi en cuotas justas y en valor.

   El modelo es un Poisson bivariante con indices de ataque y defensa, que es
   el estandar para futbol y el que mejor se porta con pocos partidos:

     1. Se mide lo que marca y encaja cada equipo por partido.
     2. Se divide por la media de la competicion -> indice de ataque y defensa
        (1.00 es del monton, 1.30 es un 30% mejor que la media).
     3. goles esperados del local = media local * ataque local * defensa visitante
        goles esperados del visitante = media visitante * ataque visit. * defensa local
     4. Con esos dos numeros se levanta la matriz de marcadores y de ahi salen
        el 1X2, el mas/menos 2.5, el ambos marcan y el marcador mas probable.

   La ventaja de SofaScore esta en el paso 1: con su xG real se mide lo que un
   equipo *merecio* marcar, no lo que le entro. Un equipo que genera 2.1 de xG y
   marca 0 tuvo mala suerte, no mal ataque, y el modelo lo entiende. Sin xG hay
   que fiarse del gol, que es mucho mas ruidoso.
   ========================================================================== */

/*
 * Cuanto pesa el xG frente al gol al medir a un equipo.
 *
 * Ni todo ni nada. El xG predice mejor lo que viene, pero el gol tambien lleva
 * informacion que el xG no ve: rematadores que baten su xG temporada tras
 * temporada, y equipos que defienden el resultado. Un 65/35 es lo que usa la
 * literatura y lo que aguanta mejor en el backtest.
 */
const PESO_XG = 0.65;

/*
 * Partidos "de mentira" que se suman a cada equipo con el indice de la media.
 *
 * Sin esto, un equipo con dos partidos y cinco goles sale con un ataque de 2.5
 * y el modelo le da un 70% de ganar a cualquiera. Anadiendo cuatro partidos
 * imaginarios del monton, ese equipo tira hacia la media hasta que acumule
 * historial de verdad. Es regularizacion de toda la vida.
 */
const PARTIDOS_FANTASMA = 4;

/** Ningun indice puede salirse de aqui: cortafuegos contra muestras absurdas. */
const INDICE_MINIMO = 0.35;
const INDICE_MAXIMO = 2.4;

/** Cuantos partidos de cada equipo se miran hacia atras. */
const VENTANA = 20;

/*
 * Cada partido pesa menos cuanto mas viejo. 0.96 por partido de distancia deja
 * el de hace veinte jornadas en un 44% de lo que pesa el ultimo: se nota la
 * forma reciente sin tirar por la borda la temporada entera.
 */
const DECAIMIENTO = 0.96;

const factoriales = [1];
function factorial(n) {
  for (let i = factoriales.length; i <= n; i++) factoriales[i] = factoriales[i - 1] * i;
  return factoriales[n];
}

/** P(X = k) para una Poisson de media lambda. */
function poisson(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
}

/** Redondeo corto: el archivo ya pesa 24 MB, no hacen falta quince decimales. */
const r2 = (n) => Number(n.toFixed(2));
const r4 = (n) => Number(n.toFixed(4));

/** Encierra un indice entre el minimo y el maximo. */
const acota = (n) => Math.min(INDICE_MAXIMO, Math.max(INDICE_MINIMO, n));

/*
 * La correccion de Dixon-Coles.
 *
 * Un Poisson por equipo da por hecho que los dos marcadores son independientes,
 * y en futbol no lo son: a 0-0 y a 1-1 los dos equipos se conforman, y el
 * partido se congela. Por eso el Poisson pelado siempre saca menos empates de
 * los que hay —en la Premier de este archivo, un 24% contra un 30% real—, y en
 * una app de picks eso es dinero: el empate es donde mas se equivoca.
 *
 * Dixon y Coles (1997) lo arreglan retocando solo los cuatro marcadores bajos,
 * que es donde falla, y dejando el resto igual. `rho` negativo sube el 0-0 y el
 * 1-1 y baja el 1-0 y el 0-1. El -0.13 es el valor que sale en la literatura
 * para ligas europeas y el que mejor ajusta las cuatro grandes de este archivo.
 */
const RHO = -0.13;

function tau(i, j, lambdaLocal, lambdaVisitante) {
  if (i === 0 && j === 0) return 1 - lambdaLocal * lambdaVisitante * RHO;
  if (i === 0 && j === 1) return 1 + lambdaLocal * RHO;
  if (i === 1 && j === 0) return 1 + lambdaVisitante * RHO;
  if (i === 1 && j === 1) return 1 - RHO;
  return 1;
}

/**
 * La matriz de marcadores: probabilidad de cada resultado exacto hasta 8-8.
 * Mas alla de ocho goles la probabilidad es despreciable y solo cuesta tiempo.
 */
function matriz(lambdaLocal, lambdaVisitante, tope = 8) {
  const m = [];
  let suma = 0;
  for (let i = 0; i <= tope; i++) {
    const fila = [];
    const pi = poisson(i, lambdaLocal);
    for (let j = 0; j <= tope; j++) {
      // El maximo con cero es un cortafuegos: con lambdas muy altas el ajuste
      // podria dar negativo, y una probabilidad negativa rompe todo lo demas.
      const p = Math.max(0, pi * poisson(j, lambdaVisitante) * tau(i, j, lambdaLocal, lambdaVisitante));
      fila.push(p);
      suma += p;
    }
    m.push(fila);
  }
  // El retoque rompe el que sume 1, y ademas se corta en ocho goles: se
  // reescala para que la matriz vuelva a ser una distribucion de verdad.
  if (suma > 0) {
    for (const fila of m) {
      for (let j = 0; j < fila.length; j++) fila[j] /= suma;
    }
  }
  return m;
}

/** Todos los mercados que salen de una matriz de marcadores. */
function mercados(m) {
  let local = 0;
  let empate = 0;
  let visitante = 0;
  let ambosMarcan = 0;
  let mejor = { local: 0, visitante: 0, probabilidad: 0 };
  // Los mas/menos de las lineas que de verdad se apuestan.
  const lineas = [1.5, 2.5, 3.5];
  const mas = Object.fromEntries(lineas.map((l) => [l, 0]));

  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < m[i].length; j++) {
      const p = m[i][j];
      if (i > j) local += p;
      else if (i === j) empate += p;
      else visitante += p;
      if (i >= 1 && j >= 1) ambosMarcan += p;
      for (const l of lineas) if (i + j > l) mas[l] += p;
      if (p > mejor.probabilidad) mejor = { local: i, visitante: j, probabilidad: p };
    }
  }

  return {
    local: r4(local),
    empate: r4(empate),
    visitante: r4(visitante),
    // Doble oportunidad: sale de las tres de arriba, pero se guarda hecha
    // porque es de los mercados que mas se juegan.
    localOEmpate: r4(local + empate),
    visitanteOEmpate: r4(visitante + empate),
    sinEmpate: r4(local + visitante),
    ambosMarcan: r4(ambosMarcan),
    ambosNoMarcan: r4(1 - ambosMarcan),
    mas15: r4(mas[1.5]),
    menos15: r4(1 - mas[1.5]),
    mas25: r4(mas[2.5]),
    menos25: r4(1 - mas[2.5]),
    mas35: r4(mas[3.5]),
    menos35: r4(1 - mas[3.5]),
    marcadorProbable: {
      local: mejor.local,
      visitante: mejor.visitante,
      probabilidad: r4(mejor.probabilidad),
    },
  };
}

/**
 * Mide a cada equipo a partir de los partidos ya jugados.
 *
 * `conXgReal` son los ids de partido cuyo xG vino de SofaScore. Solo en esos se
 * mezcla xG con gol; en el resto el xG del archivo es una estimacion que sale
 * del propio gol (`construir.js`), y mezclarla seria contarse el gol dos veces.
 */
function fuerzas(partidos, conXgReal) {
  const jugados = partidos
    .filter((p) => p.estado === 'finalizado')
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  if (jugados.length < 4) return null;

  // Medias de la competicion, separando local de visitante: ahi va metida la
  // ventaja de jugar en casa, sin tener que inventarse un factor fijo.
  let golesLocal = 0;
  let golesVisitante = 0;
  let cornersLocal = 0;
  let cornersVisitante = 0;
  let puertaLocal = 0;
  let puertaVisitante = 0;
  let conCorners = 0;
  let conPuerta = 0;

  for (const p of jugados) {
    golesLocal += p.golesLocal ?? 0;
    golesVisitante += p.golesVisitante ?? 0;
    const cl = p.estadisticas?.local?.corners ?? 0;
    const cv = p.estadisticas?.visitante?.corners ?? 0;
    if (cl || cv) {
      cornersLocal += cl;
      cornersVisitante += cv;
      conCorners++;
    }
    const pl = p.estadisticas?.local?.rematesPuerta ?? 0;
    const pv = p.estadisticas?.visitante?.rematesPuerta ?? 0;
    if (pl || pv) {
      puertaLocal += pl;
      puertaVisitante += pv;
      conPuerta++;
    }
  }

  const n = jugados.length;
  const media = {
    golesLocal: golesLocal / n,
    golesVisitante: golesVisitante / n,
    cornersLocal: conCorners ? cornersLocal / conCorners : 0,
    cornersVisitante: conCorners ? cornersVisitante / conCorners : 0,
    puertaLocal: conPuerta ? puertaLocal / conPuerta : 0,
    puertaVisitante: conPuerta ? puertaVisitante / conPuerta : 0,
  };
  const mediaGoles = (media.golesLocal + media.golesVisitante) / 2;
  if (mediaGoles <= 0) return null;

  // Lo que hizo cada equipo, partido a partido y con el peso de la fecha.
  const porEquipo = new Map();
  const ficha = (id) => {
    if (!porEquipo.has(id)) {
      porEquipo.set(id, {
        peso: 0, favor: 0, contra: 0, cornersFavor: 0, cornersContra: 0,
        puertaFavor: 0, puertaContra: 0, pesoCorners: 0, pesoPuerta: 0,
        partidos: 0, nCorners: 0, nPuerta: 0, conXg: 0,
      });
    }
    return porEquipo.get(id);
  };

  /*
   * La ventana es por equipo, no de la competicion entera.
   *
   * Recortar "los ultimos 40 partidos de la liga" deja a cada equipo de una
   * Premier de veinte con cuatro partidos, y con cuatro partidos los indices
   * se los comen los partidos fantasma y todo sale del monton. Se recorre de
   * nuevo a viejo y cada equipo se lleva sus VENTANA partidos, esten donde
   * esten en el calendario.
   *
   * El peso tambien es suyo: el ultimo partido de cada equipo vale 1, el
   * anterior 0.96, y asi. Antes se pesaba por la posicion en el calendario de
   * la liga, que castigaba a quien tenia un partido aplazado.
   */
  for (let k = jugados.length - 1; k >= 0; k--) {
    const p = jugados[k];
    const l = ficha(p.localId);
    const v = ficha(p.visitanteId);
    if (l.partidos >= VENTANA && v.partidos >= VENTANA) continue;
    // Cada lado se pesa por los partidos que ya lleva contados el, que es su
    // distancia real al presente.
    const pesoLocal = Math.pow(DECAIMIENTO, l.partidos);
    const pesoVisitante = Math.pow(DECAIMIENTO, v.partidos);
    const real = conXgReal.has(p.id);

    /*
     * El rendimiento de un equipo en un partido: sus goles, o la mezcla de sus
     * goles con su xG cuando el xG es de verdad.
     */
    const rinde = (goles, xg) => (real && xg > 0 ? PESO_XG * xg + (1 - PESO_XG) * goles : goles);

    const gl = p.golesLocal ?? 0;
    const gv = p.golesVisitante ?? 0;
    const rl = rinde(gl, p.estadisticas?.local?.xg ?? 0);
    const rv = rinde(gv, p.estadisticas?.visitante?.xg ?? 0);

    l.peso += pesoLocal;
    l.favor += rl * pesoLocal;
    l.contra += rv * pesoLocal;
    v.peso += pesoVisitante;
    v.favor += rv * pesoVisitante;
    v.contra += rl * pesoVisitante;
    if (real) {
      l.conXg++;
      v.conXg++;
    }

    const cl = p.estadisticas?.local?.corners ?? 0;
    const cv = p.estadisticas?.visitante?.corners ?? 0;
    if (cl || cv) {
      l.cornersFavor += cl * pesoLocal;
      l.cornersContra += cv * pesoLocal;
      l.pesoCorners += pesoLocal;
      l.nCorners++;
      v.cornersFavor += cv * pesoVisitante;
      v.cornersContra += cl * pesoVisitante;
      v.pesoCorners += pesoVisitante;
      v.nCorners++;
    }

    const tl = p.estadisticas?.local?.rematesPuerta ?? 0;
    const tv = p.estadisticas?.visitante?.rematesPuerta ?? 0;
    if (tl || tv) {
      l.puertaFavor += tl * pesoLocal;
      l.puertaContra += tv * pesoLocal;
      l.pesoPuerta += pesoLocal;
      l.nPuerta++;
      v.puertaFavor += tv * pesoVisitante;
      v.puertaContra += tl * pesoVisitante;
      v.pesoPuerta += pesoVisitante;
      v.nPuerta++;
    }

    // Al final, que el peso de cada lado se calcula con lo que llevaba antes.
    l.partidos++;
    v.partidos++;
  }

  /*
   * De medias a indices, con los partidos fantasma metidos dentro.
   *
   * indice = (lo suyo + fantasmas * la media) / (sus partidos + fantasmas), y
   * luego dividido por la media. Con cero partidos da 1.00 exacto; con muchos,
   * los fantasmas dejan de notarse.
   */
  const indice = (suma, peso, mediaRef, muestra) => {
    if (mediaRef <= 0) return 1;
    if (peso <= 0) return 1;
    const suyo = suma / peso;
    const mezclado = (suyo * muestra + mediaRef * PARTIDOS_FANTASMA) / (muestra + PARTIDOS_FANTASMA);
    return acota(mezclado / mediaRef);
  };

  const mediaCorners = (media.cornersLocal + media.cornersVisitante) / 2;
  const mediaPuerta = (media.puertaLocal + media.puertaVisitante) / 2;
  const salida = new Map();
  for (const [id, f] of porEquipo) {
    salida.set(id, {
      ataque: r2(indice(f.favor, f.peso, mediaGoles, f.partidos)),
      defensa: r2(indice(f.contra, f.peso, mediaGoles, f.partidos)),
      cornersFavor: r2(indice(f.cornersFavor, f.pesoCorners, mediaCorners, f.nCorners)),
      cornersContra: r2(indice(f.cornersContra, f.pesoCorners, mediaCorners, f.nCorners)),
      puertaFavor: r2(indice(f.puertaFavor, f.pesoPuerta, mediaPuerta, f.nPuerta)),
      puertaContra: r2(indice(f.puertaContra, f.pesoPuerta, mediaPuerta, f.nPuerta)),
      partidos: f.partidos,
      conXgReal: f.conXg,
    });
  }

  return { media, mediaGoles, mediaCorners, mediaPuerta, equipos: salida, muestra: jugados.length };
}

/** Probabilidad de pasar de una linea (8.5, 9.5...) con una Poisson. */
function masDe(linea, lambda) {
  let acumulado = 0;
  for (let k = 0; k <= Math.floor(linea); k++) acumulado += poisson(k, lambda);
  return 1 - acumulado;
}

/** El nombre bonito de cada mercado, para que la app no tenga que traducirlo. */
const NOMBRES = {
  local: 'Gana el local',
  empate: 'Empate',
  visitante: 'Gana el visitante',
  localOEmpate: 'Local o empate',
  visitanteOEmpate: 'Visitante o empate',
  ambosMarcan: 'Ambos marcan',
  ambosNoMarcan: 'Ambos no marcan',
  mas15: 'Más de 1.5 goles',
  menos15: 'Menos de 1.5 goles',
  mas25: 'Más de 2.5 goles',
  menos25: 'Menos de 2.5 goles',
  mas35: 'Más de 3.5 goles',
  menos35: 'Menos de 3.5 goles',
};

/** Donde mirar la cuota publicada de cada mercado dentro del partido. */
const CUOTA_DE = {
  local: (c) => c?.local,
  empate: (c) => c?.empate,
  visitante: (c) => c?.visitante,
  mas25: (c) => c?.mas25,
  menos25: (c) => c?.menos25,
  ambosMarcan: (c) => c?.ambosMarcan,
  ambosNoMarcan: (c) => c?.ambosNoMarcan,
};

/**
 * El pronostico de un partido.
 *
 * Devuelve null si no hay con que: sin fuerzas de los dos equipos, afirmar algo
 * seria inventarselo, y un pick inventado es peor que ningun pick.
 */
function dePartido(partido, f, nombres) {
  const local = f.equipos.get(partido.localId);
  const visitante = f.equipos.get(partido.visitanteId);
  if (!local || !visitante) return null;

  // ------------------------------------------------------------- los goles
  const lambdaLocal = f.media.golesLocal * local.ataque * visitante.defensa;
  const lambdaVisitante = f.media.golesVisitante * visitante.ataque * local.defensa;
  const m = matriz(lambdaLocal, lambdaVisitante);
  const p = mercados(m);

  // ----------------------------------------------------------- los corners
  // Mismo reparto que con los goles: lo que saca uno contra lo que concede el
  // otro. Solo si la competicion trae corners en el historial.
  let corners = null;
  if (f.mediaCorners > 0) {
    const cl = f.media.cornersLocal * local.cornersFavor * visitante.cornersContra;
    const cv = f.media.cornersVisitante * visitante.cornersFavor * local.cornersContra;
    corners = {
      local: r2(cl),
      visitante: r2(cv),
      total: r2(cl + cv),
      mas85: r4(masDe(8.5, cl + cv)),
      mas95: r4(masDe(9.5, cl + cv)),
      mas105: r4(masDe(10.5, cl + cv)),
    };
  }

  // ------------------------------------------------------ remates a puerta
  let rematesPuerta = null;
  if (f.mediaPuerta > 0) {
    const tl = f.media.puertaLocal * local.puertaFavor * visitante.puertaContra;
    const tv = f.media.puertaVisitante * visitante.puertaFavor * local.puertaContra;
    rematesPuerta = {
      local: r2(tl),
      visitante: r2(tv),
      total: r2(tl + tv),
      mas75: r4(masDe(7.5, tl + tv)),
      mas85: r4(masDe(8.5, tl + tv)),
    };
  }

  // -------------------------------------------------- cuotas justas y valor
  // La cuota justa es 1/probabilidad. Comparada con la que publica la casa da
  // el valor esperado: p * cuota - 1. En positivo, la casa paga de mas.
  const cuotasJustas = {};
  for (const clave of Object.keys(NOMBRES)) {
    if (p[clave] > 0) cuotasJustas[clave] = r2(1 / p[clave]);
  }

  const valor = [];
  for (const [clave, saca] of Object.entries(CUOTA_DE)) {
    const cuota = saca(partido.cuotas);
    const prob = p[clave];
    if (!cuota || cuota <= 1 || !prob) continue;
    const esperado = prob * cuota - 1;
    valor.push({
      mercado: clave,
      nombre: NOMBRES[clave],
      probabilidad: prob,
      cuota: r2(cuota),
      cuotaJusta: r2(1 / prob),
      valorEsperado: r4(esperado),
    });
  }
  valor.sort((a, b) => b.valorEsperado - a.valorEsperado);

  /*
   * La recomendacion.
   *
   * Con cuotas publicadas manda el valor esperado, que es de lo que se vive:
   * acertar el 70% pagando 1.20 pierde dinero. Pero solo entre los mercados con
   * una probabilidad decente, porque un 8% a cuota 15 sale con valor positivo
   * por el ruido del modelo y no es una apuesta, es una loteria.
   *
   * Sin cuotas se recomienda lo mas probable, y se dice que no hubo precios.
   */
  const CONFIANZA_MINIMA = 0.35;
  const VALOR_MINIMO = 0.03;
  /*
   * Y un techo, que es menos evidente pero igual de necesario.
   *
   * Cuando el modelo dice que un partido esta al 36% y la casa lo paga a 5.75
   * —un 17%—, el calculo sale con un +107% de valor esperado. Eso no es una
   * ganga: es que el modelo se ha equivocado. Las casas mueven millones y
   * ajustan con bajas, alineaciones y mercado; un Poisson con veinte partidos
   * no les encuentra un 107% de ventaja. Cuando la discrepancia es enorme, el
   * que esta mal es casi siempre el de aqui.
   *
   * Por encima de este techo el mercado se queda con la razon y no se
   * recomienda. El calculo sigue en `valor` para que se pueda mirar, pero no
   * se le pone delante al usuario como si fuera una apuesta.
   */
  const VALOR_MAXIMO = 0.35;
  let recomendacion = null;
  const conValor = valor.filter(
    (v) => v.probabilidad >= CONFIANZA_MINIMA && v.valorEsperado >= VALOR_MINIMO && v.valorEsperado <= VALOR_MAXIMO,
  );
  if (conValor.length) {
    const mejor = conValor[0];
    recomendacion = { ...mejor, motivo: 'valor sobre la cuota publicada' };
  } else {
    let clave = null;
    for (const k of Object.keys(NOMBRES)) {
      // Las dobles y el "sin empate" quedan fuera del automatico: casi siempre
      // son lo mas probable y taparian cualquier otra lectura.
      if (k === 'localOEmpate' || k === 'visitanteOEmpate') continue;
      if (!clave || p[k] > p[clave]) clave = k;
    }
    if (clave) {
      const cuota = CUOTA_DE[clave]?.(partido.cuotas);
      recomendacion = {
        mercado: clave,
        nombre: NOMBRES[clave],
        probabilidad: p[clave],
        cuota: cuota ? r2(cuota) : null,
        cuotaJusta: r2(1 / p[clave]),
        valorEsperado: cuota ? r4(p[clave] * cuota - 1) : null,
        motivo: valor.some((v) => v.valorEsperado > VALOR_MAXIMO)
          ? 'lo más probable; el valor que salía era demasiado grande para fiarse del modelo'
          : valor.length
            ? 'lo más probable; ninguna cuota daba valor'
            : 'lo más probable; sin cuotas publicadas',
      };
    }
  }

  /*
   * Cuanto fiarse de esto. Lo que manda es el historial de los dos equipos:
   * por debajo de seis partidos el modelo esta adivinando, que es el mismo
   * minimo que usa picks.ts para publicar un pick de jugador.
   */
  const muestra = Math.min(local.partidos, visitante.partidos);
  const conXg = Math.min(local.conXgReal, visitante.conXgReal);
  let confianza = 'baja';
  if (muestra >= 10 && conXg >= 5) confianza = 'alta';
  else if (muestra >= 6) confianza = 'media';

  return {
    partidoId: partido.id,
    fecha: partido.fecha,
    local: nombres.get(partido.localId) ?? partido.localId,
    visitante: nombres.get(partido.visitanteId) ?? partido.visitanteId,
    golesEsperados: { local: r2(lambdaLocal), visitante: r2(lambdaVisitante), total: r2(lambdaLocal + lambdaVisitante) },
    fuerzas: {
      local: { ataque: local.ataque, defensa: local.defensa, partidos: local.partidos },
      visitante: { ataque: visitante.ataque, defensa: visitante.defensa, partidos: visitante.partidos },
    },
    probabilidades: p,
    corners,
    rematesPuerta,
    cuotasJustas,
    valor,
    recomendacion,
    confianza,
    muestra,
    // De cuantos de los partidos que sostienen este pronostico salio el xG de
    // SofaScore. Con cero, el modelo va solo con goles.
    conXgReal: conXg,
  };
}

/**
 * Los pronosticos de todos los partidos por jugar de una competicion.
 * `conXgReal` es el conjunto de ids de partido con xG de SofaScore.
 */
function deCompeticion(partidos, equipos, conXgReal = new Set()) {
  const f = fuerzas(partidos, conXgReal);
  if (!f) return { pronosticos: [], aviso: 'Menos de cuatro partidos jugados: no da para calcular nada.' };

  const nombres = new Map(equipos.map((e) => [e.id, e.nombre]));
  const abiertos = partidos
    .filter((p) => p.estado !== 'finalizado')
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  const pronosticos = [];
  for (const p of abiertos) {
    const uno = dePartido(p, f, nombres);
    if (uno) pronosticos.push(uno);
  }
  return {
    pronosticos,
    modelo: {
      tipo: 'poisson-dixon-coles',
      rho: RHO,
      pesoXg: PESO_XG,
      partidosFantasma: PARTIDOS_FANTASMA,
      decaimiento: DECAIMIENTO,
      ventana: VENTANA,
      mediaGolesLocal: r2(f.media.golesLocal),
      mediaGolesVisitante: r2(f.media.golesVisitante),
      mediaCorners: r2(f.mediaCorners * 2),
      partidosAnalizados: f.muestra,
    },
  };
}

module.exports = { deCompeticion, dePartido, fuerzas, matriz, mercados, poisson, masDe };
