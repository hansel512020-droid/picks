import { seJuegaAhora } from '@/datos/envivo';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { competicion } from '@/datos/competiciones';
import { esPickDelDia } from '@/datos/picks';
import type { Pick, SujetoPick } from '@/datos/tipos';
import { useComunidad } from '@/estado/comunidad';
import { useDerechos } from '@/estado/derechos';
import { useTienda } from '@/estado/tienda';
import { usePartidoDelPick, useProgresoEnVivo } from '@/estado/vivo';
import { C, E, R, T } from '@/tema';
import { Fuego, Insignia, Pulsable, Tarjeta, Txt } from './base';
import { Icono } from './iconos';
import { Cara, Enfrentamiento, Escudo, LogoCompeticion } from './imagen';
import { marca } from './movimiento';

/**
 * La tarjeta de pick es la pieza central de la app: sujeto, argumento, mercado
 * y la tira de los ultimos 10 partidos.
 */

/** Tira verde y roja con el resultado del pick en los ultimos 10 partidos. */
/**
 * Los tres ángulos de un pick: 5, 10 y 20 partidos, uno debajo de otro.
 *
 * La tarjeta enseñaba solo la racha de 10. Con una sola ventana no se sabe si
 * ese 70% viene de una racha buena de este mes o de algo que el jugador hace
 * toda la temporada, y esa diferencia es justo la que decide si el pick vale.
 * Con las tres a la vista se lee de un golpe: 5/5 y 17/20 es constancia; 5/5 y
 * 8/20 es una racha caliente sobre un fondo flojo.
 *
 * El color va por tramos y no en degradado porque lo que importa es el juicio
 * rápido —bien, regular, mal—, no distinguir un 71% de un 74%.
 */
/**
 * Qué dicen las tres ventanas juntas, en una frase.
 *
 * Tres porcentajes sueltos no se interpretan solos: hay que compararlos entre
 * sí para saber si esto es algo que el sujeto hace siempre o una racha de tres
 * semanas. Eso es trabajo que puede hacer la app, y si no lo hace lo acaba
 * haciendo mal quien mira.
 */
function lecturaDeAngulos(
  aciertosL5: number,
  aciertosL10: number,
  aciertosL20: number,
  /** Partidos reales de la ventana larga: no siempre son veinte. */
  deLarga: number,
): { titulo: string; texto: string; color: string; fondo: string } {
  const corto = (aciertosL5 / 5) * 100;
  const medio = (aciertosL10 / 10) * 100;
  const largo = (aciertosL20 / Math.max(1, deLarga)) * 100;

  const fuerte = { titulo: 'HISTÓRICO FUERTE', color: C.verde, fondo: C.verdeTenue };
  const desigual = { titulo: 'HISTÓRICO DESIGUAL', color: C.ambar, fondo: C.ambarTenue };
  const flojo = { titulo: 'HISTÓRICO FLOJO', color: C.rojo, fondo: C.rojoTenue };

  if (corto >= 80 && medio >= 70 && largo >= 70)
    return { ...fuerte, texto: 'Le sale en las tres ventanas' };
  if (medio >= 70 && largo >= 65)
    return { ...fuerte, texto: 'Constante en la muestra larga' };
  if (corto >= 80 && largo < 55)
    return { ...desigual, texto: 'En racha ahora, pero de fondo le cuesta' };
  if (corto < 50 && largo >= 70)
    return { ...desigual, texto: 'Lo hace de fondo, pero llega frío' };
  if (medio >= 70) return { ...desigual, texto: 'Bien de cerca, poca muestra de fondo' };
  if (medio < 50 && largo < 50) return { ...flojo, texto: 'No lo viene cumpliendo' };
  return { ...desigual, texto: 'Irregular entre unas ventanas y otras' };
}

