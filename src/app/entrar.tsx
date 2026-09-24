import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton, Insignia, Pulsable, Tarjeta, Txt } from '@/componentes/base';
import { Icono, LogoApple, LogoGoogle } from '@/componentes/iconos';
import { Logo } from '@/componentes/marca';
import {
  confirmaCodigo,
  entraConClave,
  olvideLaClave,
  registra,
  reenviaCodigo,
  sesionDesdeTokens,
  sesionGuardada,
  urlDeProveedor,
  type Proveedor,
} from '@/datos/cuenta';
import { useSesion } from '@/estado/sesion';
import { C, E, R } from '@/tema';

/**
 * Puerta de entrada.
 *
 * Dos caminos: la cuenta de Google, que es un toque y no hay contraseña que
 * recordar, o el correo con contraseña de siempre. En iPhone se añade Apple,
 * que es donde Apple lo exige.
 *
 * La misma pantalla sirve para crear cuenta y para entrar: se cambia con las
 * dos pestañas de arriba. Tener dos pantallas separadas obliga al usuario a
 * adivinar cuál le toca antes de haber escrito nada.
 */

// La dirección a la que el proveedor devuelve al usuario. Esto es una web, así
// que es la propia página; en móvil, el esquema de la app.
const DESTINO =
  Platform.OS === 'web'
    ? typeof window !== 'undefined'
      ? window.location.origin
      : ''
    : 'scoutpicks://entrar';

type Modo = 'crear' | 'entrar';

/**
 * Un campo del formulario, con su etiqueta encima.
 *
 * La etiqueta no es adorno: con solo el texto gris de dentro, en cuanto
 * escribes ya no sabes qué pedía cada casilla, y en un formulario de cuatro
 * eso se nota. La contraseña lleva ojo para verla: el 90% de los fallos al
 * entrar son una letra mal escrita que nadie puede comprobar.
 */
function Campo({
  etiqueta,
  valor,
  onCambia,
  marcador,
  tipo = 'texto',
}: {
  etiqueta?: string;
  valor: string;
  onCambia: (v: string) => void;
  marcador: string;
  tipo?: 'texto' | 'correo' | 'telefono' | 'clave';
}) {
  const [visible, setVisible] = useState(false);
  const esClave = tipo === 'clave';

  return (
    <View style={{ gap: 6 }}>
      {etiqueta ? (
        <Txt v="mini" color={C.texto3} style={{ letterSpacing: 0.6 }}>
          {etiqueta.toUpperCase()}
        </Txt>
      ) : null}
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          value={valor}
          onChangeText={onCambia}
          placeholder={marcador}
          placeholderTextColor={C.texto3}
          secureTextEntry={esClave && !visible}
          autoCapitalize={tipo === 'texto' ? 'words' : 'none'}
          autoCorrect={false}
          keyboardType={
            tipo === 'correo' ? 'email-address' : tipo === 'telefono' ? 'phone-pad' : 'default'
          }
          autoComplete={
            tipo === 'correo'
              ? 'email'
              : tipo === 'clave'
                ? 'password'
                : tipo === 'telefono'
                  ? 'tel'
                  : 'name'
          }
          style={{
            paddingHorizontal: E.md,
            paddingRight: esClave ? 44 : E.md,
            paddingVertical: 13,
            borderRadius: R.md,
            borderWidth: 1,
            borderColor: C.borde,
            backgroundColor: C.carta,
            color: C.texto,
            fontSize: 15,
          }}
        />
        {esClave ? (
          <Pulsable
            onPress={() => setVisible((v) => !v)}
            hitSlop={10}
            style={{ position: 'absolute', right: E.md }}
          >
            <Icono nombre={visible ? 'ojoCerrado' : 'ojo'} tam={18} color={C.texto3} />
          </Pulsable>
        ) : null}
      </View>
    </View>
  );
}

