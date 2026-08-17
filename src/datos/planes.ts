/**
 * Los planes de PayPal, con su identificador real.
 *
 * Estos `plan_id` no son secretos: viajan en el navegador cuando se abre el
 * botón de suscripción. Lo que sí es secreto es el `PAYPAL_SECRET`, y ese vive
 * solo en los secretos de Supabase, nunca aquí.
 *
 * OJO: son los de **sandbox**. Al pasar a producción hay que crear los planes
 * de nuevo en Live y sustituir estos identificadores, además de cambiar
 * `PAYPAL_ENTORNO` a `live` en Supabase. Mezclarlos hace que PayPal cobre y la
 * función rechace el aviso, con lo que el usuario paga y no recibe nada.
 */

export interface PlanPaypal {
  /** El mismo id que usa la app en la pantalla de Pro. */
  id: 'semanal' | 'mensual' | 'anual' | 'dosligas' | 'tresligas';
  /** El identificador del plan en PayPal. */
  paypalId: string;
  /** Qué desbloquea: `todas` o el id de una competición. */
  competicion: string;
}

export const PLANES_PAYPAL: PlanPaypal[] = [
  { id: 'anual', paypalId: 'P-2YM95169R7499880TNKAROCI', competicion: 'todas' },
  { id: 'mensual', paypalId: 'P-2NL80130H1296394YNKBGEBI', competicion: 'todas' },
  { id: 'semanal', paypalId: 'P-01S395028H7387306NKBGECA', competicion: 'todas' },
  /*
   * Planes parciales. Su `competicion` es `elegidas`: al cobrar no se concede
   * ninguna liga, sino los huecos que el usuario reparte luego en "Mis ligas".
   */
  { id: 'dosligas', paypalId: 'P-40F56912DE995063XNKBGDXI', competicion: 'elegidas' },
  { id: 'tresligas', paypalId: 'P-02C942313Y099943LNKBGDYQ', competicion: 'elegidas' },
];

export function planDePaypal(id: string): PlanPaypal | undefined {
  return PLANES_PAYPAL.find((p) => p.id === id);
}
