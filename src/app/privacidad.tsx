import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/componentes/base';
import { CabeceraAtras } from '@/componentes/navegacion';
import { C, E } from '@/tema';

/**
 * Política de privacidad.
 *
 * Se escribe con lo que la app hace de verdad —correo, nombre, teléfono, lo que
 * guardas y lo que compras—, no con una plantilla. Si mañana se añade otra cosa
 * que se recoja, hay que apuntarla aquí.
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

export default function Privacidad() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, paddingTop: insets.top }}>
      <CabeceraAtras titulo="Política de Privacidad" />
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

        <Seccion titulo="1. Qué se guarda">
          <P>
            Cuando creas la cuenta: tu nombre, tu correo y, si lo escribes, tu teléfono. La
            contraseña no se guarda en claro en ningún sitio: la cifra el servidor de cuentas y
            nadie de Golden Picks puede verla.
          </P>
          <P>
            Mientras usas la app: los picks que guardas, las ligas que sigues y tus ajustes. Y si
            compras: qué plan, cuánto costó, cuándo caduca y la referencia del cobro.
          </P>
          <P>
            Del navegador o del móvil se guarda un identificador del aparato, que sirve para que el
            contador de guardados no cuente dos veces lo mismo.
          </P>
        </Seccion>

        <Seccion titulo="2. Para qué se usa">
          <P>
            Para que puedas entrar desde cualquier sitio y encontrar lo tuyo, para saber qué tienes
            comprado y hasta cuándo, para responderte si escribes con un problema de pago y para
            arreglar fallos de la app.
          </P>
          <P>
            No se usa para perfilarte con fines publicitarios ni se venden tus datos a nadie. Nunca.
          </P>
        </Seccion>

        <Seccion titulo="3. Quién más los ve">
          <P>
            Golden Picks se apoya en dos proveedores, y solo en lo justo: Supabase, que guarda las
            cuentas y los datos, y Payphone, que procesa los pagos. Los datos de tu tarjeta los
            maneja la pasarela; a la app nunca llegan.
          </P>
          <P>
            Si entras con Google, Google nos da tu correo y tu nombre. Nada más.
          </P>
        </Seccion>

        <Seccion titulo="4. Correos que recibirás">
          <P>
            Solo los necesarios: confirmar la cuenta, recuperar la contraseña y los avisos de tu
            compra. Si algún día se manda algo promocional, llevará un enlace para darse de baja en
            un clic.
          </P>
        </Seccion>

        <Seccion titulo="5. Cuánto tiempo se guarda">
          <P>
            Mientras tengas la cuenta abierta. Si la borras, se elimina tu perfil y lo que habías
            guardado. El registro de las compras se conserva el tiempo que exige la contabilidad,
            porque es un cobro y tiene que poder justificarse.
          </P>
        </Seccion>

        <Seccion titulo="6. Tus derechos">
          <P>
            Puedes pedir una copia de tus datos, corregirlos o borrarlos. Escribe desde el correo
            con el que te registraste a hansel512020@gmail.com y se hace.
          </P>
        </Seccion>

        <Seccion titulo="7. Menores">
          <P>
            La app es para mayores de 18 años. No se recogen datos de menores a sabiendas; si nos
            avisan de una cuenta de un menor, se cierra y se borran sus datos.
          </P>
        </Seccion>

        <Seccion titulo="8. Cambios">
          <P>
            Si cambia lo que se recoge o para qué, se actualiza esta página y cambia la fecha de
            arriba.
          </P>
        </Seccion>
      </ScrollView>
    </View>
  );
}
