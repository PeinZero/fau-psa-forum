-- Replies (one level), @handles, mentions and in-app notifications.

-- Replies: one level deep. Replying to a reply attaches to the top-level comment; the UI
-- pre-fills the @handle of the person replied to.

alter table public.comments
  add column parent_id bigint references public.comments (id) on delete cascade;

create index comments_thread_parent_created_idx on public.comments (thread_id, parent_id, created_at);
create index comments_parent_id_idx on public.comments (parent_id);

-- Runs as the caller, so members can only reply to comments they can see.
create function public.comments_attach_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent record;
begin
  if new.parent_id is null then
    return new;
  end if;
  select thread_id, parent_id into parent from public.comments where id = new.parent_id;
  if not found or parent.thread_id <> new.thread_id then
    raise exception 'a reply must belong to a visible comment of the same thread' using errcode = '23514';
  end if;
  if parent.parent_id is not null then
    new.parent_id := parent.parent_id;
  end if;
  return new;
end;
$$;

create trigger comments_attach_parent
  before insert on public.comments
  for each row execute function public.comments_attach_parent();

-- Handles: stored lowercase in plain text with a format check, so uniqueness is
-- case-insensitive without depending on the citext extension.

create function public.is_reserved_username(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select name = any (array[
    'admin', 'mod', 'moderator', 'support', 'root', 'system', 'null', 'me', 'new', 'settings'
  ]);
$$;

-- Display name to handle: "Ayesha Khan" -> ayesha_khan, a numeric suffix when taken.
create function public.generate_username(display_name text)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  base text;
  candidate text;
  suffix int := 1;
begin
  base := btrim(regexp_replace(lower(coalesce(display_name, '')), '[^a-z0-9]+', '_', 'g'), '_');
  base := rtrim(left(base, 20), '_');
  if base = '' then
    base := 'user';
  elsif char_length(base) < 3 then
    base := base || '_user';
  end if;

  -- Serialises concurrent sign-ups that derive the same handle.
  perform pg_advisory_xact_lock(hashtextextended('username:' || base, 0));

  candidate := base;
  while public.is_reserved_username(candidate)
    or exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(base, 20 - char_length(suffix::text)) || suffix::text;
  end loop;
  return candidate;
end;
$$;

alter table public.profiles add column username text;

do $$
declare
  p record;
begin
  for p in select id, display_name from public.profiles where username is null order by created_at, id loop
    update public.profiles set username = public.generate_username(p.display_name) where id = p.id;
  end loop;
end;
$$;

alter table public.profiles
  alter column username set not null,
  add constraint profiles_username_key unique (username),
  add constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$');

-- New profiles get a generated handle; chosen handles are lowercased and validated with
-- messages the account page can show.
create function public.profiles_set_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.username is null then
    new.username := public.generate_username(new.display_name);
    return new;
  end if;
  if tg_op = 'UPDATE' and new.username is not distinct from old.username then
    return new;
  end if;

  new.username := lower(btrim(new.username));
  if new.username is null or new.username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'username must be 3 to 20 characters: letters, digits or underscores' using errcode = '23514';
  end if;
  if public.is_reserved_username(new.username) then
    raise exception 'username is reserved' using errcode = '23514';
  end if;
  if exists (select 1 from public.profiles where username = new.username and id <> new.id) then
    raise exception 'username is already taken' using errcode = '23505';
  end if;
  return new;
end;
$$;

create trigger profiles_set_username
  before insert or update of username on public.profiles
  for each row execute function public.profiles_set_username();

-- Mentions: the first 10 distinct @handles in a body that belong to existing users.
-- "@" must not follow a letter, digit or underscore, so email addresses never match.
create function public.mentioned_user_ids(body text)
returns setof uuid
language sql
stable
set search_path = ''
as $$
  with tokens as (
    select lower(m[1]) as username, min(n) as first_seen
    from regexp_matches(
      coalesce(body, ''), '(?:^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])', 'g'
    ) with ordinality as t (m, n)
    group by lower(m[1])
    order by first_seen
    limit 10
  )
  select p.id from tokens join public.profiles p on p.username = tokens.username;
$$;

-- Notifications

create type public.notification_type as enum (
  'reply', 'mention', 'thread_comment', 'thread_approved', 'thread_rejected', 'best_answer',
  'application_approved', 'application_rejected', 'mod_new_thread', 'mod_new_application',
  'mod_new_report'
);

create table public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type public.notification_type not null,
  thread_id bigint references public.threads (id) on delete cascade,
  comment_id bigint references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_recipient_read_created_idx
  on public.notifications (recipient_id, read_at, created_at desc);
create index notifications_actor_id_idx on public.notifications (actor_id);
create index notifications_thread_id_idx on public.notifications (thread_id);
create index notifications_comment_id_idx on public.notifications (comment_id);

-- Moderator queue items fan out to every moderator and superadmin except whoever caused them.
create function public.notify_moderators(
  kind public.notification_type, actor uuid, thread bigint, comment bigint
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (recipient_id, actor_id, type, thread_id, comment_id)
  select id, actor, kind, thread, comment
  from public.profiles
  where role in ('moderator', 'superadmin') and id is distinct from actor;
$$;

-- Thread mentions notify once per user and thread, whether the mention arrived at
-- publication or through a later edit.
create function public.notify_thread_mentions(thread public.threads, actor uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (recipient_id, actor_id, type, thread_id)
  select m.id, actor, 'mention', thread.id
  from public.mentioned_user_ids(thread.body) as m (id)
  where m.id is distinct from actor
    and m.id is distinct from thread.author_id
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = m.id and n.thread_id = thread.id
        and n.type = 'mention' and n.comment_id is null
    );
$$;

-- A visible comment notifies each person once: reply beats mention beats thread_comment.
create function public.comments_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.hidden_at is not null
    or not exists (select 1 from public.threads where id = new.thread_id and status = 'published') then
    return null;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, thread_id, comment_id)
  select distinct on (c.recipient) c.recipient, new.author_id, c.kind, new.thread_id, new.id
  from (
    select p.author_id as recipient, 'reply'::public.notification_type as kind, 1 as priority
    from public.comments p
    where p.id = new.parent_id and p.hidden_at is null
    union all
    select m.id, 'mention', 2 from public.mentioned_user_ids(new.body) as m (id)
    union all
    select t.author_id, 'thread_comment', 3 from public.threads t where t.id = new.thread_id
  ) c
  where c.recipient is not null and c.recipient is distinct from new.author_id
  order by c.recipient, c.priority;
  return null;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row execute function public.comments_notify();

-- Edits that add a mention notify the newly mentioned users who heard nothing about this comment yet.
create function public.comments_notify_edit_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.hidden_at is not null
    or not exists (select 1 from public.threads where id = new.thread_id and status = 'published') then
    return null;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, thread_id, comment_id)
  select m.id, new.author_id, 'mention', new.thread_id, new.id
  from public.mentioned_user_ids(new.body) as m (id)
  where m.id is distinct from new.author_id
    and not exists (
      select 1 from public.notifications n where n.recipient_id = m.id and n.comment_id = new.id
    );
  return null;
