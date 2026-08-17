import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
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
          <View style={{ gap: 6 }}>
            <BarraL10 racha={pick.racha} porcentaje={pick.aciertosL10 * 10} />
            <Txt v="pequeno" color={C.texto3}>
              <Txt v="pequenoFuerte" color={C.lima}>
                {pick.aciertosL10 * 10}%
              </Txt>{' '}
              en los últimos 10 partidos · {pick.ventaja.toFixed(0)}% de ventaja
            </Txt>
          </View>
        ) : null}
      </Pulsable>
      </View>
    </Tarjeta>
  );
}
