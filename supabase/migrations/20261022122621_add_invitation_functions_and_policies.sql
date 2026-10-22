create function public.is_daycare_staff(p_daycare_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users as u
    where u.id = (select auth.uid())
      and u.daycare_id = p_daycare_id
      and u.role in ('staff', 'admin')
  );
$$;

create function public.is_child_daycare_staff(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.children as c
    join public.rooms as r on r.id = c.room_id
    join public.users as u on u.daycare_id = r.daycare_id
    where c.id = p_child_id
      and u.id = (select auth.uid())
      and u.role in ('staff', 'admin')
  );
$$;

create function public.is_linked_parent(p_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parent_children as pc
    where pc.child_id = p_child_id
      and pc.parent_id = (select auth.uid())
  );
$$;

create function public.can_read_user_profile(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    p_user_id = (select auth.uid())
    or exists (
      select 1
      from public.users as target
      join public.users as me on me.id = (select auth.uid())
      where target.id = p_user_id
        and me.role in ('staff', 'admin')
        and me.daycare_id = target.daycare_id
    )
    or exists (
      select 1
      from public.parent_children as mine
      join public.parent_children as other on other.child_id = mine.child_id
      where mine.parent_id = (select auth.uid())
        and other.parent_id = p_user_id
    );
$$;

revoke all on function public.is_daycare_staff(uuid) from public, anon;
revoke all on function public.is_child_daycare_staff(uuid) from public, anon;
revoke all on function public.is_linked_parent(uuid) from public, anon;
revoke all on function public.can_read_user_profile(uuid) from public, anon;

grant execute on function public.is_daycare_staff(uuid) to authenticated;
grant execute on function public.is_child_daycare_staff(uuid) to authenticated;
grant execute on function public.is_linked_parent(uuid) to authenticated;
grant execute on function public.can_read_user_profile(uuid) to authenticated;

create function public.email_has_account(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users as u
    where lower(u.email) = lower(btrim(p_email))
  );
$$;

create function public.accept_invitation(p_invitation_id uuid, p_user_id uuid, p_full_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations%rowtype;
  v_email text;
  v_daycare_id uuid;
begin
  select *
  into v_invitation
  from public.invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'invitation_not_found';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'invitation_not_pending';
  end if;

  if v_invitation.expires_at <= now() then
    raise exception 'invitation_expired';
  end if;

  select lower(u.email)
  into v_email
  from auth.users as u
  where u.id = p_user_id;

  if v_email is null or v_email <> lower(v_invitation.email) then
    raise exception 'invitation_email_mismatch';
  end if;

  select r.daycare_id
  into v_daycare_id
  from public.children as c
  join public.rooms as r on r.id = c.room_id
  where c.id = v_invitation.child_id;

  if v_daycare_id is null then
    raise exception 'invitation_child_not_found';
  end if;

  insert into public.users (id, daycare_id, role, status, full_name)
  values (p_user_id, v_daycare_id, 'parent', 'active', p_full_name);

  insert into public.parent_children (parent_id, child_id, relationship)
  values (p_user_id, v_invitation.child_id, v_invitation.relationship);

  update public.invitations
  set status = 'accepted',
      accepted_at = now()
  where id = v_invitation.id;
end;
$$;

revoke all on function public.email_has_account(text) from public, anon, authenticated;
revoke all on function public.accept_invitation(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.email_has_account(text) to service_role;
grant execute on function public.accept_invitation(uuid, uuid, text) to service_role;

drop policy "Users can read their daycare children" on public.children;

create policy "Children are readable by linked parents and daycare staff"
on public.children for select to authenticated
using (
  public.is_linked_parent(id)
  or public.is_child_daycare_staff(id)
);

create policy "Linked parents and daycare staff can update children"
on public.children for update to authenticated
using (
  public.is_linked_parent(id)
  or public.is_child_daycare_staff(id)
)
with check (
  public.is_linked_parent(id)
  or public.is_child_daycare_staff(id)
);

grant update (photo_consent) on table public.children to authenticated;

create policy "Staff can read invitations for their daycare children"
on public.invitations for select to authenticated
using (public.is_child_daycare_staff(child_id));

create policy "Staff can invite parents for their daycare children"
on public.invitations for insert to authenticated
with check (
  public.is_child_daycare_staff(child_id)
  and invited_by = (select auth.uid())
);

create policy "Parents and staff can read parent links"
on public.parent_children for select to authenticated
using (
  parent_id = (select auth.uid())
  or public.is_child_daycare_staff(child_id)
);

create policy "Users can read profiles of their daycare and shared children"
on public.users for select to authenticated
using (public.can_read_user_profile(id));
