-- ============================================================================
--  Los picks, ya cocinados, con cerradura.
--
--  ── Por qué ────────────────────────────────────────────────────────────────
--
--  Los picks se calculaban en el teléfono a partir del archivo de datos, y ese
--  archivo se le entrega a cualquiera que tenga cuenta. El muro de pago tapaba
--  la pantalla, no el dato: con el archivo y el código —que es público—
--  cualquiera reproduce los picks de todas las ligas sin pagar ninguna.
--
--  Aquí los cocina el bot (`scripts/publicar-picks.ts`) y los deja en esta
--  tabla. El permiso de abajo decide, fila por fila, qué le toca a cada uno:
--  el gratis del día a todo el mundo, y los demás solo a quien haya comprado
--  esa liga. Lo que no es tuyo no sale del servidor.
--
--  Se pega entero en el SQL Editor de Supabase. Se puede volver a ejecutar sin
--  miedo: no borra nada que ya exista.
-- ============================================================================

create table if not exists public.picks (
  -- El identificador que ya usa la app ("mls-e761543-mls:seattle-corners-4.5-mas").
  id           text        primary key,
  competicion  text        not null,
  partido_id   text        not null,
  -- Cuándo se juega. Con esto se ordena la portada y se borra lo que ya pasó.
  cuando       timestamptz not null,
  -- Si requiere plan. El pick del día se abre aunque lo lleve puesto.
  pro          boolean     not null default true,
  -- El gratis de hoy: uno solo, el mismo para todos.
  gratis       boolean     not null default false,
  -- El pick entero, tal cual lo pinta la app. En jsonb para no tener que
  -- cambiar la tabla cada vez que el motor añada un campo.
  datos        jsonb       not null,
  actualizado  timestamptz not null default now()
);

create index if not exists picks_por_cuando on public.picks (cuando);
create index if not exists picks_por_competicion on public.picks (competicion, cuando);
-- El gratis del día se pide solo, y es una fila entre miles.
create index if not exists picks_gratis on public.picks (gratis) where gratis;

alter table public.picks enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
--  Quién ve qué.
--
--  Tres casos, en este orden: el gratis del día lo ve cualquiera con cuenta;
--  un pick sin candado también; y los de pago, solo quien tenga un derecho
--  vivo sobre esa competición (o sobre 'todas').
--
--  El plan vitalicio tiene `caduca` a null, y por eso el `is null` cuenta como
--  vigente. Los caducados dejan de dar acceso solos, sin tener que borrarlos.
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "picks: los que te tocan" on public.picks;
create policy "picks: los que te tocan"
  on public.picks for select
  to authenticated
  using (
    gratis
    or not pro
    or exists (
      select 1
        from public.derechos d
       where d.usuario_id = auth.uid()
         and (d.competicion = 'todas' or d.competicion = picks.competicion)
         and (d.caduca is null or d.caduca > now())
    )
  );

-- Escribir solo el bot, que entra con la clave secreta y se salta RLS. No hay
-- política de insert ni de update a propósito: nadie más tiene por qué tocar
-- esta tabla.

comment on table public.picks is
  'Picks ya calculados por el bot. Lectura filtrada por derechos: ver picks.sql.';
