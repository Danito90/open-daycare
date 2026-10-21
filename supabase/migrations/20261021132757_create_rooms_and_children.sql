create type public.child_status as enum ('active', 'archived');

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares (id) on delete restrict,
  name text not null constraint rooms_name_not_blank check (name ~ '[^[:space:]]'),
  created_at timestamptz not null default now(),
  constraint rooms_daycare_id_name_key unique (daycare_id, name)
);

create index rooms_daycare_id_idx on public.rooms (daycare_id);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete restrict,
  full_name text not null constraint children_full_name_not_blank check (full_name ~ '[^[:space:]]'),
  birth_date date not null,
  enrolled_at date not null default current_date,
  medical_notes text,
  allergy_tags text[] not null default '{}',
  photo_consent boolean not null default true,
  status public.child_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index children_room_id_idx on public.children (room_id);

create function public.set_children_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

revoke all on function public.set_children_updated_at() from public, anon, authenticated;

create trigger children_set_updated_at
before update on public.children
for each row execute function public.set_children_updated_at();

alter table public.rooms enable row level security;
alter table public.children enable row level security;

revoke all on table public.rooms from public, anon, authenticated;
revoke all on table public.children from public, anon, authenticated;

grant select on table public.rooms to authenticated;
grant select on table public.children to authenticated;
grant insert (room_id, full_name, birth_date, medical_notes, allergy_tags)
  on table public.children to authenticated;

create policy "Users can read their daycare rooms"
on public.rooms for select to authenticated
using (
  daycare_id in (
    select u.daycare_id
    from public.users as u
    where u.id = (select auth.uid())
  )
);

create policy "Users can read their daycare children"
on public.children for select to authenticated
using (
  room_id in (
    select r.id
    from public.rooms as r
    join public.users as u on u.daycare_id = r.daycare_id
    where u.id = (select auth.uid())
  )
);

create policy "Staff can create children in their daycare"
on public.children for insert to authenticated
with check (
  exists (
    select 1
    from public.users as u
    join public.rooms as r on r.daycare_id = u.daycare_id
    where u.id = (select auth.uid())
      and u.role in ('staff', 'admin')
      and r.id = children.room_id
  )
);

insert into public.rooms (daycare_id, name)
select d.id, room.name
from public.daycares as d
cross join (values ('Soles'), ('Luna'), ('Estrellas')) as room(name)
where d.name = 'Guardería Sala Soles';

insert into public.children (room_id, full_name, birth_date, enrolled_at, allergy_tags, medical_notes)
select r.id, child.full_name, child.birth_date, child.enrolled_at, child.allergy_tags, child.medical_notes
from public.rooms as r
join public.daycares as d on d.id = r.daycare_id
cross join (
  values
    ('Mateo Fernández', date '2022-03-12', date '2025-02-01', array['peanut'], 'Evitar frutos secos. Lleva inhalador en la mochila.'),
    ('Sofía Méndez', date '2023-08-18', date '2025-03-01', array[]::text[], 'Le gusta participar en actividades de música.'),
    ('Benjamín Ruiz', date '2022-06-04', date '2025-02-01', array[]::text[], 'Usa lentes para actividades de lectura.'),
    ('Valentina Soto', date '2023-09-27', date '2025-04-01', array[]::text[], null),
    ('Tomás Díaz', date '2022-04-09', date '2025-02-01', array['lactose'], 'Ofrecer alternativas sin lácteos durante la merienda.'),
    ('Emma Castro', date '2023-07-15', date '2025-03-01', array[]::text[], 'Lleva objeto de apego en la mochila.'),
    ('Lucas Romero', date '2022-05-22', date '2025-02-01', array[]::text[], 'Necesita unos minutos de adaptación al llegar.'),
    ('Olivia Vega', date '2023-10-03', date '2025-04-01', array[]::text[], 'Disfruta especialmente de los cuentos ilustrados.')
) as child(full_name, birth_date, enrolled_at, allergy_tags, medical_notes)
where d.name = 'Guardería Sala Soles' and r.name = 'Soles';