export function Angulos({
  aciertosL5,
  aciertosL10,
  aciertosL20,
  muestraL20,
  racha,
  media,
  metrica,
  linea,
  sentido,
}: {
  aciertosL5: number;
  aciertosL10: number;
  aciertosL20: number;
  /** Cuantos partidos hay de verdad en la ventana larga. */
  muestraL20?: number;
  /** Los diez últimos, uno a uno. Solo al desplegar. */
  racha?: boolean[];
  media?: number;
  metrica?: string;
  linea?: number;
  /** Hacia dónde va el pick. Sin esto el margen sale del revés. */
  sentido?: 'mas' | 'menos' | 'si' | 'no';
}) {
  /*
   * Se abre a petición, no de entrada.
   *
   * Tres ventanas caben en una tarjeta de una lista; cinco cosas la convierten
   * en un muro y hacen que no se lea ninguna. Quien quiera mirar de cerca un
   * pick concreto lo despliega, y quien esté repasando veinte tarjetas no paga
   * por ello.
   */
  const [abierto, setAbierto] = useState(false);
  const hayExtra = !!racha?.length || media !== undefined;

  /*
   * La ventana larga dice cuántos partidos hay de verdad, no siempre veinte.
   *
   * Ponía "0 de 20" cuando la muestra eran diez, y "5 de 20" cuando eran
   * catorce: el porcentaje salía mal y el dato mentía por lo bajo. Un equipo
   * con doce partidos jugados no tiene veinte, y decir que sí no lo arregla.
   */
  const largo = muestraL20 && muestraL20 > 0 ? Math.min(20, muestraL20) : 20;

  const ventanas = [
    { aciertos: aciertosL5, de: 5 },
    { aciertos: aciertosL10, de: 10 },
    { aciertos: aciertosL20, de: largo },
  ];

  const lectura = lecturaDeAngulos(aciertosL5, aciertosL10, aciertosL20, largo);

  return (
    <View style={{ gap: 7 }}>
      {/*
        El veredicto primero, en palabras.

        Debajo iban tres porcentajes y nada más, y quien mira tiene que
        compararlos entre sí para saber si esto es algo que el sujeto hace
        siempre o una racha de tres semanas. Ese trabajo lo puede hacer la app,
        y si no lo hace lo acaba haciendo mal el que mira.

        Habla del pasado a propósito —"histórico fuerte", no "va a entrar"—:
        veinte partidos buenos no deciden el que viene.
      */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 6,
          paddingHorizontal: 8,
          borderRadius: R.sm,
          backgroundColor: lectura.fondo,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: lectura.color,
            boxShadow: `0 0 8px ${lectura.color}`,
          }}
        />
        <Text style={{ ...T.mini, color: lectura.color, fontWeight: '800' }}>
          {lectura.titulo}
        </Text>
        <Text style={{ ...T.mini, color: C.texto2, flex: 1 }} numberOfLines={1}>
          {lectura.texto}
        </Text>
      </View>

      {ventanas.map(({ aciertos, de }) => {
        const porcentaje = Math.round((aciertos / de) * 100);
        const color = porcentaje >= 70 ? C.verde : porcentaje >= 50 ? C.ambar : C.rojo;
        return (
          <View key={de} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/*
              "Últimos 10" y no "7/10" a secas: el número suelto no dice de qué
              habla, y había tres filas de números sueltos uno encima de otro.
              El recuento va donde tiene sentido, pegado a su porcentaje.
            */}
            <Text style={{ ...T.mini, color: C.texto2, width: 64 }}>Últimos {de}</Text>
            <View style={est.carril}>
              {/*
                La barra va del color del porcentaje, no en gris. Con el gris
                había que leer el número para saber si el dato era bueno; así el
                bloque entero se juzga de un vistazo y el número solo confirma.
              */}
              <View
                {...marca('crece')}
                style={[est.relleno, { width: `${porcentaje}%`, backgroundColor: color }]}
              />
            </View>
            {/* Sin partir: "10 de 10" en dos líneas descuadra la fila entera. */}
            <Text
              numberOfLines={1}
              style={{ ...T.mini, color: C.texto2, minWidth: 56, textAlign: 'right' }}
            >
              {aciertos} de {de}
            </Text>
            <Text
              style={{ ...T.pequenoFuerte, color, width: 40, textAlign: 'right' }}
            >
              {porcentaje}%
            </Text>
          </View>
        );
      })}

      {hayExtra && abierto ? (
        <View {...marca('despliega')} style={{ gap: 7, paddingTop: 2 }}>
          {racha?.length ? (
            <View style={{ gap: 4 }}>
              {/*
                "Uno a uno" a secas no dice qué son esas barritas ni qué
                significa el color. Se explica: es el orden de los partidos, del
                más viejo al más reciente, y el color dice si el pick habría
                entrado en cada uno.
              */}
              <Text style={{ ...T.pequeno, color: C.texto2 }}>
                Partido a partido, del más antiguo al más reciente
              </Text>
              <View {...marca('crece')} style={{ flexDirection: 'row', gap: 3 }}>
                {racha.map((acierto, i) => (
                  <View
                    key={i}
                    style={[est.segmento, { backgroundColor: acierto ? C.verde : C.rojo }]}
                  />
                ))}
              </View>
              <Text style={{ ...T.mini, color: C.texto2 }}>
                Verde: se habría cumplido · Rojo: no
              </Text>
            </View>
          ) : null}

          {media !== undefined && linea !== undefined ? (
            (() => {
              /*
               * El margen, siempre a favor del pick.
               *
               * En un "menos de 14.5" una media de 13 es holgura, no déficit.
               * Se restaba sin mirar el sentido y salía "−1.5" en rojo justo
               * cuando el dato era bueno: el color decía lo contrario que el
               * número, y el número lo contrario que la realidad.
               */
              const aFavor =
                sentido === 'menos' || sentido === 'no' ? linea - media : media - linea;

              /*
               * El margen, en color, igual que los porcentajes.
               *
               * Se mide contra la línea y no en bruto: sobrarle 0,5 en una
               * línea de 0,5 es el doble de lo que hace falta, y sobrarle 0,5
               * en una de 14,5 es ir pegado. El mismo número, dos situaciones
               * distintas, y sin dividir no se distinguen.
               */
              const holgura = linea > 0 ? aFavor / linea : aFavor;
              const colorMargen = holgura >= 0.25 ? C.verde : holgura > 0.05 ? C.ambar : C.rojo;
              const juicio =
                holgura >= 0.25 ? 'margen holgado' : holgura > 0.05 ? 'va justo' : 'sin margen';

              return (
                <View style={{ gap: 3 }}>
                  {/*
                    Se leía en gris casi invisible y era el dato más útil de
                    todo el bloque: si el margen contra la línea es holgado, un
                    partido flojo no tumba el pick.
                  */}
                  <Text style={{ ...T.pequeno, color: C.texto2 }}>
                    Media: {media.toFixed(1)} por partido · la línea está en {linea}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 5,
                      paddingHorizontal: 8,
                      borderRadius: R.sm,
                      backgroundColor:
                        colorMargen === C.verde
                          ? C.verdeTenue
                          : colorMargen === C.ambar
                            ? C.ambarTenue
                            : C.rojoTenue,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colorMargen,
                      }}
                    />
                    <Text style={{ ...T.pequenoFuerte, color: colorMargen }}>
                      {aFavor > 0
                        ? `Le sobran ${aFavor.toFixed(1)} — ${juicio}`
                        : `Le faltan ${Math.abs(aFavor).toFixed(1)} para la línea`}
                    </Text>
                  </View>
                </View>
              );
            })()
          ) : null}
        </View>
      ) : null}

      {hayExtra ? (
        <Pulsable onPress={() => setAbierto((v) => !v)} hitSlop={8} plano>
          <Text style={{ ...T.pequenoFuerte, color: C.lima }}>
            {abierto ? '▴  Ver menos' : '▾  Ver 2 ángulos más'}
          </Text>
        </Pulsable>
      ) : null}
    </View>
  );
}

