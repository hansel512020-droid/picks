import { useLocalSearchParams } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pulsable, Tarjeta, Txt } from '@/componentes/base';
import { CabeceraAtras } from '@/componentes/navegacion';
import { C, E } from '@/tema';

/**
 * Términos y condiciones, y política de privacidad.
 *
 * Van juntos en una pantalla con dos apartados en vez de en dos pantallas: se
 * leen del tirón, se enlazan desde el mismo sitio y quien busca "cómo borro mi
 * cuenta" no tiene que adivinar en cuál de los dos está. Se entra con
 * `?ver=privacidad` para ver solo el segundo.
 *
 * El texto describe lo que la app hace DE VERDAD hoy: pago único que no se
 * renueva, datos en Supabase, contacto por correo. Si algo de eso cambia
 * —renovación automática, otro proveedor, publicidad— hay que cambiarlo aquí el
 * mismo día: un documento legal que no coincide con el producto es peor que no
 * tenerlo, porque promete cosas que no se cumplen.
 */

const CORREO = 'PicksGolden@proton.me';
/** Cuándo se revisó por última vez. Sale bajo el título. */
const ACTUALIZADO = '22 de agosto de 2026';

interface Apartado {
  titulo: string;
  parrafos: string[];
}

const TERMINOS: Apartado[] = [
  {
    titulo: 'Qué es Golden Picks',
    parrafos: [
      'Golden Picks es una plataforma de información y análisis de datos estadísticos deportivos. Reúne resultados y estadísticas de fuentes públicas, calcula tendencias y las presenta de forma ordenada.',
      'No somos una casa de apuestas, no aceptamos apuestas, no procesamos apuestas y no intermediamos con ninguna casa. El contenido es exclusivo para fines de análisis e investigación.',
    ],
  },
  {
    titulo: 'No garantizamos ganancias',
    parrafos: [
      'Ningún análisis de esta aplicación es un consejo financiero ni una predicción garantizada. Los porcentajes de acierto que se muestran miden lo que ocurrió en el pasado y no aseguran lo que ocurrirá.',
      'Las decisiones que tomes con esta información son tuyas, y también sus consecuencias económicas. Si apuestas, arriesga solo lo que puedas permitirte perder.',
    ],
  },
  {
    titulo: 'Solo para mayores de 18 años',
    parrafos: [
      'Al usar la aplicación declaras tener 18 años cumplidos, o la mayoría de edad que exija la ley del lugar donde estés si fuera superior. Es tu responsabilidad comprobar que el uso de este tipo de contenido es legal donde te encuentras.',
    ],
  },
  {
    titulo: 'Tu cuenta',
    parrafos: [
      'Tu cuenta es personal e intransferible. Eres responsable de lo que se haga con ella y de guardar tu contraseña.',
      'Podemos suspender o cerrar una cuenta que comparta su acceso con terceros, revenda el contenido, intente saltarse los pagos o dañe el servicio. En ese caso no se devuelve el importe del periodo en curso.',
    ],
  },
  {
    titulo: 'Suscripciones y pagos',
    parrafos: [
      'Golden Pro se vende por periodos: semanal, mensual o anual para todas las competiciones, o planes de 2 y 3 competiciones a elegir. El precio de cada plan es el que aparece en la pantalla de pago en el momento de comprar.',
      'El cobro lo procesa Payphone. No vemos ni guardamos los datos de tu tarjeta en ningún momento.',
      'Es un pago único por el periodo contratado: NO se renueva solo y no hay nada que cancelar. Cuando el periodo termina, el acceso se cierra y no se te vuelve a cobrar. Si quieres seguir, compras otro periodo.',
      'Los planes de 2 y 3 competiciones dan derecho a elegir esa cantidad de competiciones. La elección vale para todo el periodo contratado.',
    ],
  },
  {
    titulo: 'Devoluciones',
    parrafos: [
      'Si el acceso no se activa después de un pago, escríbenos y lo resolvemos: o se activa o se devuelve el importe íntegro.',
      'Fuera de ese caso, y por tratarse de contenido digital de acceso inmediato, no se devuelve el importe de un periodo ya empezado. Que un análisis no acierte no da derecho a devolución: se vende el análisis, no el resultado.',
    ],
  },
  {
    titulo: 'Disponibilidad del servicio',
    parrafos: [
      'Los datos provienen de fuentes externas y pueden llegar con retraso, incompletos o con errores. Hacemos lo posible por que el servicio esté disponible, pero no garantizamos que funcione sin interrupciones.',
      'Si el servicio dejara de prestarse de forma definitiva, se avisará a las cuentas que tengan un periodo pagado en curso.',
    ],
  },
  {
    titulo: 'Cambios en estas condiciones',
    parrafos: [
      'Podemos actualizar estas condiciones. Los cambios se publican en esta misma pantalla con su fecha y no afectan a un periodo ya pagado.',
    ],
  },
];

