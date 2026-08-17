import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';
import { competicion } from '@/datos/competiciones';
import { claveDelPartido, partidosDeHoy, slugDe, type PartidoVivo } from '@/datos/envivo';
import { competicionesImportadas } from '@/datos/importado';
import { temporada } from '@/datos/motor';
import { picksDeCompeticion } from '@/datos/picks';
import { compruebaPick, progresoDelPick, resumenDelPartido } from '@/datos/resolver';
import type { Pick, ResultadoPick } from '@/datos/tipos';
import { useAvisos } from './avisos';
import { useTienda } from './tienda';

/**
 * El directo. Mientras la app esta abierta, pregunta a ESPN cada minuto como
 * van los partidos de hoy y avisa al usuario en cuanto uno de sus picks se
 * cumple o se cae.
 *
 * El archivo importado es una foto del momento de la descarga: para el minuto
 * y el marcador de ahora mismo no sirve, hay que preguntarlo.
 */

/**
 * Cada cuánto se pregunta. El barrido completo son 36 competiciones y tarda
 * unos segundos, así que se hace de tanto en tanto; mientras haya algo en
 * juego se repregunta solo por esas competiciones, que es una sola tanda y
 * permite que el minuto avance de verdad.
 */
const CADA_VIVO = 30_000;
const CADA_COMPLETO = 5 * 60_000;
/**
 * Cada cuanto se mira si hay picks nuevos en las ligas seguidas. Es una
 * comprobacion cara —hay que montar las picks de cada liga— y lo que busca
 * cambia de hora en hora, no de minuto en minuto.
 */
const CADA_PICKS = 15 * 60_000;
/** Picks de los que ya se aviso, para no repetirlos al reabrir la app. */
const CLAVE_AVISADOS = 'scout.picks.avisados';

const acabadoAhora = (p?: PartidoVivo) => p?.estado === 'finalizado';

export interface ResueltoVivo {
  resultado: ResultadoPick;
  valorReal?: number;
}

/** Cómo va un pick cuyo partido se está jugando ahora mismo. */
export interface ProgresoVivo {
  /** Lo que lleva el sujeto: remates, faltas, goles… */
  valor: number;
  /** La línea que tenía que batir. */
  linea: number;
  sentido: 'mas' | 'menos';
  minuto?: number;
  golesLocal: number;
  golesVisitante: number;
}

interface Vivo {
  /** Partidos de hoy, por pareja de equipos. */
  porPartido: Map<string, PartidoVivo>;
  /**
   * Los mismos, por identificador de ESPN. Es la clave buena: en una liga los
   * mismos dos equipos se enfrentan dos veces, y con la pareja sola el directo
   * de hoy se pegaba al partido de la vuelta, que sale en la lista con la
   * fecha de dentro de cinco meses.
   */
  porEspn: Map<string, PartidoVivo>;
  /**
   * Picks resueltos con el acta de ESPN, antes de que la proxima importacion
   * los recoja. Por identificador de pick.
   */
  resueltos: Map<string, ResueltoVivo>;
  /**
   * Cómo va cada pick pendiente cuyo partido se juega ahora. Por identificador
   * de pick.
   */
  progreso: Map<string, ProgresoVivo>;
  /** Cuando se consulto por ultima vez. */
  actualizado: Date | null;
  /** Refresca ahora mismo, para el gesto de tirar hacia abajo. */
  refresca: (soloVivos?: boolean) => Promise<void>;
}

const Contexto = createContext<Vivo | null>(null);

