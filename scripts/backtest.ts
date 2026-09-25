/*
 * ¿Aciertan los picks?
 *
 * Un examen con las respuestas tapadas. Para cada partido ya jugado se le pide
 * a la app que genere sus picks —usando solo lo que se sabía antes de ese
 * partido, que de eso se encarga el recorte por fecha de `picks.ts`— y después
 * se destapa el resultado y se mira si habría entrado.
 *
 * Es la única forma honesta de responder a "¿por qué debería pagar por esto?".
 * Sin esto, la respuesta es "porque creo que son buenos".
 *
 *   npm run backtest
 *   npm run backtest -- --ligas premier,laliga --partidos 200
 */

import { aplicaDatos, competicionesImportadas } from '../src/datos/importado';
import { temporada } from '../src/datos/motor';
import {
  METRICAS_EQUIPO,
  METRICAS_JUGADOR,
  METRICAS_PARTIDO,
  picksDePartido,
  usaVentanaLarga,
} from '../src/datos/picks';
import type { Partido, Pick, RegistroJugador } from '../src/datos/tipos';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

// ------------------------------------------------------------------ opciones

function opcion(nombre: string): string | null {
  const i = process.argv.indexOf(`--${nombre}`);
  return i > 0 ? (process.argv[i + 1] ?? null) : null;
}

/*
 * `--modo 1` mide la ventana ampliada (últimos 10, 20 y 40) contra la de
 * siempre (10 y 20). Sirve para responder con números a "¿y si el motor mirara
 * más partidos?" en vez de opinando.
 */
if (opcion('modo') === '1') {
  usaVentanaLarga(true);
  console.log('MODO: ventana ampliada (10 / 20 / 40)\n');
}

/** `--ver 35`: lista los picks con esa ventaja o más, uno por línea. */
const VER = opcion('ver') !== null ? Number(opcion('ver')) : null;

const LIGAS = opcion('ligas')?.split(',').map((s) => s.trim());
const TOPE = Number(opcion('partidos') ?? 400);
const ARCHIVO = opcion('archivo') ?? 'src/datos/importado.json';

// -------------------------------------------------------------------- datos

function cargaDatos(): void {
  const crudo = ARCHIVO.endsWith('.gz')
    ? gunzipSync(readFileSync(ARCHIVO)).toString('utf8')
    : readFileSync(ARCHIVO, 'utf8');
  aplicaDatos(JSON.parse(crudo));
}

// ------------------------------------------------------- evaluar un pick

/**
 * Qué valor sacó de verdad la métrica en ese partido.
 *
 * Devuelve `null` cuando no se puede saber —un jugador que no consta en el
 * acta, una métrica que no está en el catálogo—. Esos picks no cuentan ni a
 * favor ni en contra: contarlos como fallo castigaría al modelo por un dato que
 * falta, y como acierto sería mentir.
 */
function valorReal(
  pick: Pick,
  partido: Partido,
  registros: RegistroJugador[],
): number | null {
  if (pick.sujeto === 'equipo') {
    const met = METRICAS_EQUIPO.find((m) => m.clave === pick.metrica);
    if (!met) return null;
    return met.valor(partido, partido.localId === pick.sujetoId);
  }

  if (pick.sujeto === 'jugador') {
    const met = METRICAS_JUGADOR.find((m) => m.clave === pick.metrica);
    const registro = registros.find((r) => r.jugadorId === pick.sujetoId);
    if (!met || !registro) return null;
    return met.extractor(registro);
  }

  if (pick.sujeto === 'partido') {
    const met = METRICAS_PARTIDO.find((m) => m.clave === pick.metrica);
    return met ? met.valor(partido) : null;
  }

  return null;
}

const limpio = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

/**
 * El 1X2, resuelto con el marcador.
 *
 * Esto faltaba, y no era un detalle: **los picks de 1X2 son los ÚNICOS con una
 * cuota publicada de verdad**. Al quedarse fuera, todo lo que medía el backtest
 * eran picks con precio inventado por la propia app, así que el retorno se
 * comparaba consigo mismo. De ahí salía aquel "+70%".
 */
