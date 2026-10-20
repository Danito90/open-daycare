create table public.daycares (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint daycares_name_not_blank check (name ~ '[^[:space:]]'),
  created_at timestamptz not null default now()
);

alter table public.daycares enable row level security;

revoke all on table public.daycares from public, anon, authenticated;

insert into public.daycares (name) values ('Guardería Sala Soles');