const PRIVACIDAD: Apartado[] = [
  {
    titulo: 'Qué datos guardamos',
    parrafos: [
      'Tu correo electrónico, para identificar tu cuenta y poder recuperarla. Si entras con Google, también el nombre y la foto que Google nos comparte.',
      'Los picks que guardas, tus ligas seguidas y tus ajustes, para que los tengas en cualquier dispositivo donde entres.',
      'Qué plan compraste, cuándo y por cuánto, junto con el identificador de la operación de Payphone. Hace falta para darte el acceso y para resolver cualquier reclamación sobre un cobro.',
      'Un identificador anónimo del dispositivo, que sirve para contar cuánta gente ha guardado cada pick. No lleva ningún dato personal.',
    ],
  },
  {
    titulo: 'Qué NO guardamos',
    parrafos: [
      'Datos de tu tarjeta. El pago ocurre entero dentro de Payphone; nosotros solo recibimos la confirmación de si se cobró o no.',
      'Tampoco guardamos tu ubicación, tu agenda de contactos ni nada de lo que hagas fuera de la aplicación.',
    ],
  },
  {
    titulo: 'Para qué los usamos',
    parrafos: [
      'Solo para que la aplicación funcione: darte acceso a lo que has pagado, guardar tu historial y avisarte de tus picks.',
      'No vendemos tus datos, no los cedemos a terceros con fines comerciales y no mostramos publicidad.',
    ],
  },
  {
    titulo: 'Dónde viven',
    parrafos: [
      'En Supabase, el proveedor que aloja nuestra base de datos, con acceso restringido. Los pagos los procesa Payphone, que trata los datos de pago según sus propias condiciones.',
      'Las estadísticas deportivas provienen de fuentes públicas y no contienen información sobre ti.',
    ],
  },
  {
    titulo: 'Cuánto tiempo',
    parrafos: [
      'Mientras tengas cuenta. Los datos de las compras se conservan más tiempo, porque hay que poder justificar un cobro.',
    ],
  },
  {
    titulo: 'Tus derechos',
    parrafos: [
      'Puedes pedir en cualquier momento que te digamos qué datos tenemos tuyos, que los corrijamos o que borremos tu cuenta y todo lo asociado. Escríbenos y lo hacemos.',
      'Desde el perfil también puedes borrar cuando quieras los picks guardados y los ajustes de ese dispositivo.',
    ],
  },
];

function Bloque({ apartados }: { apartados: Apartado[] }) {
  return (
    <View style={{ gap: E.md }}>
      {apartados.map((a) => (
        <Tarjeta key={a.titulo} style={{ padding: E.md, gap: E.sm }}>
          <Txt v="cuerpoFuerte">{a.titulo}</Txt>
          {a.parrafos.map((p, i) => (
            <Txt key={i} v="pequeno" color={C.texto2}>
              {p}
            </Txt>
          ))}
        </Tarjeta>
      ))}
    </View>
  );
}

export default function Legal() {
  const insets = useSafeAreaInsets();
  const { ver } = useLocalSearchParams<{ ver?: string }>();
  const soloPrivacidad = ver === 'privacidad';

  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top + E.sm }}>
      <CabeceraAtras
        titulo={soloPrivacidad ? 'Privacidad' : 'Términos y privacidad'}
        subtitulo={`Actualizado el ${ACTUALIZADO}`}
      />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: E.lg, paddingBottom: E.xxxl, gap: E.lg }}
        showsVerticalScrollIndicator={false}
      >
        {!soloPrivacidad ? (
          <View style={{ gap: E.md }}>
            <Txt v="pequenoFuerte" color={C.texto3}>
              TÉRMINOS Y CONDICIONES
            </Txt>
            <Bloque apartados={TERMINOS} />
          </View>
        ) : null}

        <View style={{ gap: E.md }}>
          <Txt v="pequenoFuerte" color={C.texto3}>
            POLÍTICA DE PRIVACIDAD
          </Txt>
          <Bloque apartados={PRIVACIDAD} />
        </View>

        <Pulsable
          onPress={() => {
            const asunto = encodeURIComponent('Golden Picks · consulta legal');
            Linking.openURL(`mailto:${CORREO}?subject=${asunto}`).catch(() => {});
          }}
        >
          <Tarjeta style={{ padding: E.md, gap: 4 }}>
            <Txt v="cuerpoFuerte">¿Dudas, o quieres borrar tus datos?</Txt>
            <Txt v="pequeno" color={C.lima}>
              {CORREO}
            </Txt>
          </Tarjeta>
        </Pulsable>

        <Txt v="mini" color={C.texto3} style={{ textAlign: 'center' }}>
          Golden Picks es una plataforma puramente informativa y de análisis de datos estadísticos
          deportivos. No somos una casa de apuestas, ni procesamos apuestas ni garantizamos retornos
          financieros. Solo para mayores de 18 años.
        </Txt>
      </ScrollView>
    </View>
  );
}
