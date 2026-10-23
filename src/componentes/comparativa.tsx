import { StyleSheet, View } from 'react-native';
import { Txt } from '@/componentes/base';
import { marca } from '@/componentes/movimiento';
import { C, R } from '@/tema';

/**
 * Una estadística con su contexto: el valor, una barra que dice cuánto es
 * comparado con el mejor de su liga y el puesto que ocupa.
 *
 * Una lista de cifras sueltas ("Remates 13,3") no dice si es mucho o poco.
 * Con la barra y el "3º de 20" se ve de un vistazo, sin saberse las medias de
 * cada liga.
 */
export function FilaComparada({
  etiqueta,
  valor,
  sufijo,
  fraccion,
  puesto,
  total,
  media,
  destacado,
}: {
  etiqueta: string;
  valor: string;
  sufijo?: string;
  /** De 0 a 1: el valor contra el mejor de la liga. Sin él, no hay barra. */
  fraccion?: number;
  puesto?: number;
  total?: number;
  /** La media de la liga, ya formateada. */
  media?: string;
  destacado?: boolean;
}) {
  // Arriba de la tabla en lima; abajo, en rojo apagado; en medio, neutro.
  const tercio = puesto && total ? puesto / total : undefined;
  const color =
    tercio === undefined ? C.texto3 : tercio <= 1 / 3 ? C.lima : tercio > 2 / 3 ? C.rojo : C.texto2;
  return (
    <View style={est.fila}>
      <View style={est.arriba}>
        <Txt v="cuerpo" color={C.texto2} style={est.etiqueta} numberOfLines={1}>
          {etiqueta}
        </Txt>
        <View style={est.valor}>
          <Txt v="cuerpoFuerte" color={destacado ? C.lima : C.texto}>
            {valor}
          </Txt>
          {sufijo ? (
            <Txt v="mini" color={C.texto3}>
              {sufijo}
            </Txt>
          ) : null}
        </View>
      </View>
      {fraccion !== undefined ? (
        <View style={est.abajo}>
          <View style={est.pista}>
            <View
              {...marca('ancho')}
              style={[
                est.barra,
                { width: `${Math.max(3, Math.min(100, fraccion * 100))}%`, backgroundColor: color },
              ]}
            />
          </View>
          <Txt v="mini" color={C.texto3} style={est.puesto} numberOfLines={1}>
            {puesto && total ? `${puesto}º de ${total}` : ''}
            {media ? `${puesto && total ? ' · ' : ''}media ${media}` : ''}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const est = StyleSheet.create({
  fila: { paddingVertical: 10, gap: 6 },
  arriba: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  etiqueta: { flexShrink: 1 },
  valor: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  abajo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pista: { flex: 1, height: 4, borderRadius: R.pill, backgroundColor: C.carta2, overflow: 'hidden' },
  barra: { height: 4, borderRadius: R.pill },
  puesto: { minWidth: 112, textAlign: 'right' },
});
