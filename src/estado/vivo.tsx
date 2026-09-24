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
import { claveDelPartido, partidosDeHoy, slugDe, type PartidoVivo , seJuegaAhora } from '@/datos/envivo';
import { competicionesImportadas } from '@/datos/importado';
import { temporada } from '@/datos/motor';
import { picksDeCompeticion } from '@/datos/picks';
import { compruebaPick, progresoDelPick, resumenDelPartido, type Resumen } from '@/datos/resolver';
import type { Pick, ResultadoPick, SujetoPick } from '@/datos/tipos';
import { useAvisos } from './avisos';
import { useDerechos } from './derechos';
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
/**
 * Cada cuánto se repide el acta de un partido en juego para el contador de un
 * pick. El acta trae remates, córners y tarjetas, que es lo que no se ve en el
 * marcador; cambia despacio, así que con un minuto sobra.
 */
const CADA_PROGRESO = 60_000;
/** Cuánto vale un acta antes de volver a pedirla. */
const VIDA_RESUMEN = 45_000;

/**
 * Actas pedidas hace poco, por partido.
 *
 * En la portada puede haber quince tarjetas del mismo partido en juego —quince
 * picks de un Barcelona–Emelec—, y cada una necesita el mismo acta para contar
 * lo suyo. Sin esto serían quince peticiones idénticas por minuto. Se guarda la
 * promesa, no el resultado, para que las tarjetas que preguntan a la vez
 * esperen todas a la misma petición.
 */
const ACTAS = new Map<string, { en: number; dato: Promise<Resumen | null> }>();

