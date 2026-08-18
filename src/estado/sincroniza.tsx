import { useEffect, useRef, useState } from 'react';
import { borraPick, picksDeLaCuenta, subePick } from '@/datos/cuenta';
import type { PickGuardado } from '@/datos/tipos';
import { useSesion } from './sesion';
import { useTienda } from './tienda';

/** Cada cuánto se reintenta lo que quedó sin subir la última vez. */
const CADA_REINTENTO = 45_000;

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

  // Late de fondo para reintentar lo que se quedó sin subir. Un 503 pasajero
  // no debe esperar a que el usuario guarde o quite otro pick para volver a
  // intentarse: sin esto, un fallo de un segundo del servidor dejaba ese pick
  // sin sincronizar para siempre.
  const [pulso, setPulso] = useState(0);
  useEffect(() => {
    if (!sesion) return;
    const reloj = setInterval(() => setPulso((p) => p + 1), CADA_REINTENTO);
    return () => clearInterval(reloj);
  }, [sesion]);

  // ------------------------------------------------------- cada cambio sube
  useEffect(() => {
    if (!sesion) return;
    let cancelado = false;

    (async () => {
      /*
       * Uno detrás de otro, no todos a la vez.
       *
       * Antes se lanzaban todas las peticiones juntas, sin esperar ninguna.
       * Con diez picks guardados eso eran diez conexiones simultáneas contra
       * la base de datos, y el servidor respondía 503 a las diez —incluida la
       * única que de verdad había cambiado—. Uno a uno tarda más pero llega.
       */
      for (const g of guardados) {
        if (cancelado) return;
        // La huella incluye el desenlace: así vuelve a subir cuando se resuelve.
        const huella = `${g.resultado}|${g.valorReal ?? ''}`;
        if (subido.current.get(g.pickId) === huella) continue;

        const bien = await subePick(sesion.token, sesion.id, aFila(g));
        /*
         * Solo se marca como subido si de verdad se subió. `subePick` no
         * lanza excepción cuando el servidor responde mal —devuelve
         * `false`—, así que un 503 pasaba desapercibido: el pick se daba
         * por sincronizado sin haber llegado nunca a la cuenta, y no se
         * volvía a intentar jamás. Ahora un fallo se queda "pendiente" y
         * el pulso de reintento —o el próximo cambio— lo vuelve a probar.
         */
        if (bien) subido.current.set(g.pickId, huella);
      }
      if (cancelado) return;

      // Lo que ya no está en el teléfono se quita también de la cuenta.
      const vivos = new Set(guardados.map((g) => g.pickId));
      for (const id of [...subido.current.keys()]) {
        if (cancelado) return;
        if (vivos.has(id)) continue;
        const bien = await borraPick(sesion.token, sesion.id, id);
        if (bien) subido.current.delete(id);
        // Si falla el borrado, se queda en `subido` y se reintenta luego:
        // no se le pierde el rastro solo porque el servidor respondió mal.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [guardados, sesion, pulso]);

  return null;
}
