import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CASA_POR_DEFECTO } from '@/datos/casas';
import { competicionesVisibles } from '@/datos/competiciones';
import { competicionVisible } from '@/datos/importado';
import { temporada } from '@/datos/motor';
import { METRICAS_EQUIPO, METRICAS_JUGADOR } from '@/datos/picks';
import type { Pick, PickGuardado, ResultadoPick } from '@/datos/tipos';

/**
 * Estado que sobrevive al cierre de la app: picks guardados, casa de apuestas
 * favorita, ligas seguidas y la suscripcion. Se guarda entero en una clave de
 * AsyncStorage porque es poca cosa y asi una escritura deja todo consistente.
 */

const CLAVE = 'scout-picks/estado-v1';

/**
 * Lo que como mucho tarda un partido de principio a fin, con descanso, añadido
 * y algo de margen. Sirve para no dar por terminado lo que aún se está jugando.
 */
const DURA_UN_PARTIDO = 2.5 * 60 * 60 * 1000;

export type Plan = 'ninguno' | 'semanal' | 'mensual' | 'anual' | 'dosligas' | 'tresligas' | 'mundial';

export interface Ajustes {
  casaId: string;
  competicionId: string;
  ligasSeguidas: string[];
  notificarPicks: boolean;
  notificarPartidos: boolean;
  notificarResultados: boolean;
  cuotasDecimales: boolean;
  nombre: string;
}

interface Estado {
  ajustes: Ajustes;
  guardados: PickGuardado[];
  plan: Plan;
  onboarding: boolean;
}

const INICIAL: Estado = {
  ajustes: {
    casaId: CASA_POR_DEFECTO,
    competicionId: 'mundial',
    ligasSeguidas: ['mundial', 'champions', 'premier', 'laliga', 'ligamx'],
    notificarPicks: true,
    notificarPartidos: true,
    notificarResultados: true,
    cuotasDecimales: true,
    nombre: 'Golden',
  },
  guardados: [],
  plan: 'ninguno',
  onboarding: false,
};

interface Tienda extends Estado {
  cargado: boolean;
  pro: boolean;
  guardar: (pick: Pick) => void;
  quitar: (pickId: string) => void;
  /** Mezcla la lista de guardados; la usa la sincronización con la cuenta. */
  restaura: (mezcla: (locales: PickGuardado[]) => PickGuardado[]) => void
  estaGuardado: (pickId: string) => boolean;
  cambiaAjuste: <K extends keyof Ajustes>(clave: K, valor: Ajustes[K]) => void;
  alternaLiga: (competicionId: string) => void;
  activaPlan: (plan: Plan) => void;
  terminaOnboarding: () => void;
  reinicia: () => void;
  rendimiento: Rendimiento;
}

export interface Rendimiento {
  total: number;
  ganados: number;
  perdidos: number;
  pendientes: number;
  acierto: number;
  /** Retorno sobre lo apostado, en porcentaje, a 1 unidad por pick. */
  roi: number;
  beneficio: number;
}

const Contexto = createContext<Tienda | null>(null);

/**
 * Comprueba si un pick guardado ya se resolvio. Lee el resultado real del
 * partido en el motor, asi que no hace falta guardar nada extra.
 */