/** Las notificaciones se ven aunque la app este delante. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function ProveedorVivo({ children }: { children: ReactNode }) {
  const { guardados, ajustes } = useTienda();
  // Los avisos se quedan dentro de la app, no solo en el sistema.
  const { anota } = useAvisos();
  const [porPartido, setPorPartido] = useState<Map<string, PartidoVivo>>(new Map());
  const [porEspn, setPorEspn] = useState<Map<string, PartidoVivo>>(new Map());
  const [resueltos, setResueltos] = useState<Map<string, ResueltoVivo>>(new Map());
  const [progreso, setProgreso] = useState<Map<string, ProgresoVivo>>(new Map());
  const [actualizado, setActualizado] = useState<Date | null>(null);
  // Espejo del mapa para poder mezclar sin volver a montar el reloj.
  const porPartidoRef = useRef<Map<string, PartidoVivo>>(new Map());
  // Para no avisar dos veces del mismo pick.
  const avisados = useRef<Set<string>>(new Set());
  const permiso = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    Notifications.getPermissionsAsync()
      .then(async ({ granted }) => {
        if (granted) return true;
        const pedido = await Notifications.requestPermissionsAsync();
        return pedido.granted;
      })
      .then((ok) => {
        permiso.current = !!ok;
      })
      .catch(() => {});
  }, []);

  const avisa = useCallback(
    async (titulo: string, cuerpo: string, ruta?: string) => {
      /*
       * Primero se guarda en la campana y después se intenta la notificación
       * del sistema. Ese orden importa: en web las notificaciones no existen y
       * en el móvil pueden estar denegadas, y en los dos casos el aviso tiene
       * que quedar en algún sitio donde el usuario pueda encontrarlo.
       */
      anota({ titulo, cuerpo, ruta });
      if (Platform.OS === 'web' || !permiso.current) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: titulo, body: cuerpo },
        trigger: null,
      });
      } catch {
        // Una notificación que no sale no debe romper nada: ya está guardada.
      }
    },
    [anota],
  );

  /** Competiciones que ahora mismo tienen algo en juego. */
  const enJuego = useRef<string[]>([]);

  const refresca = useCallback(async (soloVivos = false) => {
    const objetivo = soloVivos && enJuego.current.length ? enJuego.current : undefined;
    const nuevos = await partidosDeHoy(objetivo);
    if (!nuevos.size) return;

    /*
     * Un barrido parcial trae solo unas pocas competiciones: se mezcla con lo
     * que ya se sabía en vez de reemplazarlo, o al refrescar los dos partidos
     * en juego desaparecerían los otros ochenta de hoy.
     */
    const mapa = objetivo ? new Map(porPartidoRef.current) : new Map();
    for (const [k, v] of nuevos) mapa.set(k, v);

    enJuego.current = [
      ...new Set(
        [...mapa.values()]
          .filter((p) => p.estado === 'en_curso' || p.estado === 'descanso')
          .map((p) => p.competicionId),
      ),
    ];

    porPartidoRef.current = mapa;
    setPorPartido(mapa);
    setPorEspn(new Map([...mapa.values()].filter((p) => p.idEspn).map((p) => [p.idEspn!, p])));
    setActualizado(new Date());

    /*
     * Solo interesan los picks que la app todavia da por pendientes: si el
     * archivo importado ya trae el resultado, el usuario lo ve al abrir y no
     * hace falta despertarle el movil por algo que ya sabe.
     */
    for (const g of guardados) {
      /*
       * Solo se salta lo que el archivo importado ya da por resuelto. El
       * control de avisos va mas abajo: mezclarlo aqui hacia que un pick que
       * paso una vez por este bucle no se volviera a evaluar nunca, y un
       * partido que terminaba despues de la ultima descarga se quedaba
       * pendiente para siempre.
       */
      if (g.resultado !== 'pendiente') continue;

      const t = temporada(g.competicionId);
      const partido = t.porPartido.get(g.partidoId);
      if (!partido?.idEspn) continue;
      const local = t.porEquipo.get(partido.localId);
      const visitante = t.porEquipo.get(partido.visitanteId);
      if (!local || !visitante) continue;

      /*
       * Se mira tanto lo acabado como lo que se esta jugando. Un "mas de 1.5
       * remates" se gana en el minuto 30 y no puede desandarse: hacer esperar
       * al usuario al pitido final para contarselo no tiene sentido. El
       * resolver ya sabe que en juego solo puede cerrar los "mas de".
       */
      // Por el identificador de ESPN: la pareja de equipos se repite en la vuelta.
      const enDirecto =
        [...mapa.values()].find((x) => x.idEspn === partido.idEspn) ??
        mapa.get(claveDelPartido(local.nombre, visitante.nombre));
      const seguible =
        enDirecto?.estado === 'finalizado' ||
        enDirecto?.estado === 'en_curso' ||
        enDirecto?.estado === 'descanso';
      if (!seguible) continue;

      const slug = slugDe(g.competicionId);
      if (!slug) continue;
      const resumen = await resumenDelPartido(slug, partido.idEspn);
      if (!resumen) continue;

      // Aunque no se pueda cerrar, se guarda cómo va: el historial lo enseña.
      const marcha = progresoDelPick(g, resumen);
      if (marcha && !acabadoAhora(enDirecto)) {
        setProgreso((prev) =>
          new Map(prev).set(g.pickId, {
            ...marcha,
            minuto: enDirecto.minuto,
            golesLocal: enDirecto.golesLocal,
            golesVisitante: enDirecto.golesVisitante,
          }),
        );
      }

      const { resultado, valorReal } = compruebaPick(g, resumen);
      if (resultado === 'pendiente') continue;

      // El resultado se guarda siempre, se haya avisado o no.
      setResueltos((prev) => new Map(prev).set(g.pickId, { resultado, valorReal }));

      // A partir de aqui, solo el aviso. Una vez por pick.
      if (avisados.current.has(g.pickId)) continue;
      avisados.current.add(g.pickId);
      if (!ajustes.notificarResultados) continue;

      const acabado = enDirecto.estado === 'finalizado';
      const marcador = `${enDirecto.local} ${enDirecto.golesLocal}-${enDirecto.golesVisitante} ${enDirecto.visitante}`;
      // Un pick que se cierra con el partido en marcha se anuncia como tal:
      // "ya está" no es lo mismo que "terminó así".
      const cabecera =
        resultado === 'ganado'
          ? acabado
            ? '✅ Pick acertado'
            : `✅ ¡Pick cumplido! · ${enDirecto.reloj ?? enDirecto.minuto ?? 0}'`
          : resultado === 'perdido'
            ? '❌ Pick fallado'
            : '➖ Pick anulado';
      const cierre =
        valorReal === undefined
          ? marcador
          : `${marcador} · ${acabado ? 'terminó en' : 'ya va por'} ${valorReal}`;
      await avisa(
        cabecera,
        `${g.titulo} · ${g.mercado} — ${cierre}`,
        `/pick/${encodeURIComponent(g.pickId)}?comp=${g.competicionId}`,
      );
    }
  }, [guardados, ajustes.notificarResultados, avisa]);

  /*
   * Aviso de picks nuevos en las ligas que el usuario sigue.
   *
   * Los picks son deterministas: para un partido dado siempre salen los
   * mismos. Lo que cambia es cuándo aparecen, porque un partido entra en la
   * lista al acercarse su fecha. Por eso se guarda en disco lo ya avisado: si
   * no, cada vez que se abriera la app volvería a sonar todo lo de ayer.
   */
  const ligasSeguidas = ajustes.ligasSeguidas.join(',');

  useEffect(() => {
    /*
     * También en web. Antes se salía aquí porque el navegador no tiene
     * notificaciones del sistema, pero ahora los avisos se guardan en la
     * campana de la app, y ahí sí se ven desde cualquier sitio.
     */
    if (!ajustes.notificarPicks) return;
    let montado = true;

    const revisa = async () => {
      const yaAvisados: string[] = JSON.parse(
        (await AsyncStorage.getItem(CLAVE_AVISADOS)) ?? '[]',
      );
      const vistos = new Set(yaAvisados);
      const nuevos: string[] = [];

      /*
       * Se miran **todas** las competiciones descargadas, no solo las que el
       * usuario sigue: el mejor pick del día puede estar en una liga que no
       * tenía marcada, y era justo el que no se le contaba.
       *
       * Pero se avisa de los mejores en conjunto, no de uno por liga. Con 36
       * competiciones eso serían 36 avisos seguidos, que no es avisar: es
       * enterrar. Se juntan todos, se ordenan por ventaja y salen los tres
       * primeros que aún no se hayan contado.
       */
      const candidatos: { pick: Pick; liga: string }[] = [];
      for (const liga of competicionesImportadas()) {
        const mejor = picksDeCompeticion(liga, ajustes.casaId, 1)[0];
        if (!mejor || vistos.has(mejor.id)) continue;
        candidatos.push({ pick: mejor, liga });
      }

      candidatos.sort((a, b) => b.pick.ventaja - a.pick.ventaja);

      for (const { pick, liga } of candidatos.slice(0, 3)) {
        nuevos.push(pick.id);
        if (!montado) return;
        await avisa(
          `Nuevo pick en ${competicion(liga).corto}`,
          `${pick.titulo} · ${pick.mercado} @ ${pick.cuota.toFixed(2)} · ${pick.aciertosL10}/10`,
          // Al tocar el aviso se abre el pick del que habla.
          `/pick/${encodeURIComponent(pick.id)}?comp=${liga}`,
        );
      }

      /*
       * Los que no han entrado por el corte se apuntan como vistos igualmente.
       * Si no, en cada vuelta volverían a competir con los de mañana y un pick
       * mediano de hoy acabaría avisando dentro de una semana.
       */
      for (const { pick } of candidatos.slice(3)) nuevos.push(pick.id);

      if (nuevos.length) {
        // Se recorta para que la lista no crezca sin fin en el teléfono.
        const guardar = [...yaAvisados, ...nuevos].slice(-400);
        await AsyncStorage.setItem(CLAVE_AVISADOS, JSON.stringify(guardar));
      }
    };

    revisa().catch(() => {});
    const reloj = setInterval(() => revisa().catch(() => {}), CADA_PICKS);
    return () => {
      montado = false;
      clearInterval(reloj);
    };
  }, [ligasSeguidas, ajustes.notificarPicks, ajustes.casaId, ajustes.ligasSeguidas, avisa]);

  /*
   * El reloj se monta una sola vez y llama siempre a la última versión de
   * `refresca` a través de esta referencia. Si el efecto dependiera de
   * `refresca`, cada vez que cambia un pick guardado se desmontaría y volvería
   * a montar: los `setInterval` se borrarían antes de llegar a cumplirse y el
   * marcador no avanzaría nunca, además de lanzar un barrido completo de las
   * 36 competiciones en cada remonte.
   */
  const refrescaRef = useRef(refresca);
  refrescaRef.current = refresca;

  useEffect(() => {
    let montado = true;
    // Sin solaparse: si una tanda tarda más que el intervalo, se salta el tic.
    let ocupado = false;

    const tic = async (soloVivos: boolean) => {
      if (!montado || ocupado) return;
      ocupado = true;
      try {
        await refrescaRef.current(soloVivos);
      } finally {
        ocupado = false;
      }
    };

    tic(false);
    const rapido = setInterval(() => tic(true), CADA_VIVO);
    const completo = setInterval(() => tic(false), CADA_COMPLETO);

    // Al volver a la app se refresca ya, sin esperar al siguiente tic.
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') tic(false);
    });

    return () => {
      montado = false;
      clearInterval(rapido);
      clearInterval(completo);
      sub.remove();
    };
  }, []);

  const valor = useMemo<Vivo>(
    () => ({ porPartido, porEspn, resueltos, progreso, actualizado, refresca }),
    [porPartido, porEspn, resueltos, progreso, actualizado, refresca],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useVivo(): Vivo {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useVivo fuera del ProveedorVivo');
  return ctx;
}

/**
 * Quita de una lista los picks cuyo partido ya ha terminado.
 *
 * Un pick de un partido acabado no se puede apostar, así que no pinta nada en
 * pantalla. El archivo importado tarda hasta una hora en enterarse de que el
 * partido cerró; ESPN lo sabe al momento, y esto lo aplica sobre la marcha sin
 * tener que recalcular las picks.
 */
export function usePicksVigentes<
  T extends {
    id: string;
    partidoId: string;
    competicionId: string;
    /*
     * Los tres de abajo son opcionales porque esta función también recibe picks
     * guardados, que no los llevan. Cuando vienen, permiten descartar con el
     * marcador en vivo los que ya no tienen nada que ofrecer.
     */
    metrica?: string;
    linea?: number;
    // `string` y no `'mas' | 'menos'`: los picks de sí/no usan otros valores y
    // aquí solo interesan los de "más de", que se comparan más abajo.
    sentido?: string;
    sujeto?: string;
    sujetoId?: string;
  },
>(picks: T[]): T[] {
  const { porPartido, porEspn, resueltos } = useVivo();

  return useMemo(() => {
    if (!porPartido.size && !resueltos.size) return picks;
    return picks.filter((p) => {
      /*
       * Un pick que ya se ha cumplido sale de la lista.
       *
       * "Más de 1,5 goles" con el partido 3-0 en el minuto 60 ya está ganado y
       * no puede desandarse: seguir ofreciéndolo es enseñar una oportunidad que
       * no existe, porque a esas alturas ninguna casa lo paga. Al quitarlo
       * entra el siguiente de la lista, que sí sigue vivo.
       *
       * Solo se van los resueltos de verdad; los que van ganando pero aún
       * pueden torcerse siguen donde estaban.
       */
      const desenlace = resueltos.get(p.id);
      if (desenlace && desenlace.resultado !== 'pendiente') return false;
      const t = temporada(p.competicionId);
      const partido = t.porPartido.get(p.partidoId);
      if (!partido) return true;
      const local = t.porEquipo.get(partido.localId);
      const visitante = t.porEquipo.get(partido.visitanteId);
      if (!local || !visitante) return true;
      const vivo = partido.idEspn
        ? porEspn.get(partido.idEspn)
        : porPartido.get(claveDelPartido(local.nombre, visitante.nombre));
      // Si ESPN no lo tiene hoy, no hay nada que objetar: se queda.
      if (!vivo) return true;
      if (vivo.estado === 'finalizado') return false;

      /*
       * Cumplidos que se ven en el marcador, sin pedir el acta.
       *
       * `resueltos` solo se calcula para los picks que el usuario tiene
       * guardados —el barrido recorre sus guardados—, así que en la portada un
       * "más de 1,5 goles" con el partido 3-0 seguía ofreciéndose a quien no lo
       * hubiera guardado. Con el marcador, que ya se tiene de todos los
       * partidos de hoy, se descartan los de goles sin una sola petición más.
       *
       * Solo los "más de": un "menos de" puede romperse hasta el pitido final y
       * ahí sí queda algo que ofrecer. Y solo goles, que es lo único que el
       * marcador demuestra; remates o córners necesitan el acta.
       */
      if (p.sentido !== 'mas' || p.linea === undefined || vivo.estado === 'descanso') return true;

      const golesTotales = vivo.golesLocal + vivo.golesVisitante;
      if (p.metrica === 'golesTotales') return !(golesTotales > p.linea);

      if (p.metrica === 'goles' && p.sujeto === 'equipo') {
        // De cuál de los dos habla: sin saberlo no se descarta nada.
        const suyos =
          p.sujetoId === partido.localId
            ? vivo.golesLocal
            : p.sujetoId === partido.visitanteId
              ? vivo.golesVisitante
              : null;
        if (suyos !== null) return !(suyos > p.linea);
      }

      return true;
    });
  }, [picks, porPartido, porEspn, resueltos]);
}

/**
 * Estado en vivo del partido al que pertenece un pick.
 *
 * El pick guarda el identificador del partido, no los nombres de los equipos,
 * asi que hay que pasar por la temporada para resolverlos. Devuelve
 * `undefined` cuando ESPN no tiene ese partido hoy, que es lo normal en un
 * pick de dentro de tres dias.
 */
export function usePartidoDelPick(pick: {
  partidoId: string;
  competicionId: string;
}): PartidoVivo | undefined {
  const { porPartido, porEspn } = useVivo();

  return useMemo(() => {
    if (!porPartido.size) return undefined;
    const t = temporada(pick.competicionId);
    const partido = t.porPartido.get(pick.partidoId);
    if (!partido) return undefined;
    if (partido.idEspn) return porEspn.get(partido.idEspn);
    const local = t.porEquipo.get(partido.localId);
    const visitante = t.porEquipo.get(partido.visitanteId);
    if (!local || !visitante) return undefined;
    return porPartido.get(claveDelPartido(local.nombre, visitante.nombre));
  }, [porPartido, porEspn, pick.competicionId, pick.partidoId]);
}

/**
 * Estado en vivo de un partido importado.
 *
 * Se busca por el identificador de ESPN, que es único, y solo se cae en la
 * pareja de equipos cuando el partido no lo tiene. Buscar por pareja a secas
 * era un error: en una liga los mismos dos equipos juegan ida y vuelta, y el
 * directo de hoy acababa pegado al partido de dentro de cinco meses, que
 * aparecía en la lista como si se estuviera jugando en septiembre.
 */
export function usePartidoVivoDe(partido?: {
  idEspn?: string;
  localId: string;
  visitanteId: string;
  competicionId: string;
}): PartidoVivo | undefined {
  const { porPartido, porEspn } = useVivo();

  return useMemo(() => {
    if (!partido) return undefined;
    if (partido.idEspn) return porEspn.get(partido.idEspn);
    const t = temporada(partido.competicionId);
    const local = t.porEquipo.get(partido.localId);
    const visitante = t.porEquipo.get(partido.visitanteId);
    if (!local || !visitante) return undefined;
    return porPartido.get(claveDelPartido(local.nombre, visitante.nombre));
  }, [partido, porPartido, porEspn]);
}

/** Estado en vivo de un partido concreto, si ESPN lo tiene hoy. */
export function usePartidoVivo(local?: string, visitante?: string): PartidoVivo | undefined {
  const { porPartido } = useVivo();
  if (!local || !visitante) return undefined;
  return porPartido.get(claveDelPartido(local, visitante));
}