end;
$$;

create trigger comments_notify_edit_mentions
  after update of body on public.comments
  for each row
  when (old.body is distinct from new.body)
  execute function public.comments_notify_edit_mentions();

-- A hidden comment is unreadable for members, so it no longer appears in their notifications.
create function public.comments_retract_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications
  where comment_id = new.id and type in ('reply', 'mention', 'thread_comment');
  return null;
end;
$$;

create trigger comments_retract_notifications
  after update of hidden_at on public.comments
  for each row
  when (old.hidden_at is null and new.hidden_at is not null)
  execute function public.comments_retract_notifications();

create function public.threads_notify_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' then
    perform public.notify_moderators('mod_new_thread', new.author_id, new.id, null);
  elsif new.status = 'published' then
    perform public.notify_thread_mentions(new, new.author_id);
  end if;
  return null;
end;
$$;

create trigger threads_notify_insert
  after insert on public.threads
  for each row execute function public.threads_notify_insert();

-- Pending threads are visible to their author and moderators only, so their mentions wait
-- until publication.
create function public.threads_notify_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  if new.status is distinct from old.status then
    if new.status = 'published' and old.status in ('pending', 'rejected') then
      if new.author_id is distinct from actor then
        insert into public.notifications (recipient_id, actor_id, type, thread_id)
        select new.author_id, actor, 'thread_approved', new.id where new.author_id is not null;
      end if;
      perform public.notify_thread_mentions(new, new.author_id);
    elsif new.status = 'rejected' and new.author_id is distinct from actor then
      insert into public.notifications (recipient_id, actor_id, type, thread_id)
      select new.author_id, actor, 'thread_rejected', new.id where new.author_id is not null;
    end if;
  end if;

  if new.status = 'published'
    and new.body is distinct from old.body then
    perform public.notify_thread_mentions(new, coalesce(actor, new.author_id));
  end if;

  if new.best_comment_id is not null and new.best_comment_id is distinct from old.best_comment_id
    and new.status in ('published', 'archived') then
    insert into public.notifications (recipient_id, actor_id, type, thread_id, comment_id)
    select c.author_id, actor, 'best_answer', new.id, c.id
    from public.comments c
    where c.id = new.best_comment_id and c.author_id is not null and c.author_id is distinct from actor;
  end if;
  return null;