export function BarraL10({
  racha,
  porcentaje,
  etiqueta = 'L10',
  compacta,
}: {
  racha: boolean[];
  porcentaje: number;
  etiqueta?: string;
  compacta?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View
        style={{
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: R.xs,
          backgroundColor: C.carta2,
          minWidth: 30,
          alignItems: 'center',
        }}
      >
        <Text style={{ ...T.etiqueta, color: C.texto3 }}>{etiqueta}</Text>
      </View>
      <View {...marca('crece')} style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
        {racha.map((acierto, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: compacta ? 4 : 5,
              borderRadius: 3,
              backgroundColor: acierto ? C.acierto : C.fallo,
            }}
          />
        ))}
      </View>
      <Text style={{ ...T.pequenoFuerte, color: C.texto2, minWidth: 34, textAlign: 'right' }}>
        {Math.round(porcentaje)}%
      </Text>
    </View>
  );
}

/**
 * La confianza del modelo como un anillo que se llena.
 *
 * Era una etiqueta pequeña con el número, y es el dato que decide si alguien
 * se fija en un pick: el anillo se ve de reojo y el número va dentro.
 */
export function AnilloConfianza({ valor, tam = 42 }: { valor: number; tam?: number }) {
  const alta = valor >= 0.7;
  const color = alta ? C.acierto : C.ambar;
  const grosor = 3.5;
  const radio = (tam - grosor) / 2;
  const vuelta = 2 * Math.PI * radio;
  const parte = Math.max(0, Math.min(1, valor));
  return (
    <View style={{ width: tam, height: tam, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={tam} height={tam} style={{ position: 'absolute' }}>
        <Circle
          cx={tam / 2}
          cy={tam / 2}
          r={radio}
          stroke={C.carta2}
          strokeWidth={grosor}
          fill="none"
        />
        <Circle
          cx={tam / 2}
          cy={tam / 2}
          r={radio}
          stroke={color}
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${vuelta * parte} ${vuelta}`}
          // Empieza arriba, como un reloj, y no a la derecha.
          transform={`rotate(-90 ${tam / 2} ${tam / 2})`}
          fill="none"
        />
      </Svg>
      <Text {...marca('titular')} style={{ fontSize: tam * 0.27, fontWeight: '700', color }}>
        {Math.round(parte * 100)}%
      </Text>
    </View>
  );
}

/**
 * Fila gris del mercado: lo que dice el pick, con el candado si no está abierto.
 *
 * Aquí iba también la cuota con el sello de la casa que la publicaba. Fuera: la
 * app es de análisis y estadísticas, y no enseña precios ni casas de apuestas.
 */
export function FilaMercado({ mercado, bloqueado }: { mercado: string; bloqueado?: boolean }) {
  return (
    <View style={[est.mercado, bloqueado ? null : est.mercadoAbierto]}>
      {/* Una barrita lima en el canto: la fila del mercado es lo que se juega,
          y tiene que distinguirse del texto de alrededor. */}
      {bloqueado ? null : <View style={est.acento} />}
      <Icono
        nombre={bloqueado ? 'candado' : 'grafico'}
        tam={15}
        color={bloqueado ? C.texto3 : C.lima}
      />
      <Text
        numberOfLines={1}
        style={{
          ...(bloqueado ? T.cuerpo : T.cuerpoFuerte),
          color: bloqueado ? C.texto3 : C.texto,
          flex: 1,
        }}
      >
        {/* Con el candado puesto tampoco se enseña el mercado: si se ve "Más de
            1.5 entradas" el pick ya está dado y Golden Pro no aporta nada. */}
        {bloqueado ? 'Disponible con Golden Pro' : mercado}
      </Text>
      {bloqueado ? (
        <View style={est.precio}>
          <Icono nombre="candado" tam={13} color={C.texto3} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Imagen de un pick: la cara del jugador, el escudo del equipo o los dos
 * escudos del enfrentamiento. Si no hay imagen resuelta cae en la bandera.
 */
export function Avatar({
  imagen,
  tam = 38,
  nombres,
  sujeto,
  equipo,
}: {
  imagen: string;
  tam?: number;
  nombres?: string[];
  sujeto?: SujetoPick;
  /** El club del jugador: sin foto se enseña su escudo, no una bandera. */
  equipo?: string;
}) {
  const trozos = Array.from(imagen);
  // Un emoji de bandera son dos code points: si hay mas, es un enfrentamiento.
  const dosBanderas = imagen.length > 4 && trozos.length > 2;
  const mitad = Math.ceil(trozos.length / 2);
  const banderas = dosBanderas
    ? [trozos.slice(0, mitad).join(''), trozos.slice(mitad).join('')]
    : [imagen];

  if (sujeto === 'jugador' && nombres?.[0]) {
    return <Cara nombre={nombres[0]} bandera={imagen} equipo={equipo} tam={tam} />;
  }
  if (sujeto === 'equipo' && nombres?.[0]) {
    return <Escudo nombre={nombres[0]} bandera={imagen} tam={tam} />;
  }
  if (nombres?.length === 2) {
    return (
      <Enfrentamiento
        tam={tam}
        local={{ nombre: nombres[0], bandera: banderas[0] }}
        visitante={{ nombre: nombres[1], bandera: banderas[1] ?? banderas[0] }}
      />
    );
  }

  if (!dosBanderas) {
    return (
      <View
        style={{
          width: tam,
          height: tam,
          borderRadius: tam / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: C.carta2,
          borderWidth: 1,
          borderColor: C.borde,
          overflow: 'hidden',
        }}
      >
        <Text style={{ fontSize: tam * 0.55 }}>{imagen}</Text>
      </View>
    );
  }
  return (
    <View style={{ width: tam + 8, height: tam, justifyContent: 'center' }}>
      {banderas.map((bandera, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: i * (tam * 0.42),
            width: tam * 0.72,
            height: tam * 0.72,
            top: tam * 0.14,
            borderRadius: tam * 0.36,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.carta2,
            borderWidth: 1.5,
            borderColor: C.carta,
            overflow: 'hidden',
          }}
        >
          <Text style={{ fontSize: tam * 0.42 }}>{bandera}</Text>
        </View>
      ))}
    </View>
  );
}

function vibra() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Cómo se llama en castellano lo que cuenta cada línea, en singular y en
 * plural. Las dos formas porque el contador dice números de verdad y "necesita
 * 1 goles" canta: el texto en vivo es lo que más se lee de la tarjeta.
 */
const NOMBRE_METRICA: Record<string, [uno: string, varios: string]> = {
  goles: ['gol', 'goles'],
  golesTotales: ['gol', 'goles'],
  asistencias: ['asistencia', 'asistencias'],
  remates: ['remate', 'remates'],
  rematesPuerta: ['remate a puerta', 'remates a puerta'],
  rematesTotales: ['remate', 'remates'],
  corners: ['córner', 'córners'],
  cornersTotales: ['córner', 'córners'],
  tarjetas: ['tarjeta', 'tarjetas'],
  tarjetasTotales: ['tarjeta', 'tarjetas'],
  amarillas: ['amarilla', 'amarillas'],
  faltasCometidas: ['falta', 'faltas'],
  faltasRecibidas: ['falta recibida', 'faltas recibidas'],
  paradas: ['parada', 'paradas'],
  golesPrimeraParte: ['gol en el primer tiempo', 'goles en el primer tiempo'],
};

const nombra = (n: number, metrica?: string) => {
  const par = NOMBRE_METRICA[metrica ?? ''];
  if (!par) return '';
  return n === 1 ? par[0] : par[1];
};

/**
 * El contador en vivo de un pick: lo que lleva contra lo que le hace falta.
 *
 * La franja roja dice el minuto y el marcador, pero un pick de "más de 1.5
 * remates" no se sigue con el marcador: hace falta el acta. Esto es lo que
 * convierte la tarjeta en algo que se mira durante el partido y no solo antes.
 *
 * El tope y el objetivo se sacan de la línea, que siempre es de media: para
 * "más de 1.5" hacen falta 2, y para "menos de 2.5" el tope son 2. Se dice en
 * números enteros porque nadie mete medio gol.
 */
export function MarchaEnVivo({
  marcha,
  grande,
}: {
  marcha: { valor: number; linea: number; sentido: 'mas' | 'menos'; metrica?: string; cumplido: boolean; roto: boolean };
  grande?: boolean;
}) {
  // El hándicap ya se lee en el marcador, y "lleva 1 de −0.5" no se entiende.
  if (marcha.metrica === 'handicap') return null;

  const mas = marcha.sentido === 'mas';
  /*
   * "Ambos marcan" no se cuenta: o han marcado los dos o no. Un "Lleva 0 ·
   * necesita 1" no diría nada; se dice cómo está.
   */
  if (marcha.metrica === 'ambosMarcan') {
    const color = marcha.cumplido ? C.acierto : marcha.roto ? C.fallo : C.texto2;
    const texto = marcha.cumplido
      ? '¡Cumplido! Ya han marcado los dos'
      : marcha.roto
        ? 'Se cayó: ya han marcado los dos'
        : mas
          ? 'Falta que marquen los dos'
          : 'De momento no han marcado los dos';
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {marcha.cumplido || marcha.roto ? (
          <Icono
            nombre={marcha.cumplido ? 'check' : 'cruz'}
            tam={grande ? 14 : 12}
            color={color}
            grosor={2.6}
          />
        ) : null}
        <Txt v={grande ? 'pequenoFuerte' : 'mini'} color={color}>
          {texto}
        </Txt>
      </View>
    );
  }
  const meta = mas ? Math.ceil(marcha.linea) : Math.floor(marcha.linea);
  const parte = meta > 0 ? Math.min(1, marcha.valor / meta) : marcha.valor > 0 ? 1 : 0;
  const lleva = `Lleva ${marcha.valor} ${nombra(marcha.valor, marcha.metrica)}`.trim();

  const color = marcha.cumplido ? C.acierto : marcha.roto ? C.fallo : C.texto2;
  const texto = marcha.cumplido
    ? `¡Cumplido! ${lleva}`
    : marcha.roto
      ? `Se pasó: ${lleva}`
      : mas
        ? `${lleva} · necesita ${meta}`
        : `${lleva} · el tope es ${meta}`;

  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {marcha.cumplido || marcha.roto ? (
          <Icono
            nombre={marcha.cumplido ? 'check' : 'cruz'}
            tam={grande ? 14 : 12}
            color={color}
            grosor={2.6}
          />
        ) : null}
        <Text style={{ ...(grande ? T.cuerpoFuerte : T.pequenoFuerte), color, flex: 1 }}>
          {texto}
        </Text>
      </View>
      {/*
        La barra se llena con lo que lleva. En un "menos de" es al revés de lo
        que parece: llenarla es malo, porque es el presupuesto que se gasta.
      */}
      <View
        style={{
          height: grande ? 8 : 5,
          borderRadius: 4,
          backgroundColor: C.carta2,
          overflow: 'hidden',
        }}
      >
        <View
          {...marca('ancho')}
          style={{
            width: `${Math.round(parte * 100)}%`,
            height: '100%',
            backgroundColor: marcha.cumplido
              ? C.acierto
              : marcha.roto
                ? C.fallo
                : mas
                  ? C.lima
                  : C.ambar,
          }}
        />
      </View>
    </View>
  );
}

export function TarjetaPick({
  pick,
  onPress,
  sinRacha,
}: {
  pick: Pick;
  onPress?: () => void;
  sinRacha?: boolean;
}) {
  const { estaGuardado, guardar, quitar } = useTienda();
  const comunidad = useComunidad();
  const guardado = estaGuardado(pick.id);
  /*
   * El candado ya viene decidido del servidor.
   *
   * Aquí se miraba lo comprado, se comprobaba si era el pick del día y se
   * tapaba la tarjeta en consecuencia. Pero el contenido estaba igualmente en
   * el teléfono: tapar es una decisión de pintura, y quien supiera mirar lo
   * tenía. Ahora el servidor manda enteros los picks que te tocan y vaciados
   * los que no, y marca cuáles son cuáles: `pro` significa "esto te llegó
   * vacío". Sin contenido que enseñar no hay nada que tapar.
   */
  const bloqueado = !!pick.pro;

  // Si el partido se está jugando ahora, la tarjeta lo dice.
  const enVivo = usePartidoDelPick(pick);
  const jugando = seJuegaAhora(enVivo?.estado);
  /*
   * Y cómo va el pick en ese partido. No se pide con el candado puesto: el
   * contador dice de qué va la línea ("lleva 3, necesita 2 remates") y eso es
   * justo lo que el muro tapa.
   */
  const marcha = useProgresoEnVivo(pick, !bloqueado);

  useEffect(() => {
    comunidad.pide([pick.id]);
  }, [comunidad, pick.id]);
  /*
   * Guardados de verdad y solo eso.
   *
   * Antes el generador inventaba un número —una fórmula con azar dentro— y se
   * enseñaba el mayor de los dos "para que la tarjeta no se viera apagada". El
   * efecto real era otro: como casi ningún pick tenía guardados, lo que veía
   * todo el mundo era siempre el inventado, y nunca se movía por mucho que la
   * gente guardara. Eso es prueba social falsa, y encima se nota: un contador
   * que no cambia delata que no cuenta nada.
   *
   * Ahora la llama sale cuando alguien ha guardado de verdad. Al principio se
   * verá en pocas tarjetas; las que la lleven dirán la verdad.
   */
  const fuego = comunidad.cuenta(pick.id) ?? 0;

  /*
   * Cuántas veces se ha tocado el marcador en esta tarjeta. Solo sirve para
   * que el icono rebote al tocarlo: cambia la `key` y la animación vuelve a
   * empezar. Arranca en cero para que al pintar la lista no rebote nada.
   */
  const [toques, setToques] = useState(0);

  const alternarGuardado = () => {
    vibra();
    setToques((n) => n + 1);
    if (bloqueado) {
      router.push('/pro');
    } else if (guardado) {
      quitar(pick.id);
      comunidad.resta(pick.id);
    } else {
      guardar(pick);
      comunidad.suma(pick.id, pick.competicionId);
    }
  };

  const abrir = () => {
    if (bloqueado) {
      router.push('/pro');
      return;
    }
    if (onPress) onPress();
    else {
      // El id del partido va explicito: deducirlo del id del pick solo funciona
      // con los datos generados, no con los importados.
      router.push(
        `/pick/${encodeURIComponent(pick.id)}?comp=${pick.competicionId}` +
          `&partido=${encodeURIComponent(pick.partidoId)}`,
      );
    }
  };

  return (
    <Tarjeta
      interactiva
      vivo={jugando}
      style={[
        est.tarjeta,
        /*
         * Un pick cuyo partido se está jugando tiene que cantar: es el único
         * que se puede seguir minuto a minuto y el que más cambia de valor.
         * Borde rojo entero y fondo teñido, no un detalle de un píxel.
         */
        jugando ? est.tarjetaVivo : null,
      ]}
    >
      {jugando ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: E.md,
            paddingVertical: 6,
            backgroundColor: C.rojo,
          }}
        >
          <View
            {...marca('latido')}
            style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' }}
          />
          <Text style={{ ...T.etiqueta, color: '#FFF' }}>
            EN VIVO · {enVivo?.estado === 'descanso' ? 'DESCANSO' : `${enVivo?.reloj ?? enVivo?.minuto ?? 0}'`}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ ...T.pequenoFuerte, color: '#FFF' }}>
            {enVivo?.golesLocal}-{enVivo?.golesVisitante}
          </Text>
        </View>
      ) : null}

      {/*
        Debajo de la franja, cómo va este pick concreto. Es la diferencia entre
        "el partido va 1-0" y "tu pick lleva 3 de los 2 remates que pedía".
      */}
      {marcha ? (
        <View
          style={{
            paddingHorizontal: E.md,
            paddingTop: 8,
            paddingBottom: 2,
            backgroundColor: C.cartaVivo,
          }}
        >
          <MarchaEnVivo marcha={marcha} />
        </View>
      ) : null}

      <View style={{ padding: E.md, gap: E.md }}>
      <Pulsable onPress={abrir} plano style={est.cabecera}>
        {/*
          Un aro alrededor de la cara o el escudo, lima cuando el histórico es
          fuerte. Solo en los redondos: en un partido van dos escudos montados
          y un aro alrededor no encaja.
        */}
        {pick.sujeto === 'partido' ? (
          <Avatar imagen={pick.imagen} nombres={pick.nombres} sujeto={pick.sujeto} />
        ) : (
          <View style={[est.aro, !bloqueado && pick.probabilidad >= 0.7 ? est.aroFuerte : null]}>
            <Avatar
              imagen={pick.imagen}
              nombres={pick.nombres}
              sujeto={pick.sujeto}
              equipo={pick.equipo}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          {/* Un pick de partido lleva los dos clubes enteros en el título y no
              cabe con el cuerpo grande: se baja un escalón para que entre. Un
              nombre de jugador sí cabe, y ahí se mantiene el tamaño.

              Al lado del jugador va su club, con escudo: el nombre solo no
              dice de quién se habla, y menos en una lista que mezcla treinta
              competiciones. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {/* El nombre cede sitio al club, no al revés: si "Brynjólfur
                Willumsson" no cabe entero se corta él, porque saber de qué
                equipo es importa tanto como el apellido. El club va en cuerpo
                pequeño y con un tope de ancho para que siempre entre. */}
            {/* Con el club al lado hay que repartir el ancho, así que el
                nombre baja un escalón: "Brynjólfur Willumsson" entero vale
                más que un tipo grande cortado en "Brynjólfur W…". Sin club
                (equipo o partido) se queda el tamaño de siempre. */}
            <Txt
              v={pick.sujeto === 'partido' || pick.equipo ? 'cuerpoFuerte' : 'subtitulo'}
              titular
              numberOfLines={1}
              style={{ flexShrink: 1, minWidth: 40 }}
            >
              {pick.titulo}
            </Txt>
            {pick.equipo ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0,
                  maxWidth: '46%',
                }}
              >
                <Escudo nombre={pick.equipo} tam={14} />
                <Txt v="mini" color={C.texto2} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {pick.equipo}
                </Txt>
              </View>
            ) : null}
          </View>
          {/* La competición va con el partido: mirando "Todas" o la portada,
              sin ella no se sabe si el Alavés–Getafe es de Liga o de Copa. */}
          {/* Esta línea no cambia porque el partido esté en juego: es donde
              se lee de qué club es el jugador, y eso hace falta siempre. El
              minuto y el marcador van arriba, en la franja roja. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <LogoCompeticion
              competicionId={pick.competicionId}
              bandera={competicion(pick.competicionId).bandera}
              tam={12}
              cuadrado
            />
            <Txt v="pequeno" color={C.texto3} numberOfLines={1} style={{ flex: 1 }}>
              {competicion(pick.competicionId).corto} ·{' '}
              {(() => {
                /*
                 * En un pick de partido el título ya es "Blooming vs Aurora",
                 * así que repetirlo aquí no aporta nada: se deja solo la hora.
                 * En los de jugador y equipo sí hace falta el enfrentamiento,
                 * porque el título es el nombre del sujeto.
                 *
                 * Y con el partido en juego la hora de comienzo sobra: eso ya
                 * lo cuenta la franja roja con el minuto de verdad.
                 */
                const [quien, cuando] = pick.contexto.split('•').map((x) => x.trim());
                if (pick.sujeto === 'partido') return jugando ? 'En juego' : cuando;
                return jugando ? quien : pick.contexto;
              })()}
            </Txt>
          </View>
        </View>
        {/*
          El contador de guardados sale también en los picks bloqueados.
          Antes la insignia PRO lo sustituía, y la tarjeta de pago se quedaba
          muda justo donde más falta hace: saber que otros cuarenta lo están
          guardando es el mejor argumento para desbloquearlo. `Fuego` no pinta
          nada cuando no hay guardados, así que no ensucia las tarjetas vacías.
        */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {/*
            La confianza del modelo, en la propia tarjeta.

            Estaba solo dentro de la ficha, en una fila de texto, y es EL dato
            que decide si alguien se fija en un pick o pasa de largo. Aquí se ve
            sin abrir nada. Verde a partir del 70%, ámbar por debajo: un 55% no
            merece el mismo color que un 80%.
          */}
          {bloqueado ? null : <AnilloConfianza valor={pick.probabilidad} />}
          {/*
            La llama guarda y desguarda, igual que el marcador de la derecha:
            es lo que la gente intenta hacer al verla, y antes no hacía nada.
          */}
          <Pulsable onPress={alternarGuardado} hitSlop={6}>
            <Fuego n={fuego} />
          </Pulsable>
          {bloqueado ? <Insignia texto="PRO" color={C.lima} fondo={C.limaTenue} /> : null}
        </View>
        <Pulsable
          onPress={alternarGuardado}
          hitSlop={8}
          style={[est.guardar, guardado ? est.guardarActivo : null]}
        >
          <View key={toques} {...marca(toques > 0 && 'pop')}>
            <Icono
              nombre={guardado ? 'guardado' : 'guardar'}
              tam={15}
              color={guardado ? C.lima : C.texto2}
            />
          </View>
        </Pulsable>
      </Pulsable>

      <Pulsable onPress={abrir} plano style={{ gap: E.md }}>
        <Txt v="cuerpo" color={bloqueado ? C.texto3 : C.texto} numberOfLines={3}>
          {bloqueado
            ? 'Análisis disponible con Golden Pro. Desbloquea el argumento y la tendencia de los últimos 10 partidos.'
            : pick.argumento}
        </Txt>

        <FilaMercado mercado={pick.mercado} bloqueado={bloqueado} />

        {!sinRacha && !bloqueado ? (
          <View style={{ gap: 8 }}>
            <Angulos
              aciertosL5={pick.aciertosL5}
              aciertosL10={pick.aciertosL10}
              aciertosL20={pick.aciertosL20}
              muestraL20={pick.muestraL20}
              racha={pick.racha}
              media={pick.media}
              metrica={pick.metrica}
              linea={pick.linea}
              sentido={pick.sentido}
            />
            {/*
              Aquí ponía "X% de ventaja según el modelo". Fuera: esa ventaja se
              medía contra un precio que pone el propio modelo, así que no era
              valor sobre el mercado sino coherencia consigo mismo. Queda lo que
              sí se sostiene: cuántas veces ha pasado esto en los últimos 5, 10
              y 20 partidos.
            */}
            <Txt v="pequeno" color={C.texto3}>
              Últimos 5, 10 y 20 partidos
            </Txt>
          </View>
        ) : null}
      </Pulsable>
      </View>
    </Tarjeta>
  );
}

