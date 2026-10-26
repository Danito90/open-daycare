create type public.post_type as enum (
  'meal',
  'nap',
  'activity',
  'achievement',
  'photo',
  'announcement'
);

create table public.posts (
  id uuid primary key,
  daycare_id uuid not null references public.daycares (id) on delete restrict,
  author_id uuid not null references public.users (id) on delete restrict,
  room_id uuid references public.rooms (id) on delete restrict,
  type public.post_type not null,
  title text,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  idempotency_key text not null,
  constraint posts_title_length check (
    title is null
    or (char_length(title) <= 80 and title ~ '[^[:space:]]')
  ),
  constraint posts_body_length check (
    char_length(body) <= 2000 and body ~ '[^[:space:]]'
  ),
  constraint posts_idempotency_key_not_blank check (idempotency_key ~ '[^[:space:]]'),
  constraint posts_author_id_idempotency_key_key unique (author_id, idempotency_key)
);

create index posts_feed_idx on public.posts (daycare_id, published_at desc, id desc);
create index posts_room_published_idx on public.posts (room_id, published_at desc);
create index posts_author_id_idx on public.posts (author_id);

create function public.set_posts_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

revoke all on function public.set_posts_updated_at() from public, anon, authenticated;

create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_posts_updated_at();

create table public.post_children (
  post_id uuid not null references public.posts (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  primary key (post_id, child_id)
);

create index post_children_child_id_idx on public.post_children (child_id);

create table public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null unique,
  alt text,
  width int,
  height int,
  position int not null,
  created_at timestamptz not null default now(),
  constraint post_photos_storage_path_not_blank check (storage_path ~ '[^[:space:]]'),
  constraint post_photos_alt_length check (alt is null or char_length(alt) <= 140),
  constraint post_photos_width_positive check (width is null or width > 0),
  constraint post_photos_height_positive check (height is null or height > 0),
  constraint post_photos_position_non_negative check (position >= 0),
  constraint post_photos_post_id_position_key unique (post_id, position)
);

create index post_photos_post_id_idx on public.post_photos (post_id);

alter table public.posts enable row level security;
alter table public.post_children enable row level security;
alter table public.post_photos enable row level security;

revoke all on table public.posts from public, anon, authenticated;
revoke all on table public.post_children from public, anon, authenticated;
revoke all on table public.post_photos from public, anon, authenticated;

grant select, insert on table public.posts to authenticated;
grant select, insert on table public.post_children to authenticated;
grant select, insert on table public.post_photos to authenticated;