end;
$$;

create trigger threads_notify_update
  after update on public.threads
  for each row execute function public.threads_notify_update();

create function public.moderator_applications_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform public.notify_moderators('mod_new_application', new.user_id, null, null);
    end if;
  elsif old.status = 'pending' and new.status in ('approved', 'rejected') then
    insert into public.notifications (recipient_id, actor_id, type)
    values (
      new.user_id,
      new.reviewed_by,
      case when new.status = 'approved' then 'application_approved' else 'application_rejected' end::public.notification_type
    );
  end if;
  return null;
end;
$$;

create trigger moderator_applications_notify
  after insert or update of status on public.moderator_applications
  for each row execute function public.moderator_applications_notify();

create function public.reports_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_moderators(
    'mod_new_report',
    new.reporter_id,
    coalesce(new.thread_id, (select thread_id from public.comments where id = new.comment_id)),
    new.comment_id
  );
  return null;
end;
$$;

create trigger reports_notify
  after insert on public.reports
  for each row execute function public.reports_notify();

-- Marks the caller's unread notifications; runs as the caller, so RLS scopes it to their rows.
create function public.mark_all_notifications_read()
returns void
language sql
set search_path = ''
as $$
  update public.notifications set read_at = now()
  where recipient_id = (select auth.uid()) and read_at is null;
$$;

-- Row level security and grants

alter table public.notifications enable row level security;

revoke all on table public.notifications from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select, update (read_at) on table public.notifications to authenticated;
grant insert (parent_id) on table public.comments to authenticated;
grant update (username) on table public.profiles to authenticated;

create policy "recipients read their notifications"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

create policy "recipients mark their notifications read"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

revoke execute on function
  public.comments_attach_parent(),
  public.is_reserved_username(text),
  public.generate_username(text),
  public.profiles_set_username(),
  public.mentioned_user_ids(text),
  public.notify_moderators(public.notification_type, uuid, bigint, bigint),
  public.notify_thread_mentions(public.threads, uuid),
  public.comments_notify(),
  public.comments_notify_edit_mentions(),
  public.comments_retract_notifications(),
  public.threads_notify_insert(),
  public.threads_notify_update(),
  public.moderator_applications_notify(),
  public.reports_notify(),
  public.mark_all_notifications_read()
from public, anon, authenticated;

grant execute on function public.mark_all_notifications_read() to authenticated;

-- Realtime: subscribers receive only the rows their select policy allows. PGlite and plain
-- Postgres have no supabase_realtime publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
