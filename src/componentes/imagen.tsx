import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { caraJugador, escudoEquipo, logoCompeticion } from '@/datos/imagenes';
import { C, T } from '@/tema';

/**
 * Escudos, logos y caras. Todas piden la imagen a la red y, mientras no
 * llega o si no existe, ensenan el respaldo de siempre: la bandera o las
 * siglas sobre el color del equipo. Nunca se queda un hueco vacio.
 */

const TRANSICION = 180;

function Redondo({
  tam,
  fondo,
  borde,
  children,
  estilo,
}: {
  tam: number;
  fondo?: string;
  borde?: string;
  children: React.ReactNode;
  estilo?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          width: tam,
          height: tam,
          borderRadius: tam / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: fondo ?? C.carta2,
          borderWidth: borde ? 1.5 : 1,
          borderColor: borde ?? C.borde,
          overflow: 'hidden',
        },
        estilo,
      ]}
    >
      {children}
    </View>
  );
}

/** Escudo de un equipo, con respaldo a la bandera o a las siglas. */
export function Escudo({
  nombre,
  id,
  bandera,
  corto,
  color,
  tam = 38,
  estilo,
}: {
  nombre: string;
  /** El identificador del equipo. Distingue a dos clubes que se llaman igual. */
  id?: string;
  bandera?: string;
  corto?: string;
  color?: string;
  tam?: number;
  estilo?: StyleProp<ViewStyle>;
}) {
  const url = escudoEquipo(nombre, id);
  const [falla, setFalla] = useState(false);

  if (url && !falla) {
    return (
      <Redondo tam={tam} fondo={C.carta2} borde={color} estilo={estilo}>
        <Image
          source={{ uri: url }}
          style={{ width: tam * 0.76, height: tam * 0.76 }}
          contentFit="contain"
          transition={TRANSICION}
          onError={() => setFalla(true)}
          cachePolicy="disk"
        />
      </Redondo>
    );
  }

  return (
    <Redondo tam={tam} borde={color} estilo={estilo}>
      {bandera ? (
        <Text style={{ fontSize: tam * 0.55 }}>{bandera}</Text>
      ) : (
        <Text style={{ ...T.pequenoFuerte, fontSize: tam * 0.3, color: C.texto }}>
          {corto ?? nombre.slice(0, 3).toUpperCase()}
        </Text>
      )}
    </Redondo>
  );
}

/** Cara de un jugador, con respaldo a su bandera. */
export function Cara({
  nombre,
  bandera,
  tam = 38,
  estilo,
}: {
  nombre: string;
  bandera?: string;
  tam?: number;
  estilo?: StyleProp<ViewStyle>;
}) {
  const url = caraJugador(nombre);
  const [falla, setFalla] = useState(false);

  if (url && !falla) {
    return (
      <Redondo tam={tam} estilo={estilo}>
        <Image
          source={{ uri: url }}
          style={{ width: tam, height: tam }}
          contentFit="cover"
          contentPosition="top center"
          transition={TRANSICION}
          onError={() => setFalla(true)}
          cachePolicy="disk"
        />
        {/* La bandera pequena identifica al jugador aunque la foto no cargue. */}
        {bandera ? (
          <View
            style={{
              position: 'absolute',
              right: -1,
              bottom: -1,
              width: tam * 0.4,
              height: tam * 0.4,
              borderRadius: tam * 0.2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.fondo,
              overflow: 'hidden',
            }}
          >
            <Text style={{ fontSize: tam * 0.26 }}>{bandera}</Text>
          </View>
        ) : null}
      </Redondo>
    );
  }

  return (
    <Redondo tam={tam} estilo={estilo}>
      <Text style={{ fontSize: tam * 0.55 }}>{bandera ?? '👤'}</Text>
    </Redondo>
  );
}

/** Logo de una competicion, con respaldo al emoji del catalogo. */
export function LogoCompeticion({
  competicionId,
  bandera,
  tam = 30,
  cuadrado,
}: {
  competicionId: string;
  bandera?: string;
  tam?: number;
  /** Sin circulo alrededor: para las rejillas y el carrusel. */
  cuadrado?: boolean;
}) {
  const url = logoCompeticion(competicionId);
  const [falla, setFalla] = useState(false);

  if (url && !falla) {
    const imagen = (
      <Image
        source={{ uri: url }}
        style={{ width: tam, height: tam }}
        contentFit="contain"
        transition={TRANSICION}
        onError={() => setFalla(true)}
        cachePolicy="disk"
      />
    );
    if (cuadrado) return imagen;
    return (
      <Redondo tam={tam * 1.35}>
        <View style={{ width: tam, height: tam }}>{imagen}</View>
      </Redondo>
    );
  }

  const emoji = <Text style={{ fontSize: tam * 0.9 }}>{bandera ?? '🏆'}</Text>;
  return cuadrado ? emoji : <Redondo tam={tam * 1.35}>{emoji}</Redondo>;
}

/** Dos escudos superpuestos: el enfrentamiento de un partido. */
export function Enfrentamiento({
  local,
  visitante,
  tam = 38,
}: {
  local: { nombre: string; bandera?: string; corto?: string; color?: string };
  visitante: { nombre: string; bandera?: string; corto?: string; color?: string };
  tam?: number;
}) {
  const chico = tam * 0.74;
  return (
    <View style={{ width: tam + chico * 0.55, height: tam, justifyContent: 'center' }}>
      {[local, visitante].map((e, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: i * chico * 0.6,
            top: (tam - chico) / 2,
            borderRadius: chico / 2,
            borderWidth: 1.5,
            borderColor: C.fondo,
          }}
        >
          <Escudo
            nombre={e.nombre}
            bandera={e.bandera}
            corto={e.corto}
            color={e.color}
            tam={chico}
          />
        </View>
      ))}
    </View>
  );
}
