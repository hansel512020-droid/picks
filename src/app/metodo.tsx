import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Separador, Tarjeta, Txt } from '@/componentes/base';
import { Icono, type NombreIcono } from '@/componentes/iconos';
import { CabeceraAtras } from '@/componentes/navegacion';
import { C, E, R } from '@/tema';

/** Explicacion honesta de como se calcula lo que ensena la app. */

const PASOS: { icono: NombreIcono; titulo: string; texto: string }[] = [
  {
    icono: 'grafico',
    titulo: '1. Se mide lo que pasó',
    texto:
      'De cada jugador se guarda una línea por partido con más de 30 métricas: remates, remates a puerta, pases clave, regates, entradas, duelos, faltas, minutos… Solo cuentan los partidos con 25 minutos o más, porque una línea de remates no dice nada de alguien que entró en el 88.',
  },
  {
    icono: 'tendencia',
    titulo: '2. Se busca lo que se repite',
    texto:
      'Para cada línea de mercado se cuenta cuántas veces la superó en los últimos 5, 10 y 20 partidos. Un pick solo entra en la lista si acierta 7 de los últimos 10 o más. La probabilidad del modelo mezcla la racha corta con la muestra larga y se acerca al 50% cuando hay pocos partidos.',
  },
  {
    icono: 'moneda',
    titulo: '3. Se compara con el precio',
    texto:
      'La cuota no sale de esa racha: sale de la media de toda la temporada corregida hacia el patrón de su puesto, que es como tarifica el mercado, más el margen de la casa que hayas elegido. La ventaja es la diferencia entre la probabilidad del modelo y la que implica la cuota.',
  },
  {
    icono: 'filtro',
    titulo: '4. Se filtra el ruido',
    texto:
      'Se descartan los mercados sin recorrido (cuotas por debajo de 1.18 o por encima de 6), los "menos de 0.5" que solo dicen que alguien no hará nada, y las repeticiones: de cada métrica se queda la mejor línea y de cada jugador como mucho dos picks.',
  },
];

export default function Metodo() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      <CabeceraAtras titulo="Cómo se calculan los picks" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: E.lg, paddingBottom: E.xxxl, gap: E.md }}
        showsVerticalScrollIndicator={false}
      >
        {PASOS.map((p) => (
          <Tarjeta key={p.titulo} style={{ padding: E.md, gap: E.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.sm }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: C.limaTenue,
                }}
              >
                <Icono nombre={p.icono} tam={15} color={C.lima} />
              </View>
              <Txt v="cuerpoFuerte" style={{ flex: 1 }}>
                {p.titulo}
              </Txt>
            </View>
            <Txt v="pequeno" color={C.texto2}>
              {p.texto}
            </Txt>
          </Tarjeta>
        ))}

        {/*
          Aquí había un "De dónde salen los datos" que listaba las 36
          competiciones con su fuente y sus temporadas. Fuera: era una parrafada
          de decenas de líneas idénticas —todas ponían lo mismo— que enterraba
          lo único que esta pantalla tiene que explicar, que es el método. Esa
          información sigue en Perfil → Origen de los datos, que es su sitio.
        */}

        <Tarjeta style={{ padding: E.md, gap: E.sm, borderColor: C.ambarTenue }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.sm }}>
            <Icono nombre="info" tam={17} color={C.ambar} />
            <Txt v="cuerpoFuerte" color={C.ambar}>
              Lo que esta app no es
            </Txt>
          </View>
          <Txt v="pequeno" color={C.texto2}>
            Golden Picks no es una casa de apuestas, no acepta depósitos y no cobra comisión de
            nadie. Tampoco predice el futuro: enseña con qué frecuencia se ha repetido algo y a qué
            precio se paga. Una racha de 10 partidos es una muestra pequeña y el resultado de un
            partido puede ser cualquiera.
          </Txt>
          <Separador />
          <Txt v="mini" color={C.texto3}>
            En las competiciones sin importar, los datos se generan con un modelo propio con semilla
            fija: son consistentes entre sesiones, pero no corresponden a partidos reales.
          </Txt>
        </Tarjeta>

        <View
          style={{
            padding: E.md,
            borderRadius: R.md,
            backgroundColor: C.carta2,
            gap: 4,
          }}
        >
          <Txt v="pequenoFuerte">Juega con responsabilidad</Txt>
          <Txt v="mini" color={C.texto3}>
            Solo para mayores de 18 años. Apuesta únicamente lo que puedas permitirte perder y
            establece límites antes de empezar.
          </Txt>
        </View>
      </ScrollView>
    </View>
  );
}
