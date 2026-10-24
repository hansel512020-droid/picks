/**
 * Que la URL de retorno de un pago sea de las nuestras.
 *
 * `vuelveA` lo pone el navegador —el dominio puede cambiar, por eso lo manda la
 * app y no está fijo aquí—, pero eso también significa que un cliente podría
 * mandar cualquier cosa. Sin esta comprobación, el servidor crearía un cobro de
 * Golden que, al terminar, rebota al usuario a un dominio ajeno: base para un
 * fraude con aspecto de "pago verificado". Se valida por host, no por prefijo de
 * texto, para que `https://goldenpicks.vercel.app.evil.com` no cuele.
 *
 * Se permiten: el dominio de producción, los previews de Vercel (*.vercel.app),
 * y localhost para desarrollo. Para un dominio propio a futuro, se añaden hosts
 * separados por comas en el secreto DOMINIOS_RETORNO, sin tocar el código.
 *
 * Vive aquí porque la usan los dos cobros, Payphone y Polar: una regla de
 * seguridad copiada en dos sitios acaba distinta en cada uno.
 */
export function retornoValido(vuelveA: unknown): boolean {
  if (typeof vuelveA !== 'string' || !vuelveA) return false;
  let u: URL;
  try {
    u = new URL(vuelveA);
  } catch {
    return false;
  }

  const host = u.hostname.toLowerCase();
  const esLocal = host === 'localhost' || host === '127.0.0.1';
  // Fuera de desarrollo, solo https: un retorno por http es degradable.
  if (u.protocol !== 'https:' && !esLocal) return false;

  const extra = (Deno.env.get('DOMINIOS_RETORNO') ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  return (
    host === 'goldenpicks.vercel.app' ||
    host.endsWith('.vercel.app') ||
    esLocal ||
    extra.includes(host)
  );
}