/*
 * Lo fijo de la tarjeta, compilado una vez.
 *
 * Es la pieza que más se repite de la app —una lista entera de ellas— y en la
 * web cada estilo escrito en línea se traduce a CSS al montarse. Así se
 * traduce al arrancar y cada tarjeta solo reparte clases.
 */
const est = StyleSheet.create({
  tarjeta: { padding: 0, gap: 0, overflow: 'hidden' },
  tarjetaVivo: {
    borderColor: C.rojo,
    borderTopColor: C.rojo,
    borderWidth: 1.5,
    backgroundColor: C.cartaVivo,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: E.md },
  aro: { padding: 2, borderRadius: 999, borderWidth: 1.5, borderColor: C.borde },
  aroFuerte: { borderColor: C.limaBorde, boxShadow: '0 0 14px -2px rgba(201,255,61,0.45)' },
  guardar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.carta2,
  },
  guardarActivo: { backgroundColor: C.limaTenue, boxShadow: '0 0 14px rgba(201,255,61,0.30)' },
  mercado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: E.sm,
    backgroundColor: C.carta2,
    borderRadius: R.md,
    paddingHorizontal: E.md,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  mercadoAbierto: { borderWidth: 1, borderColor: C.borde, borderTopColor: C.bordeLuz },
  acento: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    backgroundColor: C.lima,
  },
  precio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: R.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: C.carta,
  },
  carril: { flex: 1, height: 7, borderRadius: 4, backgroundColor: C.carta2, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 4 },
  segmento: { flex: 1, height: 8, borderRadius: 3 },
});
