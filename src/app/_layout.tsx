import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Simbolo } from '@/componentes/marca';
import { cargaGuardados, descargaDatos } from '@/datos/remotos';
import { ProveedorAvisos } from '@/estado/avisos';
import { ProveedorComunidad } from '@/estado/comunidad';
import { ProveedorDerechos } from '@/estado/derechos';
import { ProveedorSesion, useSesion } from '@/estado/sesion';
import { Sincroniza } from '@/estado/sincroniza';
import { ProveedorTienda, useTienda } from '@/estado/tienda';
import { ProveedorVivo } from '@/estado/vivo';
import { C, E } from '@/tema';

/** Pantalla de carga mientras se lee el estado guardado. */
function Cargando() {
  return (
    <View style={{ flex: 1, backgroundColor: C.fondo, alignItems: 'center', justifyContent: 'center' }}>
      <Simbolo tam={52} />
    </View>
  );
}

/** Manda al onboarding la primera vez que se abre la app. */
function Puerta() {
  const { cargado, onboarding } = useTienda();
  const { cargada, exigeCuenta } = useSesion();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!cargado || !cargada) return;
    const donde = segmentos[0];

    // Primero la presentación, que explica qué es esto; después la cuenta.
    if (!onboarding) {
      if (donde !== 'bienvenida') router.replace('/bienvenida');
      return;
    }
    if (exigeCuenta && donde !== 'entrar') router.replace('/entrar');
    else if (!exigeCuenta && donde === 'entrar') router.replace('/');
  }, [cargado, cargada, onboarding, exigeCuenta, segmentos, router]);

  if (!cargado || !cargada) return <Cargando />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: C.fondo },
        animation: 'slide_from_right',
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
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.fondo,
          alignItems: 'center',
          justifyContent: 'center',
          gap: E.md,
        }}
      >
        <ActivityIndicator color={C.lima} />
        <Text style={{ color: C.texto3, fontSize: 13 }}>Cargando resultados…</Text>
      </View>
    );
  }

  return <React.Fragment key={version}>{children}</React.Fragment>;
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
                  <Puerta />
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
