create function public.can_staff_access_room(p_room_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.rooms r join public.users u on u.daycare_id = r.daycare_id
    where r.id = p_room_id and u.id = (select auth.uid()) and u.status = 'active'
      and (u.role = 'admin' or (u.role = 'staff' and exists(
        select 1 from public.staff_rooms sr where sr.staff_id = u.id and sr.room_id = r.id))));
$$;
create function public.can_staff_access_child(p_child_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.children c join public.rooms r on r.id = c.room_id
    join public.users u on u.daycare_id = r.daycare_id
    where c.id = p_child_id and u.id = (select auth.uid()) and u.status = 'active'
      and (u.role = 'admin' or (u.role = 'staff' and exists(
        select 1 from public.staff_rooms sr where sr.staff_id = u.id and sr.room_id = c.room_id))));
$$;
revoke all on function public.can_staff_access_room(uuid), public.can_staff_access_child(uuid) from public, anon;
grant execute on function public.can_staff_access_room(uuid), public.can_staff_access_child(uuid) to authenticated;

create or replace function public.is_daycare_staff(p_daycare_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.users u where u.id = (select auth.uid())
    and u.daycare_id = p_daycare_id and u.status = 'active'
    and (u.role = 'admin' or (u.role = 'staff' and exists(
      select 1 from public.staff_rooms sr where sr.staff_id = u.id))));
$$;
create or replace function public.is_child_daycare_staff(p_child_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_staff_access_child(p_child_id);
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.users u where u.id = (select auth.uid())
    and u.status = 'active' and (u.role = 'admin' or
      (u.role = 'staff' and exists(select 1 from public.staff_rooms sr where sr.staff_id = u.id))));
$$;

drop policy "Users can read their daycare rooms" on public.rooms;
create policy "Rooms readable by assigned staff admins and parents" on public.rooms for select to authenticated
using (public.can_staff_access_room(id) or exists(select 1 from public.users u
  where u.id = (select auth.uid()) and u.role = 'parent' and u.daycare_id = rooms.daycare_id));

drop policy "Staff can create children in their daycare" on public.children;
create policy "Staff can create children in assigned rooms" on public.children for insert to authenticated
with check (public.can_staff_access_room(room_id));

drop policy "Linked parents and daycare staff can update children" on public.children;
create policy "Linked parents and daycare staff can update children" on public.children for update to authenticated
using (public.is_linked_parent(id) or public.can_staff_access_child(id))
with check (public.is_linked_parent(id) or public.can_staff_access_room(room_id));

create or replace function public.authorize_child_update() returns trigger
language plpgsql set search_path = '' as $$
declare v_role public.user_role;
begin
  if current_user <> 'authenticated' then return new; end if;
  select u.role into v_role from public.users u where u.id = (select auth.uid()) and u.status = 'active';
  if v_role in ('staff', 'admin') then
    if new.id is distinct from old.id or new.status is distinct from old.status
      or new.created_at is distinct from old.created_at or new.updated_at is distinct from old.updated_at
      or new.photo_consent is distinct from old.photo_consent
      or not public.can_staff_access_room(old.room_id)
      or not public.can_staff_access_room(new.room_id) then
      raise exception 'Staff can only edit children in assigned rooms' using errcode = '42501';
    end if;
  elsif v_role = 'parent' then
    if not public.is_linked_parent(old.id) or row(new.id, new.room_id, new.full_name,
      new.birth_date, new.enrolled_at, new.medical_notes, new.allergy_tags, new.status,
      new.created_at, new.updated_at) is distinct from
      row(old.id, old.room_id, old.full_name, old.birth_date, old.enrolled_at,
        old.medical_notes, old.allergy_tags, old.status, old.created_at, old.updated_at) then
      raise exception 'Parents can only edit photo consent' using errcode = '42501';
    end if;
  else raise exception 'Child update not permitted' using errcode = '42501'; end if;
  return new;
end $$;

