import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, type ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PantallaCargando } from '@/componentes/cargando';
import { cargaGuardados, descargaDatos } from '@/datos/remotos';
import { ProveedorAvisos } from '@/estado/avisos';
import { ProveedorComunidad } from '@/estado/comunidad';
import { ProveedorDerechos } from '@/estado/derechos';
import { ProveedorSesion, useSesion } from '@/estado/sesion';
import { Sincroniza } from '@/estado/sincroniza';
import { ProveedorTienda, useTienda } from '@/estado/tienda';
import { ProveedorVivo } from '@/estado/vivo';
import { C, E } from '@/tema';

/*
 * La versión de los datos, para repintar cuando llegan unos nuevos.
 *
 * Antes esto era un `key` sobre TODO el árbol —proveedores incluidos—, así que
 * al llegar datos frescos del servidor se remontaba la app entera: la sesión y
 * los derechos se recargaban, y la pantalla de carga volvía a salir con la app
 * ya abierta. Se veía como "se carga dos veces". Ahora la versión viaja por
 * contexto y solo remonta las pantallas (más abajo, con `Versionado`), no los
 * proveedores, que se quedan montados y no vuelven a cargar nada.
 */
const CtxVersionDatos = React.createContext(0);

/** Remonta a sus hijos cuando cambia la versión de los datos, y nada más. */
function Versionado({ children }: { children: React.ReactNode }) {
  const version = React.useContext(CtxVersionDatos);
  return <React.Fragment key={version}>{children}</React.Fragment>;
}

/**
 * Pantalla de carga mientras se lee el estado guardado.
 *
 * La misma que las demás: era un símbolo suelto en el centro, y entre él, el
 * "Cargando resultados…" y la pantalla de la portada se veían tres esperas
 * distintas seguidas para una sola apertura.
 */
function Cargando() {
  return <PantallaCargando titulo="Golden Picks" detalle="Abriendo tu cuenta" />;
}

/** Manda al onboarding la primera vez que se abre la app. */
function Puerta() {
  const { cargado, onboarding } = useTienda();
  const { cargada, exigeCuenta } = useSesion();
  const segmentos = useSegments();
  const router = useRouter();

  /*
   * El nombre de la pestaña del navegador, puesto a mano.
   *
   * La plantilla HTML trae un <title>, pero la navegacion lo vacia al arrancar
   * —`document.title` acaba en cadena vacia— y entonces Chrome enseña la
   * direccion: en la pestaña salia "goldenpicks.vercel.app" mientras las de al
   * lado decian "YouTube". Poner `title` en las opciones de las pantallas no
   * bastaba.
   *
   * Se repone en cada cambio de pantalla, no solo al abrir: si no, bastaba con
   * navegar una vez para que se volviera a quedar en blanco.
   */
  useEffect(() => {
    if (typeof document !== 'undefined' && document.title !== 'Golden Picks') {
      document.title = 'Golden Picks';
    }
  }, [segmentos]);

  useEffect(() => {
    if (!cargado || !cargada) return;
    const donde = segmentos[0];

    // Primero la presentación, que explica qué es esto; después la cuenta.
    if (!onboarding) {
      if (donde !== 'bienvenida') router.replace('/bienvenida');
      return;
    }
    /*
     * Los términos y la privacidad se ven sin cuenta a propósito: se enlazan
     * desde la propia pantalla de registro, y mandar a alguien a "entrar" justo
     * cuando va a leer lo que está aceptando es de broma.
     */
    const abiertasSinCuenta = ['entrar', 'terminos', 'privacidad'];
    if (exigeCuenta && !abiertasSinCuenta.includes(donde ?? '')) router.replace('/entrar');
    else if (!exigeCuenta && donde === 'entrar') router.replace('/');
  }, [cargado, cargada, onboarding, exigeCuenta, segmentos, router]);

  if (!cargado || !cargada) return <Cargando />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.fondo },
        animation: 'slide_from_right',
        /*
         * El nombre de la pestaña del navegador.
         *
         * La plantilla HTML ya trae un <title>, pero en cuanto arranca la
         * navegacion esta lo pisa con el de la pantalla activa; sin ninguno,
         * Chrome se queda con la direccion y en la pestaña salia
         * "goldenpicks.vercel.app" en vez del nombre.
         *
         * Va en las opciones comunes para que valga en todas las pantallas: da
         * igual si alguien llega a un pick o al perfil, la pestaña se reconoce
         * igual entre veinte abiertas.
         */
        title: 'Golden Picks',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="bienvenida" options={{ animation: 'fade' }} />
      <Stack.Screen name="entrar" options={{ animation: 'fade' }} />
      <Stack.Screen name="pro" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="casas" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen
        name="competiciones"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