function BotonProveedor({
  proveedor,
  texto,
  icono,
  onEntra,
}: {
  proveedor: Proveedor;
  texto: string;
  icono: 'mundo' | 'usuario';
  onEntra: () => void;
}) {
  const [ocupado, setOcupado] = useState(false);

  const abre = async () => {
    const url = urlDeProveedor(proveedor, DESTINO);
    if (!url) return;

    /*
     * En el navegador se redirige esta misma pestaña.
     *
     * `openAuthSessionAsync` abre una pestaña nueva, y entonces Google devuelve
     * los tokens allí mientras la pestaña original se queda parada en la
     * pantalla de acceso, como si no hubiera pasado nada. Con una redirección
     * normal el usuario va a Google y vuelve aquí, a la misma página, que es
     * lo que espera cualquiera.
     */
    if (Platform.OS === 'web') {
      window.location.href = url;
      return;
    }

    setOcupado(true);
    try {
      const r = await WebBrowser.openAuthSessionAsync(url, DESTINO);
      if (r.type !== 'success' || !r.url) return;
      // Supabase devuelve los tokens en el fragmento de la dirección.
      const trozo = r.url.split('#')[1] ?? r.url.split('?')[1] ?? '';
      const params = new URLSearchParams(trozo);
      const acceso = params.get('access_token');
      if (!acceso) return;
      const s = await sesionDesdeTokens(acceso, params.get('refresh_token') ?? undefined);
      if (s) onEntra();
    } finally {
      setOcupado(false);
    }
  };

  return (
    <Pulsable
      onPress={abre}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: E.sm,
        paddingVertical: 14,
        borderRadius: R.md,
        borderWidth: 1,
        borderColor: C.borde,
        backgroundColor: C.carta,
      }}
    >
      {ocupado ? (
        <ActivityIndicator color={C.texto2} />
      ) : (
        <>
          {/* El logo de cada proveedor, no un icono cualquiera: es lo que la
              gente reconoce, y Google lo exige en su botón. */}
          {proveedor === 'google' ? (
            <LogoGoogle tam={22} />
          ) : proveedor === 'apple' ? (
            <LogoApple tam={22} />
          ) : (
            <Icono nombre={icono} tam={18} color={C.texto} />
          )}
          <Txt v="cuerpoFuerte">{texto}</Txt>
        </>
      )}
    </Pulsable>
  );
}

