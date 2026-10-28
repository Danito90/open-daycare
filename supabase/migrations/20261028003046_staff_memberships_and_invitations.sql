-- Memberships are explicit: newly created rooms never inherit existing staff.
create table public.staff_rooms (
  staff_id uuid not null references public.users(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (staff_id, room_id)
);
create index staff_rooms_room_id_idx on public.staff_rooms(room_id);

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  daycare_id uuid not null references public.daycares(id) on delete restrict,
  invited_by uuid not null references public.users(id) on delete restrict,
  full_name text not null check (full_name ~ '[^[:space:]]'),
  email text not null check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  code text not null check (code ~ '^[01][A-HJ-NP-Z2-9]{4}$'),
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index staff_invitations_code_unique_idx on public.staff_invitations(code)
  where status in ('pending', 'accepted');
create unique index staff_invitations_pending_email_idx on public.staff_invitations(lower(email))
  where status = 'pending';
create index staff_invitations_daycare_status_idx on public.staff_invitations(daycare_id, status);
create index staff_invitations_email_idx on public.staff_invitations(lower(email));
create index staff_invitations_invited_by_idx on public.staff_invitations(invited_by);

create table public.staff_invitation_rooms (
  invitation_id uuid not null references public.staff_invitations(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  primary key (invitation_id, room_id)
);
create index staff_invitation_rooms_room_id_idx on public.staff_invitation_rooms(room_id);

-- No client can mutate membership tables. All writes below are transactional RPCs.
create function public.check_staff_room_membership() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.users u join public.rooms r on r.daycare_id = u.daycare_id
    where u.id = new.staff_id and u.role = 'staff' and r.id = new.room_id
  ) then raise exception 'invalid_staff_room' using errcode = '23514'; end if;
  return new;
end $$;
create trigger check_staff_room_membership before insert or update on public.staff_rooms
  for each row execute function public.check_staff_room_membership();

create function public.check_staff_invitation_room() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.staff_invitations i join public.rooms r on r.daycare_id = i.daycare_id
    where i.id = new.invitation_id and r.id = new.room_id
  ) then raise exception 'invalid_invitation_room' using errcode = '23514'; end if;
  return new;
end $$;
create trigger check_staff_invitation_room before insert or update on public.staff_invitation_rooms
  for each row execute function public.check_staff_invitation_room();

revoke all on function public.check_staff_room_membership(), public.check_staff_invitation_room() from public, anon, authenticated;

-- Run before any room-scoped RLS changes, and only for the rooms existing now.
insert into public.staff_rooms(staff_id, room_id)
select u.id, r.id from public.users u join public.rooms r on r.daycare_id = u.daycare_id
where u.role = 'staff';

alter table public.staff_rooms enable row level security;
alter table public.staff_invitations enable row level security;
alter table public.staff_invitation_rooms enable row level security;
revoke all on public.staff_rooms, public.staff_invitations, public.staff_invitation_rooms from public, anon, authenticated;
grant select on public.staff_rooms, public.staff_invitations, public.staff_invitation_rooms to authenticated;

create function public.is_daycare_admin(p_daycare_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.users u where u.id = (select auth.uid())
    and u.role = 'admin' and u.status = 'active' and u.daycare_id = p_daycare_id);
$$;
revoke all on function public.is_daycare_admin(uuid) from public, anon;
grant execute on function public.is_daycare_admin(uuid) to authenticated;

create policy "Admins and staff read their memberships" on public.staff_rooms for select to authenticated
using (staff_id = (select auth.uid()) or public.is_daycare_admin(
  (select u.daycare_id from public.users u where u.id = staff_id)));
create policy "Admins read their staff invitations" on public.staff_invitations for select to authenticated
using (public.is_daycare_admin(daycare_id));
create policy "Admins read invitation rooms" on public.staff_invitation_rooms for select to authenticated
using (exists(select 1 from public.staff_invitations i where i.id = invitation_id and public.is_daycare_admin(i.daycare_id)));