-- A staff member must not enumerate all employee or parent profiles in their daycare.
create or replace function public.can_read_user_profile(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user_id = (select auth.uid())
    or exists(select 1 from public.users target join public.users me on me.daycare_id = target.daycare_id
      where target.id = p_user_id and me.id = (select auth.uid()) and me.status = 'active'
        and me.role = 'admin')
    or exists(select 1 from public.parent_children pc
      where pc.parent_id = p_user_id and public.can_staff_access_child(pc.child_id))
    or exists(select 1 from public.parent_children mine join public.parent_children other
      on other.child_id = mine.child_id where mine.parent_id = (select auth.uid())
      and other.parent_id = p_user_id);
$$;

-- Publication visibility is audience-based, never author-based. Historical
-- posts retain their author and remain visible to the current audience.
create or replace function public.can_read_post(p_post_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.posts p join public.users me on me.id = (select auth.uid())
    where p.id = p_post_id and p.daycare_id = me.daycare_id and me.status = 'active'
      and (me.role = 'admin'
        or (me.role = 'staff' and (
          (p.room_id is not null and exists(select 1 from public.staff_rooms sr
            where sr.staff_id = me.id and sr.room_id = p.room_id))
          or (p.room_id is null and p.type <> 'announcement'
            and exists(select 1 from public.post_children pc where pc.post_id = p.id)
            and not exists(select 1 from public.post_children pc join public.children c on c.id = pc.child_id
              where pc.post_id = p.id and not exists(select 1 from public.staff_rooms sr
                where sr.staff_id = me.id and sr.room_id = c.room_id)))))
        or (me.role = 'parent' and (
          exists(select 1 from public.post_children pc join public.parent_children link on link.child_id = pc.child_id
            where pc.post_id = p.id and link.parent_id = me.id)
          or (p.room_id is not null and exists(select 1 from public.parent_children link
            join public.children c on c.id = link.child_id where link.parent_id = me.id and c.room_id = p.room_id))
          or (p.type = 'announcement' and p.room_id is null)))));
$$;

drop policy "Staff can publish posts for their daycare" on public.posts;
create policy "Staff publish only to assigned rooms" on public.posts for insert to authenticated
with check (public.is_staff() and daycare_id = public.current_daycare_id()
  and author_id = (select auth.uid()) and room_id is not null
  and public.can_staff_access_room(room_id));
create policy "Admins publish general announcements" on public.posts for insert to authenticated
with check (public.is_daycare_admin(daycare_id) and author_id = (select auth.uid())
  and room_id is null and type = 'announcement');

drop policy "Staff can tag children of their daycare" on public.post_children;
create policy "Authors can tag their assigned children" on public.post_children for insert to authenticated
with check (public.can_staff_access_child(child_id) and exists(select 1 from public.posts p
  where p.id = post_id and p.author_id = (select auth.uid()) and p.room_id is null
    and p.type <> 'announcement'));

drop policy "Staff can attach photos to their daycare posts" on public.post_photos;
create policy "Authors attach photos to accessible posts" on public.post_photos for insert to authenticated
with check (public.can_read_post(post_id) and public.post_photos_allowed(post_id) and exists(select 1 from public.posts p
  where p.id = post_id and (p.author_id = (select auth.uid()) or public.is_daycare_admin(p.daycare_id)))
  and (storage.foldername(storage_path))[1] = public.current_daycare_id()::text
  and (storage.foldername(storage_path))[2] = post_id::text);

-- A room-less individual post must be inserted together with its audience.
-- Direct inserts cannot create an orphan post, and failures roll back both.
create function public.publish_individual_post(p_id uuid, p_type public.post_type,
  p_title text, p_body text, p_idempotency_key text, p_child_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
declare v_user public.users%rowtype;
begin
  select * into v_user from public.users where id = (select auth.uid()) and status = 'active';
  if v_user.role not in ('admin', 'staff') or v_user.id is null or p_type = 'announcement'
    or p_id is null or p_idempotency_key is null or p_body is null
    or cardinality(coalesce(p_child_ids, array[]::uuid[])) < 1
    or cardinality(p_child_ids) > 100
    or cardinality(p_child_ids) <> (select count(distinct c.id) from public.children c
      join public.rooms r on r.id = c.room_id where c.id = any(p_child_ids)
        and r.daycare_id = v_user.daycare_id and (v_user.role = 'admin' or exists(
          select 1 from public.staff_rooms sr where sr.staff_id = v_user.id and sr.room_id = c.room_id))) then
    raise exception 'invalid_post_audience' using errcode = '42501';
  end if;
  insert into public.posts(id, daycare_id, author_id, room_id, type, title, body, idempotency_key)
    values(p_id, v_user.daycare_id, v_user.id, null, p_type, p_title, p_body, p_idempotency_key);
  insert into public.post_children(post_id, child_id) select p_id, unnest(p_child_ids);
end $$;
revoke all on function public.publish_individual_post(uuid,public.post_type,text,text,text,uuid[]) from public, anon;
grant execute on function public.publish_individual_post(uuid,public.post_type,text,text,text,uuid[]) to authenticated;

-- Storage paths are not a substitute for checking the linked post and author.
drop policy "Staff can upload post photos in their daycare" on storage.objects;
create policy "Authors upload photos for accessible posts" on storage.objects for insert to authenticated
with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = public.current_daycare_id()::text
  and exists(select 1 from public.posts p where p.id::text = (storage.foldername(name))[2]
    and (p.author_id = (select auth.uid()) or public.is_daycare_admin(p.daycare_id)) and public.can_read_post(p.id)
    and public.post_photos_allowed(p.id)));
drop policy "Staff can delete post photos in their daycare" on storage.objects;
create policy "Authors delete their own post photos" on storage.objects for delete to authenticated
using (bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = public.current_daycare_id()::text
  and (public.is_daycare_admin(public.current_daycare_id()) or
    (owner_id = (select auth.uid())::text
      and exists(select 1 from public.posts p where p.id::text = (storage.foldername(name))[2]
        and p.author_id = (select auth.uid()) and public.can_read_post(p.id)))));
