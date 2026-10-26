-- SPEC 14: la tarjeta del feed muestra el nombre de quien publicó.
-- Un padre puede leer las entradas de sus hijos, pero la política de `users`
-- solo le permite leer su propio perfil y el de las familias con las que
-- comparte un niño, así que el embed del autor llegaba vacío.
-- Permitir leer el perfil de staff/admin que firmaron una entrada legible.

create policy "Users can read staff authors of readable posts"
on public.users for select to authenticated
using (
  role in ('staff', 'admin')
  and exists (
    select 1
    from public.posts as p
    where p.author_id = public.users.id
      and public.can_read_post(p.id)
  )
);
