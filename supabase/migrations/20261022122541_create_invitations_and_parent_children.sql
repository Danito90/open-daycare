create type public.relationship_type as enum ('father', 'mother', 'guardian');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  invited_by uuid not null references public.users (id) on delete restrict,
  full_name text not null constraint invitations_full_name_not_blank check (full_name ~ '[^[:space:]]'),
  email text not null
    constraint invitations_email_not_blank check (email ~ '[^[:space:]]')
    constraint invitations_email_normalized check (email = lower(email) and email = btrim(email)),
  relationship public.relationship_type not null,
  code text not null constraint invitations_code_format check (code ~ '^[A-Z2-9]{5}$'),
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index invitations_code_active_key
  on public.invitations (code)
  where status in ('pending', 'accepted');

create unique index invitations_child_email_pending_key
  on public.invitations (child_id, lower(email))
  where status = 'pending';

create index invitations_child_id_status_idx on public.invitations (child_id, status);
create index invitations_lower_email_idx on public.invitations (lower(email));

create table public.parent_children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  relationship public.relationship_type not null,
  created_at timestamptz not null default now(),
  constraint parent_children_parent_id_child_id_key unique (parent_id, child_id)
);

create index parent_children_parent_id_idx on public.parent_children (parent_id);
create index parent_children_child_id_idx on public.parent_children (child_id);

alter table public.invitations enable row level security;
alter table public.parent_children enable row level security;

revoke all on table public.invitations from public, anon, authenticated;
revoke all on table public.parent_children from public, anon, authenticated;

grant all on table public.invitations to service_role;
grant all on table public.parent_children to service_role;

grant select, insert on table public.invitations to authenticated;
grant select on table public.parent_children to authenticated;
