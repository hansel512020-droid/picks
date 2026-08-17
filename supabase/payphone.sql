-- Compras de Payphone.
--
-- Payphone solo admite una referencia de quince caracteres, donde no cabe el
-- identificador de un usuario. Así que la referencia es corta y aquí queda
-- apuntado a quién pertenece y qué plan pidió.
--
-- También sirve de registro: qué se cobró, cuándo y por cuánto. El día que
-- alguien reclame un reembolso o diga que pagó y no le llegó, esto es lo que
-- se mira.

create table if not exists public.compras (
  -- La referencia que viaja a Payphone y vuelve. Es la clave.
  referencia   text        primary key,
  usuario_id   uuid        not null references auth.users (id) on delete cascade,
  -- semanal | mensual | anual | dosligas | tresligas
  plan         text        not null,
  -- Lo que se pidió cobrar, en centavos. Se compara con lo que Payphone dice
  -- que cobró de verdad: si no coinciden, no se concede nada.
  centavos     integer     not null,
  -- pendiente | pagada | rechazada
  estado       text        not null default 'pendiente',
  -- El identificador que devuelve Payphone, para poder auditar y reembolsar.
  payphone_id  text,
  creado       timestamptz not null default now(),
  cerrado      timestamptz
);

create index if not exists compras_por_dueno on public.compras (usuario_id);

alter table public.compras enable row level security;

-- Cada uno ve sus compras y nada más. Escribir solo puede el servidor, con la
-- clave de servicio: si el navegador pudiera insertar filas, cualquiera se
-- apuntaría una compra "pagada" y se quedaría el Pro gratis.
drop policy if exists "ve lo suyo" on public.compras;
create policy "ve lo suyo" on public.compras
  for select using (auth.uid() = usuario_id);