function actaCacheada(slug: string, idEspn: string): Promise<Resumen | null> {
  const clave = `${slug}:${idEspn}`;
  const guardada = ACTAS.get(clave);
  if (guardada && Date.now() - guardada.en < VIDA_RESUMEN) return guardada.dato;
  const dato = resumenDelPartido(slug, idEspn).catch(() => null);
  ACTAS.set(clave, { en: Date.now(), dato });
  return dato;
}

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
  /** Sobre qué va la línea: remates, corners, goles… */
  metrica?: string;
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
  // Qué tiene desbloqueado: decide de qué ligas se puede avisar. Sin esto, el
  // aviso de "nuevo pick" enseñaba el pick de una liga premium a quien no la
  // había pagado, que es regalar por la campana lo que el muro cobra.
  const { tieneAcceso } = useDerechos();
  const [porPartido, setPorPartido] = useState<Map<string, PartidoVivo>>(new Map());
  const [porEspn, setPorEspn] = useState<Map<string, PartidoVivo>>(new Map());
  const [resueltos, setResueltos] = useState<Map<string, ResueltoVivo>>(new Map());
  const [progreso, setProgreso] = useState<Map<string, ProgresoVivo>>(new Map());
  const [actualizado, setActualizado] = useState<Date | null>(null);
  // Espejo del mapa para poder mezclar sin volver a montar el reloj.
  const porPartidoRef = useRef<Map<string, PartidoVivo>>(new Map());
  // Para no avisar dos veces del mismo pick.
  const avisados = useRef<Set<string>>(new Set());
  // Picks "nulo" de partidos ya terminados que ya se comprobaron contra el acta
  // de ESPN: no hace falta volver a pedirla si el jugador sigue sin aparecer.
  const nulosComprobados = useRef<Set<string>>(new Set());
  // Picks pendientes de partidos que terminaron hace días —ya no están en el
  // directo de hoy—: se resuelven contra ESPN una sola vez.
  const pasadosComprobados = useRef<Set<string>>(new Set());
  const permiso = useRef(false);
  // La última versión de `tieneAcceso`, para leerla dentro del barrido sin
  // rehacer el reloj cada vez que cambian los derechos.
  const tieneAccesoRef = useRef(tieneAcceso);
  tieneAccesoRef.current = tieneAcceso;

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
          .filter((p) => seJuegaAhora(p.estado))
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
      /*
       * Se reintentan también los "nulo".
       *
       * El archivo marca "nulo" (el "—") a un jugador que no encuentra en el
       * acta que guardó, pero esa acta viene RECORTADA: `adelgaza()` borra a
       * quien tiene menos de seis partidos, así que da por "no jugó" a gente
       * que sí jugó. ESPN tiene el acta entera, así que a los nulo se les
       * vuelve a preguntar. Los que el archivo ya cerró como ganado o perdido
       * sí se saltan: esos son de fiar.
       */
      if (g.resultado !== 'pendiente' && g.resultado !== 'nulo') continue;

      const t = temporada(g.competicionId);
      const partido = t.porPartido.get(g.partidoId);
      /*
       * El idEspn: del partido si está en los datos; si no, del propio
       * identificador guardado, que es `comp-e<idEspn>`. Así se resuelve también
       * un pick cuyo partido ya se cayó del archivo por viejo —que era justo por
       * qué se quedaban "pendientes" para siempre: el barrido no lo encontraba y
       * lo saltaba—.
       */
      const idEspn = partido?.idEspn ?? g.partidoId.match(/-e(\d+)$/)?.[1];
      if (!idEspn) continue;
      const local = partido ? t.porEquipo.get(partido.localId) : undefined;
      const visitante = partido ? t.porEquipo.get(partido.visitanteId) : undefined;

      /*
       * Se mira tanto lo acabado como lo que se esta jugando. Un "mas de 1.5
       * remates" se gana en el minuto 30 y no puede desandarse: hacer esperar
       * al usuario al pitido final para contarselo no tiene sentido. El
       * resolver ya sabe que en juego solo puede cerrar los "mas de".
       */
      // Por el identificador de ESPN: la pareja de equipos se repite en la vuelta.
      const enDirecto =
        [...mapa.values()].find((x) => x.idEspn === idEspn) ??
        (local && visitante ? mapa.get(claveDelPartido(local.nombre, visitante.nombre)) : undefined);
      /*
       * Un partido que terminó hace días ya no está en el directo de hoy —o ni
       * siquiera está ya en los datos—, así que `enDirecto` viene vacío. Si su
       * hora pasó de sobra, o el partido ya no está (solo se cae cuando
       * envejeció), se da por terminado y se resuelve igual contra ESPN: sin
       * esto, un pick de un partido de hace días se quedaba "pendiente" para
       * siempre.
       */
      const finalizadoPasado =
        !enDirecto &&
        (!partido || new Date(partido.fecha).getTime() < Date.now() - 3 * 3600_000);
      const seguible =
        enDirecto?.estado === 'finalizado' ||
        enDirecto?.estado === 'en_curso' ||
        enDirecto?.estado === 'descanso' ||
        finalizadoPasado;
      if (!seguible) continue;

      // Un "nulo" de un partido ya terminado se comprueba UNA vez contra el
      // acta de ESPN; si el jugador sigue sin aparecer, es que de verdad no
      // jugó y no se vuelve a pedir. Mientras se juega sí se reintenta, por si
      // entra más tarde.
      if (g.resultado === 'nulo' && enDirecto?.estado === 'finalizado') {
        if (nulosComprobados.current.has(g.pickId)) continue;
        nulosComprobados.current.add(g.pickId);
      }
      // Un pendiente de un partido ya pasado: una sola comprobación contra ESPN.
      if (finalizadoPasado) {
        if (pasadosComprobados.current.has(g.pickId)) continue;
        pasadosComprobados.current.add(g.pickId);
      }

      const slug = slugDe(g.competicionId);
      if (!slug) continue;
      const resumen = await resumenDelPartido(slug, idEspn);
      if (!resumen) continue;

      // Aunque no se pueda cerrar, se guarda cómo va: el historial lo enseña.
      // Solo con directo: un partido pasado no tiene minuto que enseñar.
      const marcha = progresoDelPick(g, resumen);
      if (marcha && enDirecto && !acabadoAhora(enDirecto)) {
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

      // Un partido pasado (no está en el directo de hoy) se resuelve en
      // silencio: se guarda el resultado, pero no se avisa de algo que terminó
      // hace días. Y el aviso de abajo usa datos del directo que aquí no hay.
      if (!enDirecto) continue;

      // Si ya venía "nulo" del archivo y ESPN lo confirma, no hay novedad: se
      // cachea, pero no se avisa —el usuario no esperaba nada de un pick que ya
      // estaba anulado, y un aviso "anulado" en bloque al abrir sobra.
      if (g.resultado === 'nulo' && resultado === 'nulo') continue;

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
        // Con el partido delante. La pantalla del pick lo necesita para
        // rehacer la lista donde vive; sin él intenta deducirlo del propio
        // identificador, y eso solo funciona con los datos generados.
        `/pick/${encodeURIComponent(g.pickId)}?comp=${g.competicionId}&partido=${encodeURIComponent(g.partidoId)}`,
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
        /*
         * Solo se avisa de ligas a las que el usuario tiene acceso: las cuatro
         * gratuitas y las que haya comprado. De una liga premium sin pagar no
         * se avisa, porque el cuerpo del aviso lleva el pick entero (título,
         * mercado y cuota) y eso es enseñar por la campana justo lo que el muro
         * de pago tapa en la pantalla.
         */
        if (!tieneAccesoRef.current(liga)) continue;
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
          // Al tocar el aviso se abre el pick del que habla. Con el partido:
          // sin él la pantalla no sabe dónde buscarlo y enseña "este pick ya no
          // está disponible" justo después de anunciarlo.
          `/pick/${encodeURIComponent(pick.id)}?comp=${liga}&partido=${encodeURIComponent(pick.partidoId)}`,
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

    /*
     * Cuándo se hizo el último barrido completo.
     *
     * El barrido completo pide el marcador de las 36 competiciones: 31
     * peticiones a ESPN de una tacada. Se dispara al recuperar el foco, y en
     * el navegador eso ocurre en cada cambio de pantalla: ir a Partidos y
     * volver a Inicio eran 62 peticiones para traer exactamente los mismos
     * datos que ya estaban en memoria.
     *
     * Con esto, el barrido completo no se repite antes de un minuto pase lo
     * que pase. Los partidos en juego siguen refrescándose cada 30 segundos
     * por su cuenta, que es lo único que cambia de verdad minuto a minuto.
     */
    let ultimoCompleto = 0;

    const tic = async (soloVivos: boolean) => {
      if (!montado || ocupado) return;
      if (!soloVivos) {
        if (Date.now() - ultimoCompleto < 60_000) return;
        ultimoCompleto = Date.now();
      }
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
  /*
   * En la ficha de un partido concreto se quiere ver lo que hay AHORA, aunque
   * ya haya empezado: el usuario lo abrió para seguirlo en vivo, y quitarle
   * todos los picks a los 25 minutos —dejando un "ya se han cumplido" con el
   * marcador a cero— no tiene sentido. En la portada, en cambio, la tira mira
   * al futuro y un partido ya empezado no pinta nada, así que ahí se descarta.
   */
>(picks: T[], mostrarEnVivo = false): T[] {
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

      /*
       * Por la hora, sin esperar a ESPN.
       *
       * El estado en vivo tarda unos segundos en llegar, y hasta entonces
       * `vivo` es indefinido para todo: la portada abria enseñando picks de
       * partidos que ya se habian jugado, y solo cuando contestaba ESPN
       * desaparecian de golpe. Como un pick de un partido que ya empezo no
       * sirve para apostar —ninguna casa lo paga—, la hora basta para
       * descartarlo desde el primer pintado.
       *
       * Cinco minutos de margen: los horarios de las fuentes bailan un poco y
       * no conviene tirar un pick de un partido que aun no ha arrancado.
       */
      // En la ficha del partido no se descarta por haber empezado: se sigue en
      // vivo. En la portada sí, que ahí solo cuenta lo que aún no arrancó.
      const empieza = new Date(partido.fecha).getTime();
      if (!mostrarEnVivo && Number.isFinite(empieza) && Date.now() > empieza + 5 * 60_000) {
        return false;
      }

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
  }, [picks, porPartido, porEspn, resueltos, mostrarEnVivo]);
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
    // Sin partido no hay nada que buscar, y `temporada('')` no existe: esta
    // función también se llama desde pantallas que aún no tienen el pick.
    if (!pick.competicionId || !pick.partidoId) return undefined;
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

/**
 * El contador en vivo de un pick: lo que lleva el sujeto ahora mismo contra la
 * línea que tenía que batir.
 *
 * El marcador en vivo ya sale en la tarjeta, pero un pick casi nunca va de
 * goles: va de los remates de un jugador o de los córners de un equipo, y de
 * eso el marcador no dice nada. Con el partido en juego el usuario tiene
 * delante la pregunta "¿cómo va MI pick?" y hasta ahora la app no la
 * contestaba: había que esperar al pitido final.
 *
 * Solo pide datos mientras el partido se juega de verdad, y el acta se comparte
 * entre todas las tarjetas del mismo partido (ver `actaCacheada`). Un pick de
 * 1X2 no tiene contador —lo suyo es el marcador— y devuelve `undefined`.
 */
export function useProgresoEnVivo(
  /**
   * Puede venir vacío: la ficha del pick lo calcula después de montar los
   * hooks, y un hook no se puede llamar a medias.
   */
  pick:
    | {
        id: string;
        partidoId: string;
        competicionId: string;
        titulo: string;
        sujeto?: SujetoPick;
      }
    | undefined,
  /**
   * Con `false` no se pide nada. Sirve para los picks con candado: el contador
   * dice de qué va la línea —"lleva 3, necesita 2 remates"— y eso es
   * exactamente lo que el muro de pago tapa, aparte de que sería una petición
   * a ESPN por cada tarjeta bloqueada.
   */
  activo = true,
): (ProgresoVivo & { cumplido: boolean; roto: boolean }) | undefined {
  const { progreso } = useVivo();
  const enVivo = usePartidoDelPick({
    partidoId: pick?.partidoId ?? '',
    competicionId: pick?.competicionId ?? '',
  });
  const jugando = activo && !!pick && seJuegaAhora(enVivo?.estado);
  const idEspn = enVivo?.idEspn;
  const slug = pick ? slugDe(pick.competicionId) : undefined;
  const [marcha, setMarcha] = useState<{
    valor: number;
    linea: number;
    sentido: 'mas' | 'menos';
    metrica: string;
  }>();

  const id = pick?.id ?? '';
  const partidoId = pick?.partidoId ?? '';
  const titulo = pick?.titulo ?? '';
  const sujeto = pick?.sujeto;

  useEffect(() => {
    if (!jugando || !idEspn || !slug) {
      setMarcha(undefined);
      return;
    }
    let montado = true;
    const mira = async () => {
      const resumen = await actaCacheada(slug, idEspn);
      if (!montado || !resumen) return;
      setMarcha(
        progresoDelPick({ pickId: id, partidoId, titulo, sujeto }, resumen) ?? undefined,
      );
    };
    void mira();
    const reloj = setInterval(() => void mira(), CADA_PROGRESO);
    return () => {
      montado = false;
      clearInterval(reloj);
    };
  }, [jugando, idEspn, slug, id, partidoId, titulo, sujeto]);

  /*
   * Si el barrido de los guardados ya lo calculó, se usa el suyo: es el mismo
   * dato y así el pick guardado y el de la lista dicen exactamente lo mismo.
   */
  const delBarrido = pick ? progreso.get(pick.id) : undefined;

  return useMemo(() => {
    if (!jugando || !enVivo) return undefined;
    const base =
      delBarrido ??
      (marcha
        ? {
            ...marcha,
            minuto: enVivo.minuto,
            golesLocal: enVivo.golesLocal,
            golesVisitante: enVivo.golesVisitante,
          }
        : undefined);
    if (!base) return undefined;
    /*
     * Qué se puede afirmar con el partido en marcha.
     *
     * Un "más de" que ya cruzó la línea está ganado y no se puede desandar:
     * eso sí se canta. Un "menos de" no se puede dar por ganado hasta el
     * pitido final, pero sí por perdido en cuanto se pasa de la línea. Lo que
     * no se sabe se queda sin color.
     */
    const pasada = base.valor > base.linea;
    return {
      ...base,
      cumplido: base.sentido === 'mas' && pasada,
      roto: base.sentido === 'menos' && pasada,
    };
  }, [jugando, enVivo, delBarrido, marcha]);
}

/** Estado en vivo de un partido concreto, si ESPN lo tiene hoy. */
export function usePartidoVivo(local?: string, visitante?: string): PartidoVivo | undefined {
  const { porPartido } = useVivo();
  if (!local || !visitante) return undefined;
  return porPartido.get(claveDelPartido(local, visitante));
}
