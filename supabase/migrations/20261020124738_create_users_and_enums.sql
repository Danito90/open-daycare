create type public.user_role as enum ('staff', 'parent', 'admin');
create type public.user_status as enum ('pending', 'active');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  daycare_id uuid not null references public.daycares (id) on delete restrict,
  role public.user_role not null,
  status public.user_status not null default 'active',
  full_name text not null constraint users_full_name_not_blank check (full_name ~ '[^[:space:]]'),
  avatar_url text,
  notify_on_post boolean not null default true,
  daily_summary_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_daycare_id_idx on public.users (daycare_id);

create function public.set_users_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

revoke all on function public.set_users_updated_at() from public, anon, authenticated;

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_users_updated_at();

alter table public.users enable row level security;

revoke all on table public.users from public, anon, authenticated;
grant select on table public.users to authenticated;
grant update (full_name, avatar_url, notify_on_post, daily_summary_enabled)
  on table public.users to authenticated;

create policy "Users can read their own profile"
on public.users for select to authenticated
using (id = (select auth.uid()));

create policy "Users can edit their own profile"
on public.users for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- SPEC 08 left daycares inaccessible to clients until membership was defined.
revoke all on table public.daycares from public, anon, authenticated;
grant select on table public.daycares to authenticated;

create policy "Users can read their own daycare"
on public.daycares for select to authenticated
using (
  id in (
    select u.daycare_id
    from public.users as u
    where u.id = (select auth.uid())
  )
);
