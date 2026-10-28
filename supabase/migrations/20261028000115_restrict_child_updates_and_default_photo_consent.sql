-- Existing consent values are deliberately left unchanged.
alter table public.children alter column photo_consent set default false;

-- Staff and parents share the Postgres role authenticated. Column grants alone
-- cannot distinguish their application roles, so the trigger checks changes.
revoke update on table public.children from authenticated;
grant update (full_name, birth_date, room_id, enrolled_at, allergy_tags, medical_notes, photo_consent)
  on table public.children to authenticated;

create function public.authorize_child_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  profile_role public.user_role;
  profile_daycare_id uuid;
begin
  -- Administrative and migration roles do not use the end-user API.
  if current_user <> 'authenticated' then
    return new;
  end if;

  select u.role, u.daycare_id
    into profile_role, profile_daycare_id
  from public.users as u
  where u.id = (select auth.uid())
    and u.status = 'active';

  if profile_role in ('staff', 'admin') then
    if new.id is distinct from old.id
      or new.status is distinct from old.status
      or new.created_at is distinct from old.created_at
      or new.updated_at is distinct from old.updated_at
      or new.photo_consent is distinct from old.photo_consent
      or not exists (
        select 1 from public.rooms as r
        where r.id = old.room_id and r.daycare_id = profile_daycare_id
      )
      or not exists (
        select 1 from public.rooms as r
        where r.id = new.room_id and r.daycare_id = profile_daycare_id
      )
    then
      raise exception 'Staff can only edit child details within their daycare'
        using errcode = '42501';
    end if;
  elsif profile_role = 'parent' then
    if not exists (
      select 1 from public.parent_children as pc
      where pc.parent_id = (select auth.uid()) and pc.child_id = old.id
    ) or row(new.id, new.room_id, new.full_name, new.birth_date,
             new.enrolled_at, new.medical_notes, new.allergy_tags,
             new.status, new.created_at, new.updated_at)
       is distinct from
       row(old.id, old.room_id, old.full_name, old.birth_date,
           old.enrolled_at, old.medical_notes, old.allergy_tags,
           old.status, old.created_at, old.updated_at)
    then
      raise exception 'Parents can only edit photo consent for linked children'
        using errcode = '42501';
    end if;
  else
    raise exception 'Child update is not permitted' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.authorize_child_update() from public, anon, authenticated;

-- Trigger names sort alphabetically: authorization runs before the existing
-- children_set_updated_at trigger changes updated_at.
create trigger children_authorize_update
before update on public.children
for each row execute function public.authorize_child_update();

drop policy "Linked parents and daycare staff can update children" on public.children;

create policy "Linked parents and daycare staff can update children"
on public.children for update to authenticated
using (
  public.is_linked_parent(id)
  or public.is_child_daycare_staff(id)
)
with check (
  public.is_linked_parent(id)
  or exists (
    select 1
    from public.users as u
    join public.rooms as r on r.daycare_id = u.daycare_id
    where u.id = (select auth.uid())
      and u.role in ('staff', 'admin')
      and r.id = children.room_id
  )
);