function resuelve(guardado: PickGuardado): { resultado: ResultadoPick; valorReal?: number } {
  const t = temporada(guardado.competicionId);
  const partido = t.porPartido.get(guardado.partidoId);
  if (!partido || partido.estado !== 'finalizado') return { resultado: 'pendiente' };

  /*
   * El archivo trae los partidos ya "jugados", con su marcador puesto, así que
   * da por `finalizado` alguno que a esta hora se está jugando de verdad. Con
   * eso un "menos de 3.5 goles" se cerraba en verde en el minuto 45 —el
   * marcador del archivo decía 0— y el acierto salía al 100% con el partido en
   * curso. Un pick cerrado antes de tiempo no es un pick: es una promesa que
   * todavía se puede romper.
   *
   * Aquí no se puede preguntar por el directo, porque `ProveedorVivo` cuelga
   * por debajo de este proveedor. Pero sí por el reloj, y basta: un partido que
   * empezó hace menos de dos horas y media no ha terminado, diga lo que diga el
   * archivo. Los que sí acabaron se resuelven igual que siempre.
   */
  if (Date.now() - new Date(partido.fecha).getTime() < DURA_UN_PARTIDO) {
    return { resultado: 'pendiente' };
  }

  const [, resto] = guardado.pickId.split(`${guardado.partidoId}-`);
  if (!resto) return { resultado: 'pendiente' };
  const trozos = resto.split('-');
  const sentido = trozos[trozos.length - 1] as 'mas' | 'menos';
  const linea = Number(trozos[trozos.length - 2]);
  const metrica = trozos[trozos.length - 3];
  const sujetoId = trozos.slice(0, -3).join('-');

  // 1X2 se resuelve mirando el marcador.
  if (guardado.pickId.includes('-1x2-')) {
    const local = t.porEquipo.get(partido.localId);
    const gana =
      guardado.mercado === 'Empate'
        ? partido.golesLocal === partido.golesVisitante
        : guardado.mercado.includes(local?.corto ?? '@@')
          ? partido.golesLocal > partido.golesVisitante
          : partido.golesVisitante > partido.golesLocal;
    return { resultado: gana ? 'ganado' : 'perdido' };
  }

  let valor: number | undefined;

  const metJugador = METRICAS_JUGADOR.find((m) => m.clave === metrica);
  if (metJugador) {
    const reg = (t.registrosPorPartido.get(guardado.partidoId) ?? []).find(
      (r) => r.jugadorId === sujetoId,
    );
    // Si no jugo, el pick se anula: es lo que hacen las casas con las props.
    if (!reg) return { resultado: 'nulo' };
    valor = metJugador.extractor(reg);
  }

  const metEquipo = METRICAS_EQUIPO.find((m) => m.clave === metrica);
  if (valor === undefined && metEquipo) {
    /*
     * De cuál de los dos equipos habla el pick. Antes se comprobaba solo que
     * el equipo existiera en la competición y luego `localId === sujetoId`
     * decidía: un equipo que no jugaba este partido pasaba por visitante y el
     * pick se cerraba con los datos del rival. Se veía en el historial como
     * "Blooming · menos de 1.5 goles" resuelto con el marcador de un partido
     * en el que Blooming no jugaba.
     */
    const esLocal = partido.localId === sujetoId;
    const esVisitante = partido.visitanteId === sujetoId;
    if (esLocal || esVisitante) valor = metEquipo.valor(partido, esLocal);
    else if (t.porEquipo.has(sujetoId)) return { resultado: 'nulo' };
  }

  if (valor === undefined) {
    // Mercados del partido completo.
    const totales: Record<string, number> = {
      golesTotales: partido.golesLocal + partido.golesVisitante,
      cornersTotales: partido.estadisticas.local.corners + partido.estadisticas.visitante.corners,
      tarjetasTotales: partido.estadisticas.local.amarillas + partido.estadisticas.visitante.amarillas,
      rematesTotales: partido.estadisticas.local.remates + partido.estadisticas.visitante.remates,
    };
    valor = totales[metrica];
  }

  if (valor === undefined || Number.isNaN(linea)) return { resultado: 'pendiente' };
  const acierta = sentido === 'mas' ? valor > linea : valor < linea;
  return { resultado: acierta ? 'ganado' : 'perdido', valorReal: valor };
}

export function calculaRendimiento(guardados: PickGuardado[]): Rendimiento {
  const ganados = guardados.filter((g) => g.resultado === 'ganado');
  const perdidos = guardados.filter((g) => g.resultado === 'perdido');
  const pendientes = guardados.filter((g) => g.resultado === 'pendiente');
  const resueltos = ganados.length + perdidos.length;
  // Una unidad por pick: lo ganado es (cuota - 1) y lo perdido es -1.
  const beneficio =
    ganados.reduce((a, g) => a + (g.cuota - 1), 0) - perdidos.length;
  return {
    total: guardados.length,
    ganados: ganados.length,
    perdidos: perdidos.length,
    pendientes: pendientes.length,
    acierto: resueltos ? (ganados.length / resueltos) * 100 : 0,
    roi: resueltos ? (beneficio / resueltos) * 100 : 0,
    beneficio,
  };
}

