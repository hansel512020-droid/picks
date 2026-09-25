import { View } from 'react-native';
import { Logo } from '@/componentes/marca';
import { Txt } from '@/componentes/base';
import { C, E, R } from '@/tema';

/**
 * La pantalla de carga de la app. Una sola, para todas las esperas.
 *
 * Antes había dos seguidas y distintas —una ruedecita con "Cargando
 * resultados…" mientras bajaban los datos y otra pantalla mientras se montaban
 * los picks— y entre medias asomaba la portada a medio hacer. Tres estados
 * visuales para una sola espera: desde fuera eso no es "cargando", es una app
 * que parpadea.
 *
 * Ahora es siempre esto, y lo único que cambia es la frase y la barra. Quien
 * mira ve una pantalla que avanza, no tres que se pisan.
 */
export function PantallaCargando({
  titulo,
  detalle,
  pie,
  parte,
}: {
  titulo: string;
  detalle?: string;
  pie?: string;
  /** De 0 a 1. Sin esto la barra no sale: no se finge un progreso que no se sabe. */
  parte?: number;
}) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: E.lg,
        paddingHorizontal: E.xl,
        backgroundColor: C.fondo,
      }}
    >
      <Logo tam={30} />

      <View style={{ alignItems: 'center', gap: 6 }}>
        <Txt v="cuerpoFuerte">{titulo}</Txt>
        {detalle ? (
          <Txt v="pequeno" color={C.texto3}>
            {detalle}
          </Txt>
        ) : null}
      </View>

      {/* Un porcentaje que avanza dice mucho más que una ruedecita girando. */}
      <View
        style={{
          width: '100%',
          maxWidth: 320,
          height: 8,
          borderRadius: 4,
          backgroundColor: C.carta2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(Math.max(0, Math.min(1, parte ?? 0.08)) * 100)}%`,
            height: '100%',
            backgroundColor: C.lima,
          }}
        />
      </View>

      {pie ? (
        <Txt v="mini" color={C.texto3}>
          {pie}
        </Txt>
      ) : null}
    </View>
  );
}
