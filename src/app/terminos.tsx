import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tarjeta, Txt } from '@/componentes/base';
import { CabeceraAtras } from '@/componentes/navegacion';
import { C, E } from '@/tema';

/**
 * Términos de uso.
 *
 * Existe por dos motivos concretos, no por rellenar: la app cobra
 * suscripciones —y hay que decir qué se cobra, cuándo caduca y qué pasa si
 * alguien reclama— y habla de apuestas, donde lo que más problemas da es que
 * alguien entienda que se le promete ganar dinero. Aquí se dice que no.
 *
 * Esto no es un texto legal revisado por un abogado: es la descripción honesta
 * de cómo funciona el servicio. Si algún día hay volumen de verdad, conviene
 * que lo revise uno.
 */

const ACTUALIZADO = '23 de septiembre de 2026';

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: E.sm }}>
      <Txt v="titulo" color={C.lima}>
        {titulo}
      </Txt>
      {children}
    </View>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Txt v="cuerpo" color={C.texto2}>
      {children}
    </Txt>
  );
}

export default function Terminos() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top }}>
      <CabeceraAtras titulo="Términos de Uso" />
      <ScrollView
        contentContainerStyle={{
          padding: E.lg,
          paddingBottom: insets.bottom + E.xxxl,
          gap: E.xl,
        }}
      >
        <Txt v="mini" color={C.texto3}>
          Última actualización: {ACTUALIZADO}
        </Txt>

        <Seccion titulo="1. Qué es Golden Picks">
          <P>
            Golden Picks es una herramienta de análisis estadístico de fútbol. Reúne los resultados
            y las estadísticas públicas de cada partido, mide rachas y publica lo que ha pasado en
            los últimos encuentros de cada equipo y jugador.
          </P>
          <Tarjeta style={{ padding: E.md, borderColor: C.limaBorde, backgroundColor: C.limaTenue }}>
            <Txt v="cuerpoFuerte" color={C.lima}>
              Golden Picks NO es una casa de apuestas.
            </Txt>
            <Txt v="cuerpo" color={C.texto2}>
              No acepta apuestas, no las intermedia y no paga premios. Lo que publica es
              información, y la decisión de apostar —y el dinero que se arriesgue— es solo tuya.
            </Txt>
          </Tarjeta>
        </Seccion>

        <Seccion titulo="2. Nada de esto garantiza ganancias">
          <P>
            Los porcentajes, las rachas y las probabilidades que ves son estimaciones calculadas con
            partidos ya jugados. El fútbol no se repite: que algo haya ocurrido en 9 de los últimos
            10 partidos no significa que vuelva a ocurrir.
          </P>
          <P>
            Golden Picks no promete rentabilidad ni acierto, y no se hace responsable de las
            pérdidas de nadie. Apuesta solo lo que puedas permitirte perder.
          </P>
        </Seccion>

        <Seccion titulo="3. Solo mayores de edad">
          <P>
            Para usar Golden Picks hay que tener 18 años o la edad legal para apostar en tu país, la
            que sea mayor. Al crear la cuenta declaras que cumples ese requisito.
          </P>
        </Seccion>

        <Seccion titulo="4. Tu cuenta">
          <P>
            La cuenta es personal. Eres responsable de tu contraseña y de lo que se haga desde tu
            sesión. Si compartes tu acceso con más gente, podemos cerrarlo sin devolver lo pagado.
          </P>
          <P>
            Puedes borrar tu cuenta cuando quieras escribiendo desde el correo con el que te
            registraste.
          </P>
        </Seccion>

        <Seccion titulo="5. Planes y pagos">
          <P>
            Golden Pro se vende por periodos: semanal, mensual y anual, además de los planes de dos
            o tres ligas sueltas. El precio y la duración se muestran antes de pagar.
          </P>
          <P>
            El acceso empieza cuando la pasarela confirma el cobro y dura exactamente el periodo
            comprado. No hay renovación automática: cuando termina, el acceso se cierra y tú decides
            si vuelves a comprar.
          </P>
          <P>
            Los cobros los procesa Payphone. Golden Picks no ve ni guarda los datos de tu tarjeta.
          </P>
        </Seccion>

        <Seccion titulo="6. Devoluciones">
          <P>
            Como el contenido se entrega al instante y se consume el mismo día, no hay devolución
            por cambio de opinión ni por que los pronósticos no salieran.
          </P>
          <P>
            Sí se devuelve el dinero si hubo un cobro duplicado, si te cobramos y no se abrió el
            acceso, o si el servicio estuvo caído la mayor parte de tu periodo. Escríbenos y se
            revisa con el comprobante del cobro.
          </P>
        </Seccion>

        <Seccion titulo="7. Los datos de los partidos">
          <P>
            Los resultados y las estadísticas vienen de fuentes públicas y pueden llegar con
            retraso, incompletos o con errores de la propia fuente. Golden Picks no garantiza que
            estén siempre al día ni que sean exactos, y no responde por decisiones tomadas con un
            dato equivocado.
          </P>
        </Seccion>

        <Seccion titulo="8. Uso permitido">
          <P>
            Puedes usar Golden Picks para ti. No puedes copiar los datos de forma automática,
            revenderlos, republicarlos como si fueran tuyos ni usarlos para montar un servicio
            parecido.
          </P>
        </Seccion>

        <Seccion titulo="9. Cambios y cierre">
          <P>
            Podemos cambiar estos términos, los precios o las competiciones incluidas. Si el cambio
            te afecta y ya habías pagado, tu periodo en curso se respeta tal como lo compraste.
          </P>
        </Seccion>

        <Seccion titulo="10. Contacto">
          <P>
            Para cualquier cosa —soporte, un cobro, borrar tu cuenta— escribe a
            hansel512020@gmail.com.
          </P>
        </Seccion>
      </ScrollView>
    </View>
  );
}