export function ProveedorTienda({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(INICIAL);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const crudo = await AsyncStorage.getItem(CLAVE);
        if (crudo) {
          const leido = JSON.parse(crudo) as Partial<Estado>;
          const ajustes = { ...INICIAL.ajustes, ...leido.ajustes };
          // Solo se corrige la competición que nunca eligió nadie: si el
          // usuario escogió una a mano, se respeta aunque no tenga datos
          // descargados, porque para eso está el catálogo completo.
          const eraLaDefecto = ajustes.competicionId === INICIAL.ajustes.competicionId;
          if (eraLaDefecto && !competicionVisible(ajustes.competicionId)) {
            ajustes.competicionId = competicionesVisibles()[0]?.id ?? ajustes.competicionId;
          }
          setEstado({ ...INICIAL, ...leido, ajustes, guardados: leido.guardados ?? [] });
        } else if (!competicionVisible(INICIAL.ajustes.competicionId)) {
          const primera = competicionesVisibles()[0]?.id;
          if (primera) {
            setEstado((prev) => ({ ...prev, ajustes: { ...prev.ajustes, competicionId: primera } }));
          }
        }
      } catch {
        // Un almacenamiento corrupto no debe impedir abrir la app.
      } finally {
        setCargado(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!cargado) return;
    AsyncStorage.setItem(CLAVE, JSON.stringify(estado)).catch(() => {});
  }, [estado, cargado]);

  /*
   * Cada vez que cambia la lista se vuelve a mirar qué picks tienen desenlace.
   *
   * Se reevalúan **todos**, no solo los pendientes. Antes había un
   * `if (g.resultado !== 'pendiente') return g` y eso convertía cualquier
   * cierre equivocado en definitivo: un pick marcado como ganado por error no
   * se revisaba nunca más, se quedaba en verde para siempre y seguía sumando
   * al porcentaje de acierto. Y los había, porque el archivo daba por
   * terminados partidos que aún se estaban jugando.
   *
   * El resultado guardado no manda: manda lo que se puede demostrar ahora. Si
   * ya no se puede afirmar, vuelve a pendiente, que es la verdad.
   */
  const guardados = useMemo(
    () =>
      estado.guardados.map((g) => {
        const { resultado, valorReal } = resuelve(g);
        return g.resultado === resultado && g.valorReal === valorReal
          ? g
          : { ...g, resultado, valorReal };
      }),
    [estado.guardados],
  );

  const guardar = useCallback((pick: Pick) => {
    setEstado((prev) => {
      if (prev.guardados.some((g) => g.pickId === pick.id)) return prev;
      const nuevo: PickGuardado = {
        pickId: pick.id,
        titulo: pick.titulo,
        equipo: pick.equipo,
        mercado: pick.mercado,
        contexto: pick.contexto,
        cuota: pick.cuota,
        imagen: pick.imagen,
        esBandera: pick.esBandera,
        nombres: pick.nombres,
        sujeto: pick.sujeto,
        competicionId: pick.competicionId,
        partidoId: pick.partidoId,
        guardadoEn: new Date().toISOString(),
        resultado: 'pendiente',
      };
      return { ...prev, guardados: [nuevo, ...prev.guardados] };
    });
  }, []);

  /**
   * Reemplaza la lista entera de guardados. La usa la sincronización con la
   * cuenta al entrar: recibe lo que hay en el teléfono y devuelve la mezcla
   * con lo que había en la nube.
   */
  const restaura = useCallback((mezcla: (locales: PickGuardado[]) => PickGuardado[]) => {
    setEstado((prev) => ({ ...prev, guardados: mezcla(prev.guardados) }));
  }, []);

  const quitar = useCallback((pickId: string) => {
    setEstado((prev) => ({
      ...prev,
      guardados: prev.guardados.filter((g) => g.pickId !== pickId),
    }));
  }, []);

  const cambiaAjuste = useCallback(
    <K extends keyof Ajustes>(clave: K, valor: Ajustes[K]) => {
      setEstado((prev) => ({ ...prev, ajustes: { ...prev.ajustes, [clave]: valor } }));
    },
    [],
  );

  const alternaLiga = useCallback((competicionId: string) => {
    setEstado((prev) => {
      const seguidas = prev.ajustes.ligasSeguidas;
      const nuevas = seguidas.includes(competicionId)
        ? seguidas.filter((x) => x !== competicionId)
        : [...seguidas, competicionId];
      return { ...prev, ajustes: { ...prev.ajustes, ligasSeguidas: nuevas } };
    });
  }, []);

  const valor = useMemo<Tienda>(
    () => ({
      ...estado,
      guardados,
      cargado,
      pro: estado.plan !== 'ninguno',
      guardar,
      quitar,
      restaura,
      estaGuardado: (pickId: string) => guardados.some((g) => g.pickId === pickId),
      cambiaAjuste,
      alternaLiga,
      activaPlan: (plan: Plan) => setEstado((prev) => ({ ...prev, plan })),
      terminaOnboarding: () => setEstado((prev) => ({ ...prev, onboarding: true })),
      reinicia: () => setEstado({ ...INICIAL, onboarding: true }),
      rendimiento: calculaRendimiento(guardados),
    }),
    [estado, guardados, cargado, guardar, quitar, restaura, cambiaAjuste, alternaLiga],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTienda(): Tienda {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error('useTienda fuera del ProveedorTienda');
  return ctx;
}