/**
 * En el navegador la app ocupa la ventana entera, sin topes ni franjas negras
 * a los lados: es una pagina web, no la simulacion de un movil dentro de una
 * pagina. En iOS y Android no envuelve nada.
 */
function MarcoMovil({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={{ flex: 1, width: '100%', backgroundColor: C.fondo, overflow: 'hidden' }}>
      {children}
    </View>
  );
}

/**
 * Trae los datos del servidor mientras la app ya está en marcha.
 *
 * Primero se aplica lo guardado del arranque anterior y después se pregunta si
 * hay algo nuevo. Nada de esto bloquea la pantalla: si no hay red, la app abre
 * igual con lo último que sabía, y unos resultados de ayer valen infinitamente
 * más que una pantalla en blanco.
 *
 * `version` sube cuando llegan datos nuevos, y con ella se repinta el árbol
 * entero: las pantallas guardan cosas calculadas a partir del archivo y hay que
 * pedirles que las rehagan.
 */
function ConDatos({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  /*
   * Hasta que no haya datos de verdad no se enseña la app.
   *
   * Antes se pintaba enseguida con el archivo de relleno que viaja dentro y se
   * sustituía al llegar los buenos. El resultado era medio segundo largo de
   * partidos que no existen —"FC Norte vs Sporting Sur"— y nadie que abre una
   * app por primera vez sabe que eso es de mentira: se lo cree, y lo que se
   * cree es que los datos son inventados.
   *
   * Con la copia en IndexedDB esto solo se nota la primera visita; después
   * arranca al momento con lo de la última vez.
   */
  const [listo, setListo] = useState(false);

  /*
   * Cuando el detalle por jugador entra en segundo plano NO se remonta nada: los
   * cálculos (`useCalculo`/`useCalculoProgresivo`) lo recogen solos y se rehacen
   * en el sitio, conservando en pantalla lo que ya había. Remontar aquí hacía
   * que los picks parecieran cargar dos veces. El `version` de abajo se reserva
   * para el reemplazo completo del archivo, no para este añadido.
   */

  useEffect(() => {
    let vivo = true;
    (async () => {
      if (await cargaGuardados()) {
        if (!vivo) return;
        setListo(true);
        setVersion((v) => v + 1);
      }
      const hayNuevos = await descargaDatos();
      if (!vivo) return;
      /*
       * `listo` se pone pase lo que pase, también si la descarga falla. Sin
       * red la app abre con lo que trae dentro: peor que los datos de hoy,
       * infinitamente mejor que dejar a alguien mirando una rueda para siempre.
       */
      setListo(true);
      if (hayNuevos) setVersion((v) => v + 1);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  if (!listo) {
    // La misma pantalla que la portada, para que la espera sea una sola y no
    // tres pantallas distintas pisándose. Ver `PantallaCargando`.
    return (
      <PantallaCargando
        titulo="Cargando resultados"
        detalle="Trayendo los partidos y las cuotas de hoy"
      />
    );
  }

  // La versión viaja por contexto; el remonte se hace abajo, solo alrededor de
  // las pantallas, para no arrastrar a los proveedores.
  return <CtxVersionDatos.Provider value={version}>{children}</CtxVersionDatos.Provider>;
}

export default function Raiz() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.fondo }}>
      <SafeAreaProvider>
        <ConDatos>
        <ProveedorSesion>
          <ProveedorDerechos>
          <ProveedorTienda>
            <ProveedorAvisos>
            <ProveedorComunidad>
              <ProveedorVivo>
                <StatusBar style="light" />
                {/* Sube y baja los picks del usuario mientras la app vive. */}
                <Sincroniza />
                <MarcoMovil>
                  <Versionado>
                    <Puerta />
                  </Versionado>
                </MarcoMovil>
              </ProveedorVivo>
            </ProveedorComunidad>
            </ProveedorAvisos>
          </ProveedorTienda>
          </ProveedorDerechos>
        </ProveedorSesion>
        </ConDatos>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
