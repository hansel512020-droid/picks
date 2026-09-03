/**
 * Suma un guardado a un pick, con limite de intentos por IP.
 *
 * ── Por que esto vive en el servidor ────────────────────────────────────────
 *
 * Antes se insertaba directo desde la app con la clave publica: la politica
 * de insert era `with check (true)`, asi que cualquiera podia guardar el
 * mismo pick miles de veces inventando un "dispositivo" nuevo en cada
 * peticion. La clave primaria (pick_id, dispositivo) frena al mismo aparato
 * repitiendose, pero no a un script que inventa aparatos sin parar.
 *
 * Aqui se cuenta por IP en vez de por dispositivo -el dispositivo lo sigue
 * eligiendo el cliente y se puede falsear igual-, y conseguir muchas IPs
 * distintas cuesta mas que inventar strings. El limite es generoso a
 * proposito: en Ecuador es normal que cientos de moviles reales compartan
 * una sola IP publica detras del NAT de un operador, y no se les puede
 * bloquear por eso.
 *
 * Se despliega con --no-verify-jwt: la app guarda con y sin sesion, asi que
 * no hay un JWT que exigir aqui.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const responde = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// 300 intentos cada 10 minutos por IP: unos 30 por minuto. Un uso real, por
// intenso que sea, no se acerca; un script en bucle lo pisa enseguida.
const VENTANA_MIN = 10;
const LIMITE = 300;

function ipDe(peticion: Request): string {
  const reenviada = peticion.headers.get('x-forwarded-for');
  if (reenviada) return reenviada.split(',')[0].trim();
  return peticion.headers.get('x-real-ip') ?? 'desconocida';
}

function servicio(): { url: string; cabeceras: Record<string, string> } | null {
  const url = Deno.env.get('SUPABASE_URL');
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave) return null;
  return {
    url,
    cabeceras: { apikey: clave, Authorization: `Bearer ${clave}`, 'Content-Type': 'application/json' },
  };
}

/**
 * Cuenta los intentos de esta IP en la ventana y, si hay hueco, deja
 * constancia de este. Aprovecha la misma llamada para barrer, de vez en
 * cuando, los intentos ya viejos de cualquier IP -asi la tabla no crece sin
 * limite y no hace falta un cron aparte.
 */
async function bajoElLimite(s: NonNullable<ReturnType<typeof servicio>>, ip: string): Promise<boolean> {
  const desde = new Date(Date.now() - VENTANA_MIN * 60_000).toISOString();

  const cuenta = await fetch(
    `${s.url}/rest/v1/guardados_intentos?ip=eq.${encodeURIComponent(ip)}&creado=gte.${desde}`,
    { method: 'HEAD', headers: { ...s.cabeceras, Prefer: 'count=exact' } },
  );
  const total = Number(cuenta.headers.get('content-range')?.split('/')[1] ?? 0);
  if (total >= LIMITE) return false;

  await fetch(`${s.url}/rest/v1/guardados_intentos`, {
    method: 'POST',
    headers: { ...s.cabeceras, Prefer: 'return=minimal' },
    body: JSON.stringify({ ip }),
  });

  if (Math.random() < 0.01) {
    fetch(`${s.url}/rest/v1/guardados_intentos?creado=lt.${desde}`, {
      method: 'DELETE',
      headers: { ...s.cabeceras, Prefer: 'return=minimal' },
    }).catch(() => {});
  }

  return true;
}

Deno.serve(async (peticion) => {
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (peticion.method !== 'POST') return responde({ error: 'Metodo no permitido' }, 405);

  try {
    const s = servicio();
    if (!s) return responde({ error: 'No configurado' }, 503);

    if (!(await bajoElLimite(s, ipDe(peticion)))) {
      return responde({ error: 'Demasiados intentos, prueba en unos minutos' }, 429);
    }

    const { pick_id, competicion, dispositivo, usuario_id } = await peticion.json();
    if (!pick_id || !dispositivo) return responde({ error: 'Faltan datos' }, 400);

    const r = await fetch(`${s.url}/rest/v1/guardados`, {
      method: 'POST',
      headers: { ...s.cabeceras, Prefer: 'return=minimal' },
      body: JSON.stringify([
        {
          pick_id: String(pick_id),
          competicion: String(competicion ?? ''),
          dispositivo: String(dispositivo),
          usuario_id: usuario_id ?? null,
        },
      ]),
    });
    // 409 = ya estaba guardado por este movil. No es un fallo.
    if (!r.ok && r.status !== 409) {
      console.log('no se pudo guardar:', r.status, await r.text());
      return responde({ error: 'No se pudo guardar' }, 502);
    }
    return responde({ ok: true });
  } catch (e) {
    console.log('error inesperado:', e);
    return responde({ error: 'Error inesperado' }, 500);
  }
});
