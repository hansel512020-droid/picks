import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { casa as buscaCasa } from '@/datos/casas';
import { competicion } from '@/datos/competiciones';
import type { Pick, SujetoPick } from '@/datos/tipos';
import { useComunidad } from '@/estado/comunidad';
import { useDerechos } from '@/estado/derechos';
import { useTienda } from '@/estado/tienda';
import { usePartidoDelPick } from '@/estado/vivo';
import { C, E, R, T } from '@/tema';
import { Fuego, Insignia, Pulsable, Tarjeta, Txt } from './base';
import { Icono } from './iconos';
import { Cara, Enfrentamiento, Escudo, LogoCompeticion } from './imagen';

/**
 * La tarjeta de pick es la pieza central de la app: sujeto, argumento, mercado
 * con su cuota y la tira de los ultimos 10 partidos.
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
): { titulo: string; texto: string; color: string; fondo: string } {
  const corto = (aciertosL5 / 5) * 100;
  const medio = (aciertosL10 / 10) * 100;
  const largo = (aciertosL20 / 20) * 100;

  const fuerte = { titulo: 'HISTÓRICO FUERTE', color: C.verde, fondo: C.verdeTenue };
  const desigual = { titulo: 'HISTÓRICO DESIGUAL', color: C.ambar, fondo: C.ambarTenue };
  const flojo = { titulo: 'HISTÓRICO FLOJO', color: C.rojo, fondo: C.rojoTenue };

  if (corto >= 80 && medio >= 70 && largo >= 70)
    return { ...fuerte, texto: 'Le sale en las tres ventanas' };
  if (medio >= 70 && largo >= 65)
    return { ...fuerte, texto: 'Constante en los últimos 20 partidos' };
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
  racha,
  media,
  metrica,
  linea,
  sentido,
}: {
  aciertosL5: number;
  aciertosL10: number;
  aciertosL20: number;
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

  const ventanas = [
    { aciertos: aciertosL5, de: 5 },
    { aciertos: aciertosL10, de: 10 },
    { aciertos: aciertosL20, de: 20 },
  ];

  const lectura = lecturaDeAngulos(aciertosL5, aciertosL10, aciertosL20);

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
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: lectura.color }}
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
            <View
              style={{
                flex: 1,
                height: 7,
                borderRadius: 4,
                backgroundColor: C.carta2,
                overflow: 'hidden',
              }}
            >
              {/*
                La barra va del color del porcentaje, no en gris. Con el gris
                había que leer el número para saber si el dato era bueno; así el
                bloque entero se juzga de un vistazo y el número solo confirma.
              */}
              <View style={{ width: `${porcentaje}%`, height: '100%', backgroundColor: color }} />
            </View>
            <Text style={{ ...T.mini, color: C.texto2, width: 48, textAlign: 'right' }}>
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
        <View style={{ gap: 7, paddingTop: 2 }}>
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
              <View style={{ flexDirection: 'row', gap: 3 }}>
                {racha.map((acierto, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 3,
                      backgroundColor: acierto ? C.verde : C.rojo,
                    }}
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
        <Pulsable onPress={() => setAbierto((v) => !v)} hitSlop={8}>
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
      <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
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

/** Chip cuadrado con las siglas de la fuente del precio. */
export function SelloCasa({ casaId, tam = 18 }: { casaId: string; tam?: number }) {
  const c = buscaCasa(casaId);
  return (
    <View
      style={{
        paddingHorizontal: 4,
        height: tam,
        minWidth: tam,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.fondo,
      }}
    >
      <Text style={{ fontSize: tam * 0.46, fontWeight: '800', color: c.texto }}>{c.sigla}</Text>
    </View>
  );
}

/** Fila gris del mercado: nombre a la izquierda, cuota y casa a la derecha. */
export function FilaMercado({
  mercado,
  cuota,
  casaId,
  ventaja,
  bloqueado,
  precioReal,
}: {
  mercado: string;
  cuota: number;
  casaId: string;
  ventaja?: number;
  bloqueado?: boolean;
  /**
   * Si el precio viene de una cuota publicada. Cuando no, se dice: colgarle
   * el sello de una casa a un precio que ha puesto el modelo hace creer al
   * usuario que puede ir a esa casa y encontrarlo, y no es verdad.
   */
  precioReal?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: E.sm,
        backgroundColor: C.carta2,
        borderRadius: R.md,
        paddingHorizontal: E.md,
        paddingVertical: 11,
      }}
    >
      <Icono nombre={bloqueado ? 'candado' : 'grafico'} tam={15} color={C.texto3} />
      <Text
        numberOfLines={1}
        style={{ ...T.cuerpo, color: bloqueado ? C.texto3 : C.texto, flex: 1 }}
      >
        {/* Con el candado puesto tampoco se enseña el mercado: si se ve "Más de
            1.5 entradas" el pick ya está dado y Golden Pro no aporta nada. */}
        {bloqueado ? 'Mercado y precio con Golden Pro' : mercado}
      </Text>
      {ventaja !== undefined && !bloqueado ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Icono nombre="tendencia" tam={14} color={C.verde} />
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderWidth: 1,
          borderColor: C.borde,
          borderRadius: R.sm,
          paddingHorizontal: 8,
          paddingVertical: 5,
          backgroundColor: C.carta,
        }}
      >
        {bloqueado ? (
          <Icono nombre="candado" tam={13} color={C.texto3} />
        ) : (
          <Text style={{ ...T.cuerpoFuerte, color: C.lima }}>{cuota.toFixed(2)}</Text>
        )}
        {precioReal === false ? (
          <View
            style={{
              paddingHorizontal: 4,
              height: 18,
              minWidth: 18,
              borderRadius: 4,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.carta2,
              borderWidth: 1,
              borderColor: C.borde,
            }}
          >
            <Text style={{ fontSize: 8.5, fontWeight: '800', color: C.texto3 }}>EST</Text>
          </View>
        ) : (
          <SelloCasa casaId={casaId} />
        )}
      </View>
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
}: {
  imagen: string;
  tam?: number;
  nombres?: string[];
  sujeto?: SujetoPick;
}) {
  const trozos = Array.from(imagen);
  // Un emoji de bandera son dos code points: si hay mas, es un enfrentamiento.
  const dosBanderas = imagen.length > 4 && trozos.length > 2;
  const mitad = Math.ceil(trozos.length / 2);
  const banderas = dosBanderas
    ? [trozos.slice(0, mitad).join(''), trozos.slice(mitad).join('')]
    : [imagen];

  if (sujeto === 'jugador' && nombres?.[0]) {
    return <Cara nombre={nombres[0]} bandera={imagen} tam={tam} />;
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
  const { tieneAcceso } = useDerechos();
  const comunidad = useComunidad();
  const guardado = estaGuardado(pick.id);
  /*
   * El candado lo decide lo que el usuario tiene COMPRADO, consultado al
   * servidor, no un interruptor guardado en el teléfono. Antes miraba el plan
   * local: bastaba con haberlo activado una vez —o con editarlo desde la
   * consola del navegador— para abrir la app entera sin pagar.
   */
  const bloqueado = !!pick.pro && !tieneAcceso(pick.competicionId);

  // Si el partido se está jugando ahora, la tarjeta lo dice.
  const enVivo = usePartidoDelPick(pick);
  const jugando = enVivo?.estado === 'en_curso' || enVivo?.estado === 'descanso';

  // Con servidor detrás el número es real; sin él, el que estima el modelo.
  useEffect(() => {
    comunidad.pide([pick.id]);
  }, [comunidad, pick.id]);
  // Sin servidor de comunidad no hay número real que enseñar, así que se
  // usa el estimado del modelo; con servidor manda el recuento de verdad.
  const fuego = comunidad.cuenta(pick.id) ?? pick.fuego;

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
      style={{
        padding: 0,
        gap: 0,
        overflow: 'hidden',
        /*
         * Un pick cuyo partido se está jugando tiene que cantar: es el único
         * que se puede seguir minuto a minuto y el que más cambia de valor.
         * Borde rojo entero y fondo teñido, no un detalle de un píxel.
         */
        ...(jugando ? { borderColor: C.rojo, borderWidth: 1.5, backgroundColor: '#1A1315' } : null),
      }}
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
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' }} />
          <Text style={{ ...T.etiqueta, color: '#FFF' }}>
            EN VIVO · {enVivo?.estado === 'descanso' ? 'DESCANSO' : `${enVivo?.reloj ?? enVivo?.minuto ?? 0}'`}
          </Text>
          <View style={{ flex: 1 }} />
          <Text style={{ ...T.pequenoFuerte, color: '#FFF' }}>
            {enVivo?.golesLocal}-{enVivo?.golesVisitante}
          </Text>
        </View>
      ) : null}

      <View style={{ padding: E.md, gap: E.md }}>
      <Pulsable onPress={abrir} style={{ flexDirection: 'row', alignItems: 'center', gap: E.md }}>
        <Avatar imagen={pick.imagen} nombres={pick.nombres} sujeto={pick.sujeto} />
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
          <Fuego n={fuego} />
          {bloqueado ? <Insignia texto="PRO" color={C.lima} fondo={C.limaTenue} /> : null}
        </View>
        <Pulsable
          onPress={() => {
            vibra();
            if (bloqueado) {
              router.push('/pro');
            } else if (guardado) {
              quitar(pick.id);
              comunidad.resta(pick.id);
            } else {
              guardar(pick);
              comunidad.suma(pick.id, pick.competicionId);
            }
          }}
          hitSlop={8}
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: guardado ? C.limaTenue : C.carta2,
          }}
        >
          <Icono
            nombre={guardado ? 'guardado' : 'guardar'}
            tam={15}
            color={guardado ? C.lima : C.texto2}
          />
        </Pulsable>
      </Pulsable>

      <Pulsable onPress={abrir} style={{ gap: E.md }}>
        <Txt v="cuerpo" color={bloqueado ? C.texto3 : C.texto} numberOfLines={3}>
          {bloqueado
            ? 'Análisis disponible con Golden Pro. Desbloquea el argumento, el precio y la tendencia de los últimos 10 partidos.'
            : pick.argumento}
        </Txt>

        <FilaMercado
          mercado={pick.mercado}
          cuota={pick.cuota}
          casaId={pick.casa}
          ventaja={pick.ventaja}
          precioReal={pick.precioReal}
          bloqueado={bloqueado}
        />

        {!sinRacha && !bloqueado ? (
          <View style={{ gap: 8 }}>
            <Angulos
              aciertosL5={pick.aciertosL5}
              aciertosL10={pick.aciertosL10}
              aciertosL20={pick.aciertosL20}
              racha={pick.racha}
              media={pick.media}
              metrica={pick.metrica}
              linea={pick.linea}
              sentido={pick.sentido}
            />
            <Txt v="pequeno" color={C.texto3}>
              Últimos 5, 10 y 20 partidos · {pick.ventaja.toFixed(0)}% de ventaja según el modelo
            </Txt>
          </View>
        ) : null}
      </Pulsable>
      </View>
    </Tarjeta>
  );
}
