-- Thread images: up to 3 photos per thread, shown as a gallery under the text. The files live in
-- Backblaze B2 behind the Cloudflare media Worker; this table holds what the gallery needs and
-- decides who may add or remove them. Images are immutable: replacing one is a delete and an insert.
-- The gallery shows them in the order they were added (by id).

create table public.thread_images (
  id bigint generated always as identity primary key,
  thread_id bigint not null references public.threads (id) on delete cascade,
  -- Null after account deletion: the image stays with the thread, like its text.
  owner_id uuid default auth.uid() references public.profiles (id) on delete set null,
  storage_key text not null unique check (
    storage_key ~ '^threads/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|jpg)$'
  ),
  -- Safari cannot encode WebP, so JPEG is the fallback.
  content_type text not null check (content_type in ('image/webp', 'image/jpeg')),
  width int not null check (width between 1 and 1600),
  height int not null check (height between 1 and 1600),
  size_bytes int not null check (size_bytes between 1 and 1000000),
  alt_text text check (alt_text is null or char_length(btrim(alt_text)) between 1 and 200),
  created_at timestamptz not null default now(),
  constraint thread_images_type_matches_key check (
    storage_key like case content_type when 'image/webp' then '%.webp' else '%.jpg' end
  )
);

create index thread_images_thread_id_idx on public.thread_images (thread_id);
-- Per-member and site-wide upload limits.
create index thread_images_owner_created_idx on public.thread_images (owner_id, created_at);
create index thread_images_created_idx on public.thread_images (created_at);

-- Files of deleted images, waiting for the nightly cleanup to remove them from the bucket. Every
-- way a row leaves thread_images passes through here: the app, a member calling the API directly,
-- a thread deletion. Until its file is gone an image still counts toward the upload limits with
-- its original owner and upload time, so deleting and uploading again neither resets a daily
-- limit nor frees storage.
create table public.media_deletions (
  storage_key text primary key,
  size_bytes int not null,
  owner_id uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null,
  queued_at timestamptz not null default now()
);

create index media_deletions_owner_uploaded_idx on public.media_deletions (owner_id, uploaded_at);
create index media_deletions_uploaded_idx on public.media_deletions (uploaded_at);

-- Adding or removing images on a public thread is an edit that moderators review like a text
-- edit: the revision keeps the gallery as it was (storage keys in display order) next to the
-- title and text, which did not change. Null on text revisions.
alter table public.thread_revisions add column image_keys text[];

-- Who may add images to a thread right now: only its author, as with its text. Runs as the caller,
-- so a thread they cannot read looks the same as one they may not change.
create function public.assert_can_add_thread_images(p_thread_id bigint)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  message text := public.restriction_block_message(true);
  target record;
begin
  if message is not null then
    raise exception '%', message using errcode = 'P0001';
  end if;

  select t.status, t.author_id into target from public.threads t where t.id = p_thread_id;
  if not found or target.author_id is distinct from (select auth.uid()) then
    raise exception 'only the author can add images to a thread' using errcode = '42501';
  end if;
  if target.status = 'archived' then
    raise exception 'archived threads are read-only' using errcode = '42501';
  end if;
end;
$$;

-- Only called once the caller may change the thread, so it counts every image of it. Images the
-- author removes right after the check, to replace one in a full gallery, leave their room.
create function public.assert_thread_image_room(p_thread_id bigint, p_count int, p_removed_ids bigint[] default '{}')
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if (
    select count(*) from public.thread_images
    where thread_id = p_thread_id and not coalesce(id = any (p_removed_ids), false)
  ) + p_count > 3 then
    raise exception 'a thread can have at most 3 images' using errcode = 'P0001';
  end if;
end;
$$;

-- Rolling 24-hour limits and the storage cap count every image in the forum, pending threads
-- included, plus the deleted ones whose files are still queued. Members get 6 new images a day
-- (moderators are exempt), the forum 300 (only the service role is exempt).
-- The cap applies to everyone: Backblaze's free 10 GB is shared with the nightly backups.
-- p_client is false for the service role and seeds, which only the storage cap binds.
create function public.enforce_image_limits(p_count int, p_bytes bigint, p_client boolean)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  since timestamptz := now() - interval '24 hours';
begin
  if p_client and not public.is_moderator() and (
    select count(*) from public.thread_images where owner_id = (select auth.uid()) and created_at > since
  ) + (
    select count(*) from public.media_deletions where owner_id = (select auth.uid()) and uploaded_at > since
  ) + p_count > 6 then
    raise exception 'rate limit: %', 'You can add up to 6 images a day. Please try again tomorrow.'
      using errcode = 'P0001';
  end if;
  if p_client and (
    select count(*) from public.thread_images where created_at > since
  ) + (
    select count(*) from public.media_deletions where uploaded_at > since
  ) + p_count > 300 then
    raise exception 'rate limit: %', 'The forum has reached its daily limit for new images. Please try again tomorrow.'
      using errcode = 'P0001';
  end if;
  if (select coalesce(sum(size_bytes), 0) from public.thread_images)
    + (select coalesce(sum(size_bytes), 0) from public.media_deletions)
    + p_bytes > 8000000000 then
    raise exception 'image storage is full' using errcode = 'P0001';
  end if;
