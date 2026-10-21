do $$
declare
  invited_user_id uuid;
  target_daycare_id uuid;
  existing_profile public.users%rowtype;
begin
  select id into strict invited_user_id
  from auth.users
  where lower(email) = 'danieltorresaxion@gmail.com';

  select id into strict target_daycare_id
  from public.daycares
  where name = 'Guardería Sala Soles';

  select * into existing_profile
  from public.users
  where id = invited_user_id;

  if found then
    if existing_profile.daycare_id <> target_daycare_id
       or existing_profile.role <> 'staff'
       or existing_profile.full_name <> 'Daniel Torres' then
      raise exception 'The invited user already has a different profile';
    end if;
    return;
  end if;

  insert into public.users (id, daycare_id, role, status, full_name)
  values (invited_user_id, target_daycare_id, 'staff', 'active', 'Daniel Torres');
end;
$$;