-- Authenticated callers can execute only these narrow RPCs. Every RPC checks the
-- real database identity and tenancy before making privileged changes.
create function public.create_staff_invitation(
  p_name text, p_email text, p_code text, p_room_ids uuid[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_daycare uuid; v_id uuid; v_rooms uuid[];
begin
  select daycare_id into v_daycare from public.users
  where id = (select auth.uid()) and role = 'admin' and status = 'active';
  if v_daycare is null then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_name is null or btrim(p_name) = '' or p_email is null or lower(btrim(p_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_code !~ '^[01][A-HJ-NP-Z2-9]{4}$' then
    raise exception 'invalid_invitation' using errcode = '22023';
  end if;
  v_rooms := coalesce(p_room_ids, array[]::uuid[]);
  if cardinality(v_rooms) > 100 or cardinality(v_rooms) <> (select count(distinct id) from public.rooms
      where id = any(v_rooms) and daycare_id = v_daycare) then
    raise exception 'invalid_rooms' using errcode = '22023';
  end if;
  -- Serialize invitations of the same email across administrators.
  perform pg_advisory_xact_lock(hashtextextended(lower(btrim(p_email)), 0));
  update public.staff_invitations set status = 'expired'
    where email = lower(btrim(p_email)) and status = 'pending' and expires_at <= now();
  if exists(select 1 from auth.users where lower(email) = lower(btrim(p_email)))
    or exists(select 1 from public.staff_invitations where email = lower(btrim(p_email)) and status = 'pending') then
    raise exception 'email_in_use' using errcode = '23505';
  end if;
  insert into public.staff_invitations(daycare_id, invited_by, full_name, email, code, expires_at)
    values(v_daycare, (select auth.uid()), btrim(p_name), lower(btrim(p_email)), p_code, now() + interval '7 days')
    returning id into v_id;
  insert into public.staff_invitation_rooms(invitation_id, room_id)
    select v_id, unnest(v_rooms);
  return v_id;
end $$;

create function public.replace_staff_rooms(p_target_id uuid, p_invitation boolean, p_room_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_daycare uuid; v_rooms uuid[];
begin
  select daycare_id into v_daycare from public.users
    where id = (select auth.uid()) and role = 'admin' and status = 'active';
  if v_daycare is null then raise exception 'admin_required' using errcode = '42501'; end if;
  v_rooms := coalesce(p_room_ids, array[]::uuid[]);
  if cardinality(v_rooms) > 100 or cardinality(v_rooms) <> (select count(distinct id) from public.rooms
      where id = any(v_rooms) and daycare_id = v_daycare) then
    raise exception 'invalid_rooms' using errcode = '22023';
  end if;
  if p_invitation then
    perform 1 from public.staff_invitations where id = p_target_id and daycare_id = v_daycare
      and status = 'pending' and expires_at > now() for update;
    if not found then raise exception 'invitation_not_available' using errcode = '42501'; end if;
    delete from public.staff_invitation_rooms where invitation_id = p_target_id;
    insert into public.staff_invitation_rooms(invitation_id, room_id) select p_target_id, unnest(v_rooms);
  else
    perform 1 from public.users where id = p_target_id and daycare_id = v_daycare
      and role = 'staff' and status = 'active' for update;
    if not found then raise exception 'staff_not_available' using errcode = '42501'; end if;
    delete from public.staff_rooms where staff_id = p_target_id;
    insert into public.staff_rooms(staff_id, room_id) select p_target_id, unnest(v_rooms);
  end if;
end $$;

create function public.cancel_unsent_staff_invitation(p_invitation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.staff_invitations i set status = 'cancelled'
  where i.id = p_invitation_id and i.invited_by = (select auth.uid()) and i.status = 'pending'
    and public.is_daycare_admin(i.daycare_id);
  if not found then raise exception 'invitation_not_available' using errcode = '42501'; end if;
end $$;

create function public.accept_staff_invitation(p_invitation_id uuid, p_user_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_invitation public.staff_invitations%rowtype; v_email text; v_count integer;
begin
  select * into v_invitation from public.staff_invitations where id = p_invitation_id for update;
  if not found or v_invitation.status <> 'pending' or v_invitation.expires_at <= now() then
    raise exception 'invitation_not_available'; end if;
  select lower(email) into v_email from auth.users where id = p_user_id;
  if v_email is null or v_email <> v_invitation.email then raise exception 'invitation_email_mismatch'; end if;
  insert into public.users(id, daycare_id, role, status, full_name)
    values(p_user_id, v_invitation.daycare_id, 'staff', 'active', v_invitation.full_name);
  insert into public.staff_rooms(staff_id, room_id)
    select p_user_id, room_id from public.staff_invitation_rooms where invitation_id = p_invitation_id;
  get diagnostics v_count = row_count;
  update public.staff_invitations set status = 'accepted', accepted_at = now() where id = p_invitation_id;
  return v_count;
end $$;

revoke all on function public.create_staff_invitation(text,text,text,uuid[]),
  public.replace_staff_rooms(uuid,boolean,uuid[]), public.cancel_unsent_staff_invitation(uuid),
  public.accept_staff_invitation(uuid,uuid) from public, anon, authenticated;
grant execute on function public.create_staff_invitation(text,text,text,uuid[]),
  public.replace_staff_rooms(uuid,boolean,uuid[]), public.cancel_unsent_staff_invitation(uuid) to authenticated;
grant execute on function public.accept_staff_invitation(uuid,uuid) to service_role;