end;
$$;

-- One queue for every image insert: the site-wide and storage limits are global, so parallel
-- uploads must not race past them.
create function public.thread_images_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.alt_text := nullif(btrim(new.alt_text), '');
  if current_user in ('anon', 'authenticated') then
    perform public.assert_can_add_thread_images(new.thread_id);
  end if;
  perform pg_advisory_xact_lock(hashtextextended('thread_images', 0));
  perform public.assert_thread_image_room(new.thread_id, 1);
  return new;
end;
$$;

create trigger thread_images_before_insert
  before insert on public.thread_images
  for each row execute function public.thread_images_before_insert();

-- Checked once the whole statement is in, so a batch fails with the same error
-- check_image_upload() predicts for it.
create function public.thread_images_enforce_limits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from inserted) then
    perform public.enforce_image_limits(0, 0, current_user in ('anon', 'authenticated'));
  end if;
  return null;
end;
$$;

create trigger thread_images_enforce_limits
  after insert on public.thread_images
  referencing new table as inserted
  for each statement execute function public.thread_images_enforce_limits();

-- The cleanup deletes every queued file, so a queued key must not come back into a gallery.
create function public.thread_images_reject_queued_keys()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from changed c join public.media_deletions d on d.storage_key = c.storage_key) then
    raise exception 'a deleted image cannot be added again' using errcode = '23505';
  end if;
  return null;
end;
$$;

create trigger thread_images_reject_queued_keys
  after insert on public.thread_images
  referencing new table as changed
  for each statement execute function public.thread_images_reject_queued_keys();

-- Removing an image is an edit: banned members cannot, muted ones still can. Archived threads
-- stay as they were.
create function public.thread_images_before_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  message text;
begin
  if current_user not in ('anon', 'authenticated') then
    return old;
  end if;
  message := public.restriction_block_message(false);
  if message is not null then
    raise exception '%', message using errcode = 'P0001';
  end if;
  if (select t.status from public.threads t where t.id = old.thread_id) = 'archived' then
    raise exception 'archived threads are read-only' using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger thread_images_before_delete
  before delete on public.thread_images
  for each row execute function public.thread_images_before_delete();

create function public.thread_images_queue_deletion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.media_deletions (storage_key, size_bytes, owner_id, uploaded_at)
  values (old.storage_key, old.size_bytes, old.owner_id, old.created_at)
  on conflict (storage_key) do nothing;
  return null;
end;
$$;

create trigger thread_images_queue_deletion
  after delete on public.thread_images
  for each row execute function public.thread_images_queue_deletion();

-- One revision per public thread and statement, so a batch reads as one edit. Pending and
-- rejected threads are reviewed as a whole on approval; a thread posted with its images in this
-- transaction is new, not edited; a deleted thread has nothing left to review.
-- edited_at changes like on a text edit. This runs as the owner, so the thread guards let it
-- through, and with title and body unchanged no text revision follows.
-- A new or removed image can change what the thread says, so as with a text edit a member's
-- change drops the verification and a moderator's keeps it. The caller's role comes from the
-- role setting, since current_user is the owner here.
create function public.thread_images_record_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  revised bigint[];
  unverify boolean := current_setting('role') in ('anon', 'authenticated') and not public.is_moderator();
begin
  with gallery_before as (
    select i.thread_id, i.id, i.storage_key from public.thread_images i
    where i.thread_id in (select c.thread_id from changed c)
      and (tg_op = 'DELETE' or i.id not in (select c.id from changed c))
    union all
    select c.thread_id, c.id, c.storage_key from changed c where tg_op = 'DELETE'
  ), revision as (
    insert into public.thread_revisions (thread_id, title, body, edited_by, image_keys)
    select t.id, t.title, t.body, (select auth.uid()),
      array(select g.storage_key from gallery_before g where g.thread_id = t.id order by g.id)
    from public.threads t
    where t.id in (select c.thread_id from changed c)
      and t.status in ('published', 'archived')
      and t.created_at <> now()
    returning thread_id
  )
  select array_agg(thread_id) into revised from revision;

  update public.threads
  set edited_at = now(),
    last_verified_at = case when unverify then null else last_verified_at end,
    verified_by = case when unverify then null else verified_by end
  where id = any (revised);
  return null;
end;
$$;

create trigger thread_images_revision_on_insert
  after insert on public.thread_images
  referencing new table as changed
  for each statement execute function public.thread_images_record_revision();

create trigger thread_images_revision_on_delete
  after delete on public.thread_images
  referencing old table as changed
  for each statement execute function public.thread_images_record_revision();

