import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Boton, Txt, Vacio } from '@/componentes/base';
import { pickDelDia } from '@/datos/picks';
import { useTienda } from '@/estado/tienda';
import { useCalculo } from '@/utiles/carga';
import { C, E } from '@/tema';

/**
 * El pick gratis del día, abierto para todo el mundo.
 *
 * Es la dirección que se comparte: `goldenpicks.vercel.app/gratis` lleva
 * siempre al pick de hoy, sin tener que copiar un enlace distinto cada mañana.
 * Se abre sin cuenta y sin plan a propósito: es el escaparate, y un escaparate
 * con puerta cerrada no enseña nada.
 */
export default function Gratis() {
  const { ajustes } = useTienda();
  const pick = useCalculo(() => pickDelDia(ajustes.casaId), [ajustes.casaId]);

  useEffect(() => {
    if (!pick) return;
    // Se entra en la ficha del pick, que es la que ya sabe enseñarlo entero:
    // el argumento, la racha, el gráfico partido a partido y el precio.
    router.replace(
      `/pick/${encodeURIComponent(pick.id)}?comp=${pick.competicionId}` +
        `&partido=${encodeURIComponent(pick.partidoId)}&gratis=1`,
    );
  }, [pick]);

  if (pick === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo, alignItems: 'center', justifyContent: 'center', gap: E.md }}>
        <ActivityIndicator color={C.lima} />
        <Txt v="pequeno" color={C.texto3}>
          Buscando el pick de hoy…
        </Txt>
      </View>
    );
  }

  // Sin partidos hoy no hay pick gratis; se dice y se ofrece el resto.
  if (!pick) {
    return (
      <View style={{ flex: 1, backgroundColor: C.fondo, justifyContent: 'center', padding: E.lg, gap: E.lg }}>
        <Vacio
          icono="filtro"
          titulo="Hoy no hay pick gratis"
          detalle="No se juega nada que el modelo pueda analizar. Vuelve mañana."
        />
        <Boton texto="Ver todos los picks" onPress={() => router.replace('/')} />
      </View>
    );
  }

  return <View style={{ flex: 1, backgroundColor: C.fondo }} />;
}