function acerto1x2(pick: Pick, partido: Partido, nombreLocal: string): boolean | null {
  const empate = partido.golesLocal === partido.golesVisitante;
  const ganaLocal = partido.golesLocal > partido.golesVisitante;
  const m = pick.mercado;
  const nLocal = limpio(nombreLocal);

  if (m === 'Empate') return empate;
  if (m === 'Gana uno de los dos (sin empate)') return !empate;

  const deLocal = (texto: string) => {
    const dicho = limpio(texto);
    return !!dicho && (dicho.includes(nLocal) || nLocal.includes(dicho));
  };

  if (/gana o empata/i.test(m)) {
    const esLocal = deLocal(m.replace(/\s*gana o empata\s*$/i, ''));
    return esLocal ? ganaLocal || empate : !ganaLocal;
  }
  if (/^Gana /i.test(m)) {
    const esLocal = deLocal(m.replace(/^Gana\s+/i, ''));
    return esLocal ? ganaLocal : !ganaLocal && !empate;
  }
  return null;
}

/** Si el pick habría entrado. `null` cuando no se puede saber. */
function acerto(
  pick: Pick,
  valor: number | null,
  partido: Partido,
  nombreLocal: string,
): boolean | null {
  if (pick.metrica === '1x2') return acerto1x2(pick, partido, nombreLocal);
  if (valor === null) return null;
  if (pick.sentido === 'mas') return valor > pick.linea;
  if (pick.sentido === 'menos') return valor < pick.linea;
  return null;
}

// ------------------------------------------------------------------ recuento

interface Casilla {
  picks: number;
  aciertos: number;
  /** Beneficio si se hubiera arriesgado 1 en cada uno. */
  retorno: number;
}

const vacia = (): Casilla => ({ picks: 0, aciertos: 0, retorno: 0 });

function suma(c: Casilla, gano: boolean, cuota: number): void {
  c.picks++;
  if (gano) {
    c.aciertos++;
    c.retorno += cuota - 1;
  } else {
    c.retorno -= 1;
  }
}

function linea(nombre: string, c: Casilla): string {
  if (!c.picks) return `  ${nombre.padEnd(16)} —`;
  const pct = ((c.aciertos / c.picks) * 100).toFixed(1);
  const roi = ((c.retorno / c.picks) * 100).toFixed(1);
  const signo = c.retorno >= 0 ? '+' : '';
  return (
    `  ${nombre.padEnd(16)} ${String(c.picks).padStart(6)} picks` +
    `   ${pct.padStart(5)}% acierto   ${signo}${roi}% retorno`
  );
}

// ---------------------------------------------------------------------- main

