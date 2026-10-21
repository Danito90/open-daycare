insert into public.rooms (daycare_id, name)
select d.id, room.name
from public.daycares as d
cross join (values ('Soles'), ('Luna'), ('Estrellas')) as room(name)
where d.name = 'Guardería Sala Soles'
on conflict (daycare_id, name) do nothing;

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
where d.name = 'Guardería Sala Soles'
  and r.name = 'Soles'
  and not exists (
    select 1
    from public.children as existing
    where existing.room_id = r.id
      and existing.full_name = child.full_name
  );