-- Asked before any file is uploaded, so nothing reaches storage when the insert would fail.
-- Raises what adding p_count images of p_bytes in total would raise, with the images in
-- p_removed_ids already gone from the thread. Without a thread it checks only the image limits:
-- create_thread_with_images() runs the thread's own checks, and the server deletes the uploaded
-- files when it fails.
create function public.check_image_upload(
  p_thread_id bigint,
  p_count int,
  p_bytes bigint,
  p_removed_ids bigint[] default '{}'
)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  client boolean := current_user in ('anon', 'authenticated');
begin
  if p_count is null or p_count < 0 or p_bytes is null or p_bytes < 0 then
    raise exception 'the image count and size cannot be negative' using errcode = '22023';
  end if;
  if p_count = 0 then
    return;
  end if;

  if p_thread_id is not null and client then
    perform public.assert_can_add_thread_images(p_thread_id);
  end if;
  perform public.assert_thread_image_room(p_thread_id, p_count, p_removed_ids);
  perform public.enforce_image_limits(p_count, p_bytes, client);
end;
$$;

-- A thread and the images it was posted with, in one transaction: the thread goes through the
-- same policies and triggers as a direct insert, and any image failing a check takes it back out.
-- p_images: [{storage_key, content_type, width, height, size_bytes, alt_text}], in gallery order.
create function public.create_thread_with_images(
  p_title text,
  p_body text,
  p_category_id bigint,
  p_city public.city,
  p_images jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_id bigint;
  created_slug text;
  images jsonb := coalesce(p_images, '[]'::jsonb);
begin
  if jsonb_typeof(images) <> 'array' then
    raise exception 'images must be a JSON array' using errcode = '22023';
  end if;

  insert into public.threads (title, body, category_id, city)
  values (p_title, p_body, p_category_id, p_city)
  returning id, slug into created_id, created_slug;

  -- The gallery order is the array order: the ids are drawn after the sort.
  insert into public.thread_images (thread_id, storage_key, content_type, width, height, size_bytes, alt_text)
  select created_id, image ->> 'storage_key', image ->> 'content_type', (image ->> 'width')::int,
    (image ->> 'height')::int, (image ->> 'size_bytes')::int, image ->> 'alt_text'
  from jsonb_array_elements(images) with ordinality as e(image, n)
  order by n;

  return created_slug;
end;
$$;

-- Row level security and grants. owner_id and created_at are not insertable, so they always
-- come from the session; there is no update at all.

alter table public.thread_images enable row level security;

revoke all on table public.thread_images from anon, authenticated;
revoke all on sequence public.thread_images_id_seq from anon, authenticated;
grant select on table public.thread_images to anon, authenticated;
grant insert (thread_id, storage_key, content_type, width, height, size_bytes, alt_text), delete
  on table public.thread_images to authenticated;

-- Exactly the readers of the thread: the subquery runs under the thread policies.
create policy "images are readable with their thread"
  on public.thread_images for select to anon, authenticated
  using (exists (select 1 from public.threads t where t.id = thread_images.thread_id));

-- Moderators do not change another member's gallery; a thread that must go is deleted whole.
create policy "authors add images to their threads"
  on public.thread_images for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.threads t
      where t.id = thread_images.thread_id
        and t.status <> 'archived'
        and t.author_id = (select auth.uid())
    )
  );

create policy "authors remove images from their threads"
  on public.thread_images for delete to authenticated
  using (
    exists (
      select 1 from public.threads t
      where t.id = thread_images.thread_id and t.author_id = (select auth.uid())
    )
  );

-- No policies and no client grants: the triggers above write the queue, and the nightly cleanup
-- reads and empties it as postgres.
alter table public.media_deletions enable row level security;
revoke all on table public.media_deletions from anon, authenticated;

revoke execute on function
  public.assert_can_add_thread_images(bigint),
  public.assert_thread_image_room(bigint, int, bigint[]),
  public.enforce_image_limits(int, bigint, boolean),
  public.thread_images_before_insert(),
  public.thread_images_enforce_limits(),
  public.thread_images_reject_queued_keys(),
  public.thread_images_before_delete(),
  public.thread_images_queue_deletion(),
  public.thread_images_record_revision(),
  public.check_image_upload(bigint, int, bigint, bigint[]),
  public.create_thread_with_images(text, text, bigint, public.city, jsonb)
from public, anon, authenticated;

-- The checks run as the caller inside triggers and check_image_upload(), so the caller needs them.
grant execute on function
  public.assert_can_add_thread_images(bigint),
  public.assert_thread_image_room(bigint, int, bigint[]),
  public.enforce_image_limits(int, bigint, boolean),
  public.check_image_upload(bigint, int, bigint, bigint[]),
  public.create_thread_with_images(text, text, bigint, public.city, jsonb)
to authenticated;