export default function Entrar() {
  const insets = useSafeAreaInsets();
  const { entra } = useSesion();

  const [modo, setModo] = useState<Modo>('crear');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirma, setConfirma] = useState(false);
  const [codigo, setCodigo] = useState('');

  const trasProveedor = async () => {
    const s = await sesionGuardada();
    if (s) entra(s);
  };

  const envia = async () => {
    setAviso(null);
    if (modo === 'crear') {
      if (nombre.trim().length < 3) return setAviso('Escribe tu nombre.');
      if (!acepta) {
        return setAviso('Para crear la cuenta hay que aceptar los términos y la privacidad.');
      }
    }
    if (!correo.includes('@')) return setAviso('Escribe un correo válido.');
    // Seis es el mínimo de Supabase; menos ni lo intenta.
    if (clave.length < 6) return setAviso('La contraseña necesita al menos 6 caracteres.');

    setOcupado(true);
    if (modo === 'crear') {
      const r = await registra(correo.trim(), clave, {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      });
      setOcupado(false);
      if (r.error) return setAviso(r.error);
      if (r.necesitaConfirmar) return setConfirma(true);
      if (r.sesion) entra(r.sesion);
      return;
    }

    const r = await entraConClave(correo.trim(), clave);
    setOcupado(false);
    if (r.error) return setAviso(r.error);
    if (r.sesion) entra(r.sesion);
  };

  const recuperar = async () => {
    if (!correo.includes('@')) return setAviso('Escribe tu correo y vuelve a tocar aquí.');
    const ok = await olvideLaClave(correo.trim(), DESTINO);
    setAviso(ok ? 'Te hemos enviado un correo para cambiar la contraseña.' : 'No se pudo enviar.');
  };

  if (confirma) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: C.fondo,
          paddingTop: insets.top + E.xxl,
          paddingHorizontal: E.lg,
          gap: E.lg,
        }}
      >
        <View style={{ alignItems: 'center', gap: E.sm }}>
          <Logo tam={44} />
          <Txt v="displayXL" style={{ textAlign: 'center', fontSize: 28 }}>
            ESCRIBE TU CÓDIGO
          </Txt>
          <Txt v="cuerpo" color={C.texto2} style={{ textAlign: 'center' }}>
            Te hemos enviado un código de 6 dígitos a {correo}.
          </Txt>
        </View>

        {/* Campo grande y espaciado: se teclea mirando el correo en otra
            ventana, y un código apretado se equivoca con facilidad. */}
        <TextInput
          value={codigo}
          onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={C.texto3}
          keyboardType="number-pad"
          maxLength={6}
          style={{
            paddingVertical: 16,
            borderRadius: R.md,
            borderWidth: 1,
            borderColor: C.borde,
            backgroundColor: C.carta,
            color: C.texto,
            fontSize: 30,
            letterSpacing: 10,
            textAlign: 'center',
          }}
        />

        {aviso ? (
          <Tarjeta style={{ padding: E.sm, borderColor: C.borde }}>
            <Txt v="pequeno" color={C.texto2}>
              {aviso}
            </Txt>
          </Tarjeta>
        ) : null}

        <Boton
          ancho
          texto={ocupado ? 'Comprobando…' : 'Confirmar'}
          onPress={async () => {
            setAviso(null);
            if (codigo.length !== 6) return setAviso('El código tiene 6 dígitos.');
            setOcupado(true);
            const r = await confirmaCodigo(correo.trim(), codigo);
            setOcupado(false);
            if (r.error) return setAviso(r.error);
            if (r.sesion) entra(r.sesion);
          }}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pulsable
            onPress={async () => {
              const ok = await reenviaCodigo(correo.trim());
              setAviso(ok ? 'Te hemos enviado otro código.' : 'No se pudo reenviar.');
            }}
          >
            <Txt v="pequeno" color={C.texto3}>
              Reenviar código
            </Txt>
          </Pulsable>
          <Pulsable onPress={() => { setConfirma(false); setCodigo(''); setAviso(null); }}>
            <Txt v="pequeno" color={C.lima}>
              Cambiar de correo
            </Txt>
          </Pulsable>
        </View>
      </View>
    );
  }

  return (
    /*
     * Con scroll: el formulario de registro son cuatro campos, la casilla de
     * términos, el botón y los dos proveedores. En un teléfono pequeño eso no
     * cabe en una pantalla, y sin scroll el botón de crear cuenta se quedaba
     * fuera sin manera de llegar a él.
     */
    <ScrollView
      style={{ flex: 1, backgroundColor: C.fondo }}
      contentContainerStyle={{
        paddingTop: insets.top + E.xl,
        paddingHorizontal: E.lg,
        gap: E.lg,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ alignItems: 'center', gap: E.sm }}>
        <Logo tam={42} />
        <Txt v="displayXL" style={{ textAlign: 'center', fontSize: 28 }}>
          {modo === 'crear' ? 'CREA TU CUENTA' : 'ENTRA EN GOLDEN'}
        </Txt>
        <Txt v="cuerpo" color={C.texto2} style={{ textAlign: 'center' }}>
          Tu cuenta guarda tus picks, tu rendimiento y las ligas que sigues, y los
          lleva a cualquier sitio donde entres.
        </Txt>
      </View>

      {/* Crear cuenta o entrar, en la misma pantalla. */}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: C.carta2,
          borderRadius: R.md,
          padding: 3,
        }}
      >
        {(['crear', 'entrar'] as const).map((m) => (
          <Pulsable
            key={m}
            onPress={() => { setModo(m); setAviso(null); }}
            /*
             * La opción activa, en verde lleno y con el texto oscuro encima.
             * Antes era gris sobre gris y no se veía cuál de las dos estaba
             * puesta: la gente escribía el correo creyendo que entraba y
             * acababa creando otra cuenta.
             */
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: R.sm,
              alignItems: 'center',
              backgroundColor: modo === m ? C.lima : 'transparent',
            }}
          >
            <Txt v="pequenoFuerte" color={modo === m ? C.fondo : C.texto3}>
              {m === 'crear' ? 'Crear cuenta' : 'Ya tengo cuenta'}
            </Txt>
          </Pulsable>
        ))}
      </View>

      <View style={{ gap: E.md }}>
        {/* El nombre y el teléfono solo al crear la cuenta: para entrar sobran. */}
        {modo === 'crear' ? (
          <Campo
            etiqueta="Nombre completo"
            valor={nombre}
            onCambia={setNombre}
            marcador="Juan Pérez"
          />
        ) : null}

        <Campo
          etiqueta="Email"
          valor={correo}
          onCambia={setCorreo}
          marcador="tucorreo@ejemplo.com"
          tipo="correo"
        />

        {modo === 'crear' ? (
          <Campo
            etiqueta="Teléfono"
            valor={telefono}
            onCambia={setTelefono}
            marcador="+593 99 000 0000"
            tipo="telefono"
          />
        ) : null}

        <Campo
          etiqueta="Contraseña"
          valor={clave}
          onCambia={setClave}
          marcador="Mínimo 6 caracteres"
          tipo="clave"
        />

        {/*
          La casilla de términos, y sin marcarla no se crea la cuenta.

          No es burocracia: la app cobra suscripciones y habla de apuestas, así
          que tiene que quedar constancia de que el usuario aceptó las
          condiciones y supo que esto es informativo, no una casa de apuestas.
        */}
        {modo === 'crear' ? (
          <Pulsable
            onPress={() => setAcepta((a) => !a)}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: E.sm }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                borderWidth: 1.5,
                borderColor: acepta ? C.lima : C.borde,
                backgroundColor: acepta ? C.lima : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              {acepta ? <Icono nombre="check" tam={13} color={C.fondo} /> : null}
            </View>
            <Txt v="pequeno" color={C.texto2} style={{ flex: 1 }}>
              He leído y acepto los{' '}
              <Txt v="pequeno" color={C.lima} onPress={() => router.push('/terminos')}>
                Términos de Uso
              </Txt>{' '}
              y la{' '}
              <Txt v="pequeno" color={C.lima} onPress={() => router.push('/privacidad')}>
                Política de Privacidad
              </Txt>{' '}
              de Golden Picks.
            </Txt>
          </Pulsable>
        ) : null}

        {aviso ? (
          <Tarjeta style={{ padding: E.sm, borderColor: C.borde }}>
            <Txt v="pequeno" color={C.texto2}>
              {aviso}
            </Txt>
          </Tarjeta>
        ) : null}

        <Boton
          ancho
          texto={ocupado ? 'Un momento…' : modo === 'crear' ? 'Crear cuenta →' : 'Iniciar sesión →'}
          onPress={envia}
        />

        {modo === 'entrar' ? (
          <Pulsable onPress={recuperar} style={{ alignItems: 'center', paddingTop: 4 }}>
            <Txt v="pequeno" color={C.texto3}>
              He olvidado mi contraseña
            </Txt>
          </Pulsable>
        ) : null}
      </View>

      {/*
        Los proveedores, debajo del formulario.

        Estaban arriba del todo, y con el formulario largo de registro eso deja
        el correo y el nombre fuera de la primera pantalla. Quien quiere entrar
        con Google lo encuentra igual; quien viene a escribir sus datos, los ve
        sin desplazarse.
      */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: E.md }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.bordeSuave }} />
        <Txt v="mini" color={C.texto3}>
          O CONTINÚA CON
        </Txt>
        <View style={{ flex: 1, height: 1, backgroundColor: C.bordeSuave }} />
      </View>

      <View style={{ gap: E.sm }}>
        <BotonProveedor
          proveedor="google"
          texto="Continuar con Google"
          icono="mundo"
          onEntra={trasProveedor}
        />
        {Platform.OS === 'ios' ? (
          <BotonProveedor
            proveedor="apple"
            texto="Continuar con Apple"
            icono="usuario"
            onEntra={trasProveedor}
          />
        ) : null}
      </View>

      <Pulsable
        onPress={() => { setModo(modo === 'crear' ? 'entrar' : 'crear'); setAviso(null); }}
        style={{ alignItems: 'center' }}
      >
        <Txt v="pequeno" color={C.texto3}>
          {modo === 'crear' ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
          <Txt v="pequeno" color={C.lima}>
            {modo === 'crear' ? 'Iniciar sesión' : 'Regístrate'}
          </Txt>
        </Txt>
      </Pulsable>

      <View style={{ alignItems: 'center', paddingBottom: insets.bottom + E.lg }}>
        <Insignia texto="SOLO MAYORES DE 18 AÑOS · CONTENIDO INFORMATIVO" />
      </View>
    </ScrollView>
  );
}
