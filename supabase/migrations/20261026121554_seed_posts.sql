with author as (
  select u.id, u.daycare_id
  from public.users as u
  join public.daycares as d on d.id = u.daycare_id
  where d.name = 'Guardería Sala Soles'
    and u.role in ('staff', 'admin')
  order by u.created_at, u.id
  limit 1
)
insert into public.posts (id, daycare_id, author_id, room_id, type, title, body, published_at, idempotency_key)
select
  gen_random_uuid(),
  a.daycare_id,
  a.id,
  null,
  'achievement',
  'Primer orinal',
  '¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.',
  now() - interval '3 hours',
  'seed-mateo-orinal'
from author as a
where not exists (
  select 1 from public.posts as p
  where p.author_id = a.id and p.idempotency_key = 'seed-mateo-orinal'
);

insert into public.post_children (post_id, child_id)
select p.id, c.id
from public.posts as p
join public.children as c on c.full_name = 'Mateo Fernández'
where p.idempotency_key = 'seed-mateo-orinal'
on conflict do nothing;

with author as (
  select u.id, u.daycare_id
  from public.users as u
  join public.daycares as d on d.id = u.daycare_id
  where d.name = 'Guardería Sala Soles'
    and u.role in ('staff', 'admin')
  order by u.created_at, u.id
  limit 1
)
insert into public.posts (id, daycare_id, author_id, room_id, type, title, body, published_at, idempotency_key)
select
  gen_random_uuid(),
  a.daycare_id,
  a.id,
  r.id,
  'activity',
  'Témperas en Soles',
  'Pintamos con témperas esta mañana. Eligieron el azul para todo y se concentraron un montón mezclando colores.',
  now() - interval '6 hours',
  'seed-soles-temperas'
from author as a
join public.rooms as r on r.daycare_id = a.daycare_id and r.name = 'Soles'
where not exists (
  select 1 from public.posts as p
  where p.author_id = a.id and p.idempotency_key = 'seed-soles-temperas'
);

with author as (
  select u.id, u.daycare_id
  from public.users as u
  join public.daycares as d on d.id = u.daycare_id
  where d.name = 'Guardería Sala Soles'
    and u.role in ('staff', 'admin')
  order by u.created_at, u.id
  limit 1
)
insert into public.posts (id, daycare_id, author_id, room_id, type, title, body, published_at, idempotency_key)
select
  gen_random_uuid(),
  a.daycare_id,
  a.id,
  null,
  'announcement',
  null,
  'El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.',
  now() - interval '1 day',
  'seed-anuncio-parque'
from author as a
where not exists (
  select 1 from public.posts as p
  where p.author_id = a.id and p.idempotency_key = 'seed-anuncio-parque'
);

with author as (
  select u.id, u.daycare_id
  from public.users as u
  join public.daycares as d on d.id = u.daycare_id
  where d.name = 'Guardería Sala Soles'
    and u.role in ('staff', 'admin')
  order by u.created_at, u.id
  limit 1
)
insert into public.posts (id, daycare_id, author_id, room_id, type, title, body, published_at, idempotency_key)
select
  gen_random_uuid(),
  a.daycare_id,
  a.id,
  null,
  'announcement',
  'Cambio de horario',
  'El lunes abrimos a las 8:00. La entrada se cierra a las 9:30 como siempre.',
  now() - interval '2 days',
  'seed-anuncio-lunes'
from author as a
where not exists (
  select 1 from public.posts as p
  where p.author_id = a.id and p.idempotency_key = 'seed-anuncio-lunes'
);
