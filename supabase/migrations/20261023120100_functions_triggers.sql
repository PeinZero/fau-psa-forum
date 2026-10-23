-- Role helpers. Security definer so policies can read profiles without recursing into its RLS.

create function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('moderator', 'superadmin')
  );
$$;

create function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'superadmin'
  );
$$;

-- The guard triggers below police client writes only (current_user anon/authenticated).
-- Security definer functions, foreign-key cascades from account deletion and the service
-- role run as other roles and are trusted.

-- Profiles

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_name text;
begin
  chosen_name := btrim(left(btrim(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  )), 40));
  if char_length(chosen_name) < 2 then
    chosen_name := 'member-' || left(new.id::text, 8);
  end if;

  insert into public.profiles (id, display_name) values (new.id, chosen_name);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.profiles_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'roles change only through set_user_role()' using errcode = '42501';
  end if;
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'profile id and created_at are read-only' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.profiles_guard_update();

-- Threads

create function public.threads_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  base text;
begin
  base := left(trim(both '-' from regexp_replace(lower(new.title), '[^a-z0-9]+', '-', 'g')), 60);
  base := trim(trailing '-' from base);
  if base = '' then
    base := 'thread';
  end if;
  new.slug := base || '-' || left(replace(gen_random_uuid()::text, '-', ''), 6);

  if current_user in ('anon', 'authenticated') and not public.is_moderator() then
    -- Serialises concurrent submissions by the same author so the cap cannot be raced.
    perform pg_advisory_xact_lock(hashtextextended('pending_threads:' || new.author_id::text, 0));
    if (
      select count(*) from public.threads
      where author_id = new.author_id and status = 'pending'
    ) >= 3 then
      raise exception 'you already have 3 threads waiting for review' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger threads_before_insert
  before insert on public.threads
  for each row execute function public.threads_before_insert();

create function public.threads_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.best_comment_id is not null and new.best_comment_id is distinct from old.best_comment_id
    and not exists (
      select 1 from public.comments
      where id = new.best_comment_id and thread_id = new.id and hidden_at is null
    ) then
    raise exception 'best answer must be a visible comment of this thread' using errcode = '23514';
  end if;

  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if new.author_id is distinct from old.author_id
    or new.slug is distinct from old.slug
    or new.created_at is distinct from old.created_at
    or new.last_activity_at is distinct from old.last_activity_at
    or new.edited_at is distinct from old.edited_at then
    raise exception 'author, slug and timestamps of a thread are read-only' using errcode = '42501';
  end if;

  if public.is_moderator() then
    if new.status is distinct from old.status or new.rejection_reason is distinct from old.rejection_reason then
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();
    end if;
  elsif new.status is distinct from old.status
    or new.is_pinned is distinct from old.is_pinned
    or new.is_outdated is distinct from old.is_outdated
    or new.best_comment_id is distinct from old.best_comment_id
    or new.rejection_reason is distinct from old.rejection_reason
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at then
    raise exception 'only moderators can change moderation fields' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger threads_guard_update
  before update on public.threads
  for each row execute function public.threads_guard_update();

-- Edits to public threads go live immediately; moderators review them afterwards from the revisions.
create function public.threads_record_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status in ('published', 'archived')
    and (new.title is distinct from old.title or new.body is distinct from old.body) then
    insert into public.thread_revisions (thread_id, title, body, edited_by)
    values (old.id, old.title, old.body, (select auth.uid()));
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger threads_record_revision
  before update of title, body on public.threads
  for each row execute function public.threads_record_revision();

-- Comments

create function public.comments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.body is distinct from old.body then
    if not exists (
      select 1 from public.threads where id = new.thread_id and status = 'published'
    ) then
      raise exception 'comments are only possible on published threads' using errcode = '42501';
    end if;
  end if;

  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.hidden_at is not null or new.hidden_by is not null then
      raise exception 'only moderators can hide comments' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.thread_id is distinct from old.thread_id
    or new.author_id is distinct from old.author_id
    or new.created_at is distinct from old.created_at then
    raise exception 'thread, author and created_at of a comment are read-only' using errcode = '42501';
  end if;

  if new.hidden_at is distinct from old.hidden_at or new.hidden_by is distinct from old.hidden_by then
    if not public.is_moderator() then
      raise exception 'only moderators can hide comments' using errcode = '42501';
    end if;
    new.hidden_by := case when new.hidden_at is null then null else (select auth.uid()) end;
  end if;

  if new.body is distinct from old.body then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;

create trigger comments_guard
  before insert or update on public.comments
  for each row execute function public.comments_guard();

create function public.comments_bump_thread_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.threads set last_activity_at = new.created_at where id = new.thread_id;
  return null;
end;
$$;

create trigger comments_bump_thread_activity
  after insert on public.comments
  for each row execute function public.comments_bump_thread_activity();

-- Moderation RPCs

create function public.review_moderator_application(
  application_id bigint,
  decision public.application_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.moderator_applications;
begin
  if not public.is_moderator() then
    raise exception 'only moderators can review applications' using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected' using errcode = '22023';
  end if;

  select * into app from public.moderator_applications where id = application_id for update;
  if not found then
    raise exception 'application not found' using errcode = 'P0002';
  end if;
  if app.status <> 'pending' then
    raise exception 'application was already reviewed' using errcode = 'P0001';
  end if;
  if app.user_id = (select auth.uid()) then
    raise exception 'you cannot review your own application' using errcode = '42501';
  end if;

  update public.moderator_applications
  set status = decision, reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = application_id;

  if decision = 'approved' then
    update public.profiles set role = 'moderator' where id = app.user_id and role = 'member';
  end if;
end;
$$;

create function public.set_user_role(target uuid, new_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role_of_target public.user_role;
begin
  if not public.is_superadmin() then
    raise exception 'only the superadmin can change roles' using errcode = '42501';
  end if;

  -- Locking every superadmin row serialises concurrent demotions.
  perform 1 from public.profiles where role = 'superadmin' for update;

  select role into current_role_of_target from public.profiles where id = target for update;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  if current_role_of_target = 'superadmin' and new_role <> 'superadmin'
    and (select count(*) from public.profiles where role = 'superadmin') <= 1 then
    raise exception 'cannot demote the last superadmin' using errcode = 'P0001';
  end if;

  update public.profiles set role = new_role where id = target;
end;
$$;

-- Search: public threads matching on title/body or on a visible comment, title matches first.
create function public.search_threads(q text)
returns setof public.threads
language sql
stable
set search_path = ''
as $$
  with query as (
    select websearch_to_tsquery('english', q) as tsq
  ),
  hits as (
    select t.id, ts_rank(t.search, query.tsq) as rank, ts_filter(t.search, '{a}') @@ query.tsq as in_title
    from public.threads t, query
    where t.search @@ query.tsq
    union all
    select c.thread_id, ts_rank(c.search, query.tsq) * 0.5, false
    from public.comments c, query
    where c.search @@ query.tsq and c.hidden_at is null
  ),
  ranked as (
    select id, bool_or(in_title) as in_title, max(rank) as rank from hits group by id
  )
  select t.*
  from public.threads t
  join ranked r on r.id = t.id
  where t.status in ('published', 'archived')
  order by r.in_title desc, r.rank desc, t.last_activity_at desc;
$$;
