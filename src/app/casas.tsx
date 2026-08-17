import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pulsable, Separador, Tarjeta, Txt } from '@/componentes/base';
import { Icono } from '@/componentes/iconos';
import { CabeceraAtras } from '@/componentes/navegacion';
import { SelloCasa } from '@/componentes/pick';
import { CASAS } from '@/datos/casas';
import { useTienda } from '@/estado/tienda';
import { C, E } from '@/tema';

/** Elige la casa cuyos precios se ven en toda la app. */
export default function Casas() {
  const { ajustes, cambiaAjuste } = useTienda();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      <CabeceraAtras titulo="Fuente de precios" subtitulo="Los precios de la app usarán su margen" />

      <ScrollView contentContainerStyle={{ paddingBottom: E.xxxl, gap: E.lg }}>
        <Tarjeta style={{ marginHorizontal: E.lg, overflow: 'hidden' }}>
          {CASAS.map((casa, i) => {
            const activa = casa.id === ajustes.casaId;
            return (
              <View key={casa.id}>
                {i > 0 ? <Separador /> : null}
                <Pulsable
                  onPress={() => {
                    cambiaAjuste('casaId', casa.id);
                    router.back();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: E.md,
                    paddingHorizontal: E.md,
                    paddingVertical: 14,
                  }}
                >
                  <SelloCasa casaId={casa.id} tam={26} />
                  <View style={{ flex: 1 }}>
                    <Txt v="cuerpo">{casa.nombre}</Txt>
                    <Txt v="mini" color={C.texto3}>
                      Margen del {((casa.margen - 1) * 100).toFixed(1)}%
                    </Txt>
                  </View>
                  {activa ? <Icono nombre="check" tam={17} color={C.lima} grosor={2.4} /> : null}
                </Pulsable>
              </View>
            );
          })}
        </Tarjeta>

        <Txt v="mini" color={C.texto3} style={{ paddingHorizontal: E.xl, textAlign: 'center' }}>
          Golden no tiene acuerdos con ninguna casa. El margen sirve solo para estimar el precio que
          verías en cada una; comprueba siempre la cuota real antes de decidir.
        </Txt>
      </ScrollView>
    </View>
  );
}
