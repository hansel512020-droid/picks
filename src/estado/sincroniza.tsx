import { useEffect, useRef } from 'react';
import { borraPick, picksDeLaCuenta, subePick } from '@/datos/cuenta';
import type { PickGuardado } from '@/datos/tipos';
import { useSesion } from './sesion';
import { useTienda } from './tienda';

/**
 * Mantiene los picks del usuario iguales en el teléfono y en su cuenta.
 *
 * Al entrar se baja lo que hubiera en la cuenta y se mezcla con lo que haya en
 * este teléfono —gana lo que ya tenga desenlace, porque un pick resuelto es
 * más información que uno pendiente—. A partir de ahí, cada cambio local sube.
 *
 * Si no hay servidor configurado no hace nada y la app funciona igual que
 * siempre, solo con lo guardado en el móvil.
 */

/** De la fila de la base de datos a lo que maneja la app. */
function aPick(fila: Record<string, any>): PickGuardado {
  return {
    pickId: fila.pick_id,
    titulo: fila.titulo,
    equipo: fila.equipo ?? undefined,
    mercado: fila.mercado,
    contexto: fila.contexto ?? '',
    cuota: Number(fila.cuota) || 0,
    imagen: fila.imagen ?? '',
    esBandera: !!fila.es_bandera,
    nombres: fila.nombres ?? undefined,
    sujeto: fila.sujeto ?? undefined,
    competicionId: fila.competicion_id,
    partidoId: fila.partido_id,
    guardadoEn: fila.guardado_en ?? new Date().toISOString(),
    resultado: fila.resultado ?? 'pendiente',
    valorReal: fila.valor_real === null ? undefined : Number(fila.valor_real),
  };
}

/** Y al revés, con los nombres de columna de la tabla. */
function aFila(g: PickGuardado): Record<string, unknown> {
  return {
    pick_id: g.pickId,
    titulo: g.titulo,
    equipo: g.equipo ?? null,
    mercado: g.mercado,
    contexto: g.contexto,
    cuota: g.cuota,
    imagen: g.imagen,
    es_bandera: g.esBandera,
    nombres: g.nombres ?? null,
    sujeto: g.sujeto ?? null,
    competicion_id: g.competicionId,
    partido_id: g.partidoId,
    resultado: g.resultado,
    valor_real: g.valorReal ?? null,
    guardado_en: g.guardadoEn,
    actualizado_en: new Date().toISOString(),
  };
}

export function Sincroniza() {
  const { sesion } = useSesion();
  const { guardados, restaura } = useTienda();

  const bajado = useRef<string | null>(null);
  // Lo último que se subió de cada pick, para no repetir la misma llamada.
  const subido = useRef<Map<string, string>>(new Map());

  // ------------------------------------------------------------- al entrar
  useEffect(() => {
    if (!sesion || bajado.current === sesion.id) return;
    bajado.current = sesion.id;

    (async () => {
      const filas = await picksDeLaCuenta(sesion.token, sesion.id);
      const deLaNube = filas.map(aPick);
      if (!deLaNube.length) return;

      /*
       * Mezcla: se queda el que más sabe. Un pick que en la nube está
       * resuelto y aquí pendiente trae información que este teléfono no
       * tiene, y al revés cuando el móvil ha estado abierto durante el
       * partido y lo ha resuelto en directo.
       */
      restaura((locales) => {
        const porId = new Map(locales.map((g) => [g.pickId, g]));
        for (const remoto of deLaNube) {
          const local = porId.get(remoto.pickId);
          if (!local) {
            porId.set(remoto.pickId, remoto);
            continue;
          }
          const localSabe = local.resultado !== 'pendiente';
          const remotoSabe = remoto.resultado !== 'pendiente';
          if (!localSabe && remotoSabe) porId.set(remoto.pickId, remoto);
        }
        return [...porId.values()].sort((a, b) => b.guardadoEn.localeCompare(a.guardadoEn));
      });
    })();
  }, [sesion, restaura]);

  // ------------------------------------------------------- cada cambio sube
  useEffect(() => {
    if (!sesion) return;
    for (const g of guardados) {
      // La huella incluye el desenlace: así vuelve a subir cuando se resuelve.
      const huella = `${g.resultado}|${g.valorReal ?? ''}`;
      if (subido.current.get(g.pickId) === huella) continue;
      subido.current.set(g.pickId, huella);
      subePick(sesion.token, sesion.id, aFila(g)).catch(() => {
        // Si falla, se reintenta en el siguiente cambio.
        subido.current.delete(g.pickId);
      });
    }

    // Lo que ya no está en el teléfono se quita también de la cuenta.
    const vivos = new Set(guardados.map((g) => g.pickId));
    for (const id of [...subido.current.keys()]) {
      if (vivos.has(id)) continue;
      subido.current.delete(id);
      borraPick(sesion.token, sesion.id, id).catch(() => {});
    }
  }, [guardados, sesion]);

  return null;
}
