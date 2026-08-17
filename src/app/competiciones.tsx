import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip, Insignia, Pulsable, Separador, Tarjeta, Txt } from '@/componentes/base';
import { RejillaCompeticiones } from '@/componentes/carruseles';
import { Icono } from '@/componentes/iconos';
import { LogoCompeticion } from '@/componentes/imagen';
import { CabeceraAtras, TiraChips } from '@/componentes/navegacion';
import { competicion, competicionesVisibles, TODAS } from '@/datos/competiciones';
import type { Competicion } from '@/datos/tipos';
import { useDerechos } from '@/estado/derechos';
import { useTienda } from '@/estado/tienda';
import { C, E } from '@/tema';

/**
 * Dos usos con la misma pantalla: elegir la competicion activa o marcar las
 * que se siguen. Lo decide el parametro `modo`.
 */

type Filtro = 'todas' | 'continentales' | 'copas' | 'europa' | 'america';

const EUROPA = [
  'Inglaterra', 'España', 'Italia', 'Alemania', 'Francia', 'Países Bajos', 'Portugal',
  'Bélgica', 'Turquía', 'Escocia', 'Grecia', 'Suiza', 'Austria', 'Dinamarca', 'Noruega',
  'Suecia', 'Polonia', 'Chequia', 'Croacia', 'Serbia', 'Rumanía', 'Ucrania',
];
const AMERICA = [
  'México', 'Estados Unidos', 'Brasil', 'Argentina', 'Colombia', 'Chile', 'Perú',
  'Bolivia', 'Ecuador', 'Uruguay', 'Paraguay', 'Venezuela',
];

/** Los filtros que van encima de la rejilla. */
const FILTROS: { id: Filtro; texto: string; aplica: (c: Competicion) => boolean }[] = [
  { id: 'todas', texto: 'Todas', aplica: () => true },
  {
    id: 'continentales',
    texto: 'Continentales',
    aplica: (c) => c.tipo === 'continental' || c.tipo === 'seleccion',
  },
  { id: 'copas', texto: 'Copas', aplica: (c) => c.tipo === 'copa' },
  { id: 'europa', texto: 'Europa', aplica: (c) => c.tipo === 'liga' && EUROPA.includes(c.pais) },
  { id: 'america', texto: 'América', aplica: (c) => c.tipo === 'liga' && AMERICA.includes(c.pais) },
];

export default function Competiciones() {
  const { modo } = useLocalSearchParams<{ modo?: string }>();
  const { ajustes, cambiaAjuste, alternaLiga } = useTienda();
  // Igual que en el perfil: quien dice si hay Pro es el servidor.
  const { pro } = useDerechos();
  const insets = useSafeAreaInsets();
  const seguir = modo === 'seguir';
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const disponibles = useMemo(() => competicionesVisibles(), []);
  const gratis = disponibles.filter((c) => c.gratis).length;

  /*
   * Solo se enseñan las competiciones que tienen datos descargados.
   *
   * Antes la rejilla recorría el catálogo entero —61 competiciones— con la idea
   * de "así se puede llegar a cualquiera, tenga datos o no". En la práctica eso
   * llenaba la pantalla de escudos que al tocarlos no muestran nada: 24 de 61
   * estaban vacías. Elegir entre lo que no existe no es elegir.
   */
  const rejilla = useMemo(() => {
    const f = FILTROS.find((x) => x.id === filtro)!;
    // "Todas" encabeza siempre la rejilla: no es de un continente ni de un
    // tipo, así que ningún filtro debe esconderla.
    return [
      competicion(TODAS),
      ...disponibles.filter((c) => c.id !== TODAS && f.aplica(c)),
    ];
  }, [filtro, disponibles]);

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      {/* Ya no se anuncia el catálogo entero: lo que no se puede abrir no
          cuenta, y "37 de 61" solo servía para señalar lo que falta. */}
      <CabeceraAtras
        titulo={seguir ? 'Ligas que sigo' : 'Competiciones'}
        subtitulo={`${disponibles.filter((c) => c.id !== TODAS).length} competiciones con datos`}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: E.xxxl, gap: E.lg }}
        showsVerticalScrollIndicator={false}
      >
        {!pro ? (
          <Pulsable onPress={() => router.push('/pro')} style={{ paddingHorizontal: E.lg }}>
            <Tarjeta
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: E.md,
                padding: E.md,
                backgroundColor: C.limaTenue,
                borderColor: C.limaBorde,
              }}
            >
              <Icono nombre="candado" tam={18} color={C.lima} />
              <Txt v="pequeno" color={C.texto2} style={{ flex: 1 }}>
                x
              </Txt>
            </Tarjeta>
          </Pulsable>
        ) : null}

        {seguir ? (
          <View style={{ gap: E.sm }}>
            <Txt v="pequenoFuerte" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
              TOCA PARA SEGUIR O DEJAR DE SEGUIR
            </Txt>
            <Tarjeta style={{ marginHorizontal: E.lg, overflow: 'hidden' }}>
              {disponibles.map((c, i) => {
                const sigue = ajustes.ligasSeguidas.includes(c.id);
                return (
                  <View key={c.id}>
                    {i > 0 ? <Separador /> : null}
                    <Pulsable
                      onPress={() => alternaLiga(c.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: E.md,
                        paddingHorizontal: E.md,
                        paddingVertical: 12,
                      }}
                    >
                      <LogoCompeticion competicionId={c.id} bandera={c.bandera} tam={26} cuadrado />
                      <View style={{ flex: 1 }}>
                        <Txt v="cuerpo">{c.nombre}</Txt>
                        <Txt v="mini" color={C.texto3}>
                          {c.pais} · {c.temporada}
                        </Txt>
                      </View>
                      {c.gratis ? <Insignia texto="GRATIS" color={C.lima} fondo={C.limaTenue} /> : null}
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1.5,
                          borderColor: sigue ? C.lima : C.borde,
                          backgroundColor: sigue ? C.lima : 'transparent',
                        }}
                      >
                        {sigue ? <Icono nombre="check" tam={12} color="#0A0B0D" grosor={3} /> : null}
                      </View>
                    </Pulsable>
                  </View>
                );
              })}
            </Tarjeta>
          </View>
        ) : (
          <>
            <Txt v="pequenoFuerte" color={C.texto3} style={{ paddingHorizontal: E.lg }}>
              ELIGE LA COMPETICIÓN ACTIVA
            </Txt>

            <TiraChips>
              {FILTROS.map((f) => (
                <Chip
                  key={f.id}
                  texto={f.texto}
                  activo={filtro === f.id}
                  onPress={() => setFiltro(f.id)}
                />
              ))}
            </TiraChips>

            <RejillaCompeticiones
              lista={rejilla}
              seleccionada={ajustes.competicionId}
              seguidas={ajustes.ligasSeguidas}
              onElige={(id) => {
                cambiaAjuste('competicionId', id);
                router.back();
              }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
