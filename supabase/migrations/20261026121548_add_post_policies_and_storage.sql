create function public.current_daycare_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.daycare_id
  from public.users as u
  where u.id = (select auth.uid());
$$;

create function public.is_staff()
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
      and u.role in ('staff', 'admin')
  );
$$;

create function public.can_read_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts as p
    join public.users as me on me.id = (select auth.uid())
    where p.id = p_post_id
      and me.daycare_id = p.daycare_id
      and (
        me.role in ('staff', 'admin')
        or exists (
          select 1
          from public.post_children as pc
          join public.parent_children as link on link.child_id = pc.child_id
          where pc.post_id = p.id
            and link.parent_id = me.id
        )
        or (
          p.room_id is not null
          and exists (
            select 1
            from public.parent_children as link
            join public.children as c on c.id = link.child_id
            where link.parent_id = me.id
              and c.room_id = p.room_id
          )
        )
        or (p.type = 'announcement' and p.room_id is null)
      )
  );
$$;

create function public.post_photos_allowed(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not (
    exists (
      select 1
      from public.posts as p
      join public.children as c on c.room_id = p.room_id
      where p.id = p_post_id
        and p.room_id is not null
        and c.photo_consent = false
    )
    or exists (
      select 1
      from public.posts as p
      join public.rooms as r on r.daycare_id = p.daycare_id
      join public.children as c on c.room_id = r.id
      where p.id = p_post_id
        and p.room_id is null
        and p.type = 'announcement'
        and c.photo_consent = false
    )
    or exists (
      select 1
      from public.posts as p
      join public.post_children as pc on pc.post_id = p.id
      join public.children as c on c.id = pc.child_id
      where p.id = p_post_id
        and p.room_id is null
        and p.type <> 'announcement'
        and c.photo_consent = false
    )
  );
$$;

create function public.can_read_photo(p_storage_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.post_photos as ph
    where ph.storage_path = p_storage_path
      and public.can_read_post(ph.post_id)
      and public.post_photos_allowed(ph.post_id)
  );
$$;

revoke all on function public.current_daycare_id() from public, anon;
revoke all on function public.is_staff() from public, anon;
revoke all on function public.can_read_post(uuid) from public, anon;
revoke all on function public.post_photos_allowed(uuid) from public, anon;
revoke all on function public.can_read_photo(text) from public, anon;

grant execute on function public.current_daycare_id() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.can_read_post(uuid) to authenticated;
grant execute on function public.post_photos_allowed(uuid) to authenticated;
grant execute on function public.can_read_photo(text) to authenticated;

create policy "Posts are readable by their audience"
on public.posts for select to authenticated
using (public.can_read_post(id));

create policy "Staff can publish posts for their daycare"
on public.posts for insert to authenticated
with check (
  public.is_staff()
  and daycare_id = public.current_daycare_id()
  and author_id = (select auth.uid())
  and (
    public.posts.room_id is null
    or exists (
      select 1
      from public.rooms as r
      where r.id = public.posts.room_id
        and r.daycare_id = public.posts.daycare_id
    )
  )
);

create policy "Post children are readable with their post"
on public.post_children for select to authenticated
using (public.can_read_post(post_id));

create policy "Staff can tag children of their daycare"
on public.post_children for insert to authenticated
with check (
  public.is_staff()
  and public.can_read_post(post_id)
  and exists (
    select 1
    from public.children as c
    join public.rooms as r on r.id = c.room_id
    where c.id = public.post_children.child_id
      and r.daycare_id = public.current_daycare_id()
  )
);

create policy "Post photos are readable when consent allows it"
on public.post_photos for select to authenticated
using (
  public.can_read_post(post_id)
  and public.post_photos_allowed(post_id)
);

create policy "Staff can attach photos to their daycare posts"
on public.post_photos for insert to authenticated
with check (
  public.is_staff()
  and public.can_read_post(post_id)
  and storage_path like public.current_daycare_id()::text || '/%'
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Staff can upload post photos in their daycare"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = public.current_daycare_id()::text
  and public.is_staff()
);

create policy "Post photos are readable by their audience"
on storage.objects for select to authenticated
using (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = public.current_daycare_id()::text
  and public.can_read_photo(name)
);

create policy "Staff can delete post photos in their daycare"
on storage.objects for delete to authenticated
using (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = public.current_daycare_id()::text
  and public.is_staff()
);
