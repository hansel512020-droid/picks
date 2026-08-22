-- ===========================================================================
--  Scout Picks · contador real de guardados
--
--  Pega esto entero en el editor SQL de tu proyecto de Supabase y ejecútalo.
--  Después copia la URL del proyecto y la clave "anon" en el archivo .env:
--
--    EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
--    EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
--
--  A partir de ahí el número naranja de cada tarjeta deja de estimarse y pasa
--  a contar guardados de verdad.
-- ===========================================================================

-- Una fila por pick y por móvil. La clave compuesta impide que el mismo
-- teléfono cuente dos veces el mismo pick.
create table if not exists public.guardados (
  pick_id      text        not null,
  dispositivo  text        not null,
  competicion  text        not null default '',
  creado       timestamptz not null default now(),
  primary key (pick_id, dispositivo)
);

-- Quién lo guardó, si tenía cuenta. Va aparte del dispositivo: el mismo pick
-- guardado desde el móvil y desde el portátil son dos filas, pero quien tiene
-- sesión puede deshacerlo desde cualquiera de los dos.
--
-- Se añade con ALTER porque la tabla ya existe en producción y el `create table
-- if not exists` de arriba no la tocaría.
alter table public.guardados add column if not exists usuario_id uuid;

-- Buscar por competición y ordenar por fecha es lo único que se hace.
create index if not exists guardados_competicion_idx on public.guardados (competicion);
create index if not exists guardados_creado_idx      on public.guardados (creado desc);

-- La app nunca lee las filas sueltas: solo este recuento. Así ningún cliente
-- puede sacar la lista de identificadores de los demás móviles.
create or replace view public.conteo_guardados as
  select
    pick_id,
    competicion,
    count(*)::int as total,
    max(creado)   as ultimo
  from public.guardados
  group by pick_id, competicion;

-- ---------------------------------------------------------------- permisos
alter table public.guardados enable row level security;

-- Cualquiera puede sumar su guardado…
drop policy if exists guardados_insertar on public.guardados;
create policy guardados_insertar
  on public.guardados for insert
  to anon, authenticated
  with check (true);

-- …y deshacerlo, pero SOLO lo suyo.
--
-- Esto era `using (true)`, confiando en que la app filtra por su propio
-- identificador de dispositivo. Pero una política no protege de lo que la app
-- haga, sino de lo que pueda hacer cualquiera con la clave pública —que viaja
-- en el navegador—: un `delete` sin filtro vaciaba la tabla entera y con ella
-- los contadores de toda la comunidad.
--
-- Ahora el servidor exige que la fila sea de quien la borra: del mismo
-- dispositivo, o del mismo usuario si hay sesión. El identificador de
-- dispositivo viaja en la cabecera `x-dispositivo`, que la app ya manda.
drop policy if exists guardados_borrar on public.guardados;
create policy guardados_borrar
  on public.guardados for delete
  to anon, authenticated
  using (
    dispositivo = current_setting('request.headers', true)::json ->> 'x-dispositivo'
    or (auth.uid() is not null and usuario_id = auth.uid())
  );

-- Las filas en crudo no se leen desde la app; el recuento sí.
drop policy if exists guardados_leer on public.guardados;
create policy guardados_leer
  on public.guardados for select
  to anon, authenticated
  using (false);

-- La vista se ejecuta con los permisos de quien la creó, no de quien consulta.
--
-- Sin esto hereda la RLS de `guardados` —cuya política de lectura es
-- `using (false)`— y devuelve vacío a la app: el recuento no llegaba nunca y el
-- número naranja no aparecía en ninguna tarjeta, ni siquiera en las que sí
-- tenían guardados. Con `security_invoker = false` se expone el agregado, que
-- es público a propósito, mientras las filas sueltas siguen sin poder leerse:
-- nadie puede sacar la lista de identificadores de los demás móviles.
alter view public.conteo_guardados set (security_invoker = false);

grant select on public.conteo_guardados to anon, authenticated;
grant insert, delete on public.guardados to anon, authenticated;

-- ============================================================================
--  Picks guardados de cada usuario
--
--  El historial es lo que da sentido a tener cuenta: cambiar de teléfono y
--  encontrarse los picks y el porcentaje de acierto intactos. Se guarda el
--  desenlace además del pick, para no tener que recalcularlo en cada móvil.
-- ============================================================================

create table if not exists public.picks_usuario (
  usuario_id      uuid        not null references auth.users (id) on delete cascade,
  pick_id         text        not null,
  competicion_id  text        not null,
  partido_id      text        not null,
  titulo          text        not null,
  equipo          text,
  mercado         text        not null,
  contexto        text,
  cuota           numeric     not null,
  imagen          text,
  es_bandera      boolean     default false,
  nombres         text[],
  sujeto          text,
  -- pendiente | ganado | perdido | nulo
  resultado       text        not null default 'pendiente',
  valor_real      numeric,
  guardado_en     timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  primary key (usuario_id, pick_id)
);

create index if not exists picks_usuario_por_dueno
  on public.picks_usuario (usuario_id, guardado_en desc);

alter table public.picks_usuario enable row level security;

-- Cada uno ve y toca lo suyo y nada mas. Sin esto, la clave anonima de la app
-- permitiria leer el historial de cualquier otro usuario.
drop policy if exists "lee lo suyo"     on public.picks_usuario;
drop policy if exists "escribe lo suyo" on public.picks_usuario;
drop policy if exists "cambia lo suyo"  on public.picks_usuario;
drop policy if exists "borra lo suyo"   on public.picks_usuario;

create policy "lee lo suyo"     on public.picks_usuario for select using (auth.uid() = usuario_id);
create policy "escribe lo suyo" on public.picks_usuario for insert with check (auth.uid() = usuario_id);
create policy "cambia lo suyo"  on public.picks_usuario for update using (auth.uid() = usuario_id);
create policy "borra lo suyo"   on public.picks_usuario for delete using (auth.uid() = usuario_id);

-- ============================================================================
--  Que ha comprado cada usuario
--
--  El plan NO puede vivir en el telefono: un booleano local lo activa
--  cualquiera y no sobrevive a cambiar de movil. Vive aqui, y quien lo escribe
--  es el servidor cuando la pasarela confirma el cobro -- nunca la app.
--
--  Por eso las politicas dejan LEER lo propio pero no escribir: si la app
--  pudiera insertar filas, cualquiera se regalaria el plan anual.
-- ============================================================================

create table if not exists public.derechos (
  usuario_id   uuid        not null references auth.users (id) on delete cascade,
  -- 'todas' desbloquea el catalogo entero; si no, el id de una competicion.
  competicion  text        not null,
  -- semanal | mensual | anual | vitalicio
  periodo      text        not null,
  -- Null en el vitalicio; en el resto, cuando deja de valer.
  caduca       timestamptz,
  -- Referencia del cobro en la pasarela, para poder auditar y reembolsar.
  compra_id    text,
  creado       timestamptz not null default now(),
  primary key (usuario_id, competicion)
);

create index if not exists derechos_por_dueno on public.derechos (usuario_id);

alter table public.derechos enable row level security;

drop policy if exists "ve lo suyo" on public.derechos;

-- Solo lectura, y solo de lo propio. Las altas las hace el webhook de la
-- pasarela con la clave de servicio, que nunca sale del servidor.
create policy "ve lo suyo" on public.derechos for select using (auth.uid() = usuario_id);