function main(): void {
  cargaDatos();

  const ligas = (LIGAS ?? competicionesImportadas()).filter((id) => id !== 'todas');
  if (!ligas.length) {
    console.error('No hay competiciones cargadas. ¿Existe', ARCHIVO, '?');
    process.exit(1);
  }

  const total = vacia();
  const porFamilia = new Map<string, Casilla>();
  const porVentaja = new Map<string, Casilla>();
  const porSujeto = new Map<string, Casilla>();
  /*
   * Lo importante de todo el informe: separar los picks cuyo precio publicó
   * alguien de los que puso el propio modelo.
   *
   * Un retorno calculado contra un precio que se ha inventado la app no es un
   * retorno: es el modelo midiéndose contra sí mismo. Si el precio estimado es
   * un poco generoso, el "beneficio" sale solo, y ni un céntimo de eso existe
   * fuera del ordenador. Solo la primera columna se puede enseñar.
   */
  const conCuotaReal = vacia();
  const conPrecioEstimado = vacia();
  let sinResolver = 0;
  let partidosVistos = 0;

  for (const ligaId of ligas) {
    const t = temporada(ligaId);

    /*
     * Los más recientes primero, y con tope.
     *
     * Cada partido obliga a recalcular el historial de los dos equipos, así que
     * el coste sube deprisa. Y los primeros partidos de una temporada no valen
     * para medir: el modelo necesita seis partidos previos y ahí no los tiene.
     */
    const jugados = t.partidos
      .filter((p) => p.estado === 'finalizado')
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, TOPE);

    for (const partido of jugados) {
      // `libres` con el comodín: se evalúan todos, no solo los gratis.
      const picks = picksDePartido(ligaId, partido.id, 'medio', new Set(['*']));
      if (!picks.length) continue;
      partidosVistos++;

      const registros = t.registrosPorPartido.get(partido.id) ?? [];

      const nombreLocal = t.porEquipo.get(partido.localId)?.nombre ?? '';

      for (const pick of picks) {
        const gano = acerto(pick, valorReal(pick, partido, registros), partido, nombreLocal);
        if (gano === null) {
          sinResolver++;
          continue;
        }

        suma(total, gano, pick.cuota);
        suma(pick.precioReal ? conCuotaReal : conPrecioEstimado, gano, pick.cuota);

        const fam = porFamilia.get(pick.familia) ?? vacia();
        suma(fam, gano, pick.cuota);
        porFamilia.set(pick.familia, fam);

        const suj = porSujeto.get(pick.sujeto) ?? vacia();
        suma(suj, gano, pick.cuota);
        porSujeto.set(pick.sujeto, suj);

        const tramo =
          pick.ventaja < 10 ? '1. menos de 10%'
          : pick.ventaja < 20 ? '2. 10-20%'
          : pick.ventaja < 35 ? '3. 20-35%'
          : '4. más de 35%';
        const v = porVentaja.get(tramo) ?? vacia();
        suma(v, gano, pick.cuota);
        porVentaja.set(tramo, v);

        // `--ver 35` escupe uno a uno los picks por encima de esa ventaja, con
        // su partido y si entró. Para poder mirar con los ojos si el tramo que
        // más rinde son picks de verdad o un artefacto de cuatro mercados raros.
        if (VER !== null && pick.ventaja >= VER) {
          const eq = (id: string) => t.equipos.find((e) => e.id === id)?.nombre ?? id;
          console.log(
            `${partido.fecha.slice(0, 10)} ${eq(partido.localId)} ${partido.golesLocal}-${partido.golesVisitante} ${eq(partido.visitanteId)}` +
              ` · ${pick.titulo} · ${pick.mercado} @${pick.cuota}` +
              ` · ventaja ${pick.ventaja}% · ${gano ? 'ENTRÓ' : 'falló'}`,
          );
        }
      }
    }
  }

  const ordenadas = (m: Map<string, Casilla>) =>
    [...m.entries()].sort((a, b) => b[1].picks - a[1].picks);

  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  ${ligas.length} competiciones · ${partidosVistos} partidos con picks`);
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(linea('TOTAL', total));
  console.log('');
  console.log('  Según de dónde sale el precio  ← lo primero que hay que mirar');
  console.log(linea('cuota publicada', conCuotaReal));
  console.log(linea('precio estimado', conPrecioEstimado));
  console.log('');
  console.log('  Por tipo de sujeto');
  for (const [k, c] of ordenadas(porSujeto)) console.log(linea(k, c));
  console.log('');
  console.log('  Por mercado');
  for (const [k, c] of ordenadas(porFamilia)) console.log(linea(k, c));
  console.log('');
  console.log('  Por ventaja anunciada');
  for (const [k, c] of [...porVentaja.entries()].sort()) console.log(linea(k, c));
  console.log('');
  if (sinResolver) {
    console.log(`  (${sinResolver} picks sin resolver: falta el dato del acta)`);
    console.log('');
  }

  /*
   * El veredicto se da SOLO con los picks de cuota publicada.
   *
   * Antes se daba con el total, y el total está dominado por los picks cuyo
   * precio pone la propia app: ahí el "retorno" mide si el modelo se pone
   * precios generosos a sí mismo, no si el sistema gana dinero. Ese es el
   * número que salía en +70% y el que no se puede enseñar a nadie.
   *
   * Un 70% de acierto a cuota 1.20 pierde dinero; un 45% a cuota 2.60 lo gana.
   * El porcentaje de acierto sirve para comparar mercados entre sí; el que dice
   * si el sistema vale algo es el retorno contra un precio de verdad.
   */
  const roi = conCuotaReal.picks ? (conCuotaReal.retorno / conCuotaReal.picks) * 100 : 0;
  if (conCuotaReal.picks < 100) {
    console.log(
      `  Con cuota publicada solo hay ${conCuotaReal.picks} picks: muy pocos para`,
    );
    console.log('  decir nada. Hacen falta unos cientos antes de afirmar un retorno.');
  } else {
    console.log(
      roi > 2
        ? `  Con cuota publicada habría ganado dinero: ${roi.toFixed(1)}% por pick.`
        : roi > -2
          ? `  Con cuota publicada habría quedado en tablas: ${roi.toFixed(1)}% por pick.`
          : `  Con cuota publicada habría perdido dinero: ${roi.toFixed(1)}% por pick.`,
    );
  }
  const roiEstimado = conPrecioEstimado.picks
    ? (conPrecioEstimado.retorno / conPrecioEstimado.picks) * 100
    : 0;
  console.log(
    `  (Con precio estimado sale ${roiEstimado >= 0 ? '+' : ''}${roiEstimado.toFixed(1)}%, pero eso` +
      ' es el modelo midiéndose contra sí mismo: no se puede anunciar.)',
  );
  console.log('');
}

main();
