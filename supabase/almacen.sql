-- ============================================================================
--  Quién puede bajarse qué del almacén de datos.
--
--  ── El problema ────────────────────────────────────────────────────────────
--
--  Cerrar los picks no bastaba. Los jugadores y sus líneas partido a partido
--  —la materia prima del 69% de los picks, los de jugador— seguían viajando en
--  un solo archivo que se le entregaba a cualquiera con cuenta. Con él y el
--  motor, que es público, esos picks se reconstruyen sin pagarlos.
--
--  ── Lo que hace este permiso ───────────────────────────────────────────────
--
--  El bot publica ahora los jugadores partidos por ligas (`detalle/laliga.json.gz`),
--  así que cada liga se puede cerrar por separado:
--
--    · nucleo.json.gz y logos.json  → cualquiera que haya entrado. Son los
--      partidos, los equipos y los escudos: hacen falta para que la app
--      funcione y no son lo que se vende.
--    · detalle/<liga>.json.gz       → solo quien tenga esa liga comprada.
--    · importado.json.gz            → solo quien lo tenga TODO comprado: ese
--      archivo lleva dentro a todos los jugadores de todas las ligas.
--    · detalle.json.gz (el antiguo, entero) → igual, solo con todo comprado.
--      Se retira en cuanto no quede ninguna app pidiéndolo.
--
--  Se pega entero en el SQL Editor de Supabase.
-- ============================================================================

-- El permiso de antes daba el almacén entero a cualquiera con cuenta.
drop policy if exists "datos: leer con cuenta" on storage.objects;
drop policy if exists "datos: nucleo a todos, jugadores solo tus ligas" on storage.objects;

create policy "datos: nucleo a todos, jugadores solo tus ligas"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'datos'
    and (
      -- Lo abierto: el núcleo (calendario, equipos y marcadores, que están en
      -- cualquier web de resultados) y los escudos.
      (
        name not like 'detalle%'
        and name not like 'estadisticas/%'
        and name <> 'importado.json.gz'
      )

      -- Los jugadores y las estadisticas de una liga: hace falta tener esa
      -- liga. Son las dos cosas con las que se rehacen los picks.
      or (
        (name like 'detalle/%' or name like 'estadisticas/%')
        and exists (
          select 1
            from public.derechos d
           where d.usuario_id = auth.uid()
             and (d.caduca is null or d.caduca > now())
             and (
               d.competicion = 'todas'
               or d.competicion = split_part(
                    replace(replace(name, 'detalle/', ''), 'estadisticas/', ''), '.', 1)
             )
        )
      )

      -- Los archivos que lo llevan todo: hace falta tenerlo todo.
      or (
        (name = 'importado.json.gz' or name = 'detalle.json.gz')
        and exists (
          select 1
            from public.derechos d
           where d.usuario_id = auth.uid()
             and d.competicion = 'todas'
             and (d.caduca is null or d.caduca > now())
        )
      )
    )
  );
