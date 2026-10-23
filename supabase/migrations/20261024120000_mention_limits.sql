-- Mention limits per comment and thread, and reserved look-alike handles.

-- Mentions resolve in the order they first appear in the body, so a capped notification
-- batch goes to the people named first.
create or replace function public.mentioned_user_ids(body text)
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
  select p.id from tokens join public.profiles p on p.username = tokens.username
  order by tokens.first_seen;
$$;

-- A comment or thread body sends at most 10 mention notifications over its lifetime, so
-- rewriting it with new handles cannot be used to page the whole community.
create or replace function public.notify_thread_mentions(thread public.threads, actor uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (recipient_id, actor_id, type, thread_id)
  select m.id, actor, 'mention', thread.id
  from public.mentioned_user_ids(thread.body) with ordinality as m (id, n)
  where m.id is distinct from actor
    and m.id is distinct from thread.author_id
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = m.id and n.thread_id = thread.id
        and n.type = 'mention' and n.comment_id is null
    )
  order by m.n
  limit greatest(0, 10 - (
    select count(*) from public.notifications n
    where n.thread_id = thread.id and n.type = 'mention' and n.comment_id is null
  ));
$$;

create or replace function public.comments_notify_edit_mentions()
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
  from public.mentioned_user_ids(new.body) with ordinality as m (id, n)
  where m.id is distinct from new.author_id
    and not exists (
      select 1 from public.notifications n where n.recipient_id = m.id and n.comment_id = new.id
    )
  order by m.n
  limit greatest(0, 10 - (
    select count(*) from public.notifications n where n.comment_id = new.id and n.type = 'mention'
  ));
  return null;
end;
$$;

-- Handles that contain a staff word could pass for staff accounts. "mod" stays an exact
-- match only, because it starts real names such as Modassir. The check runs when a handle is
-- set, so handles chosen before this rule stay valid.
create or replace function public.is_reserved_username(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select name = any (array[
    'admin', 'mod', 'moderator', 'support', 'root', 'system', 'null', 'me', 'new', 'settings'
  ]) or name ~ '(admin|moderator|support)';
$$;

-- Staff words are dropped from generated handles ("Ali Admin Khan" -> ali_khan); a numeric
-- suffix alone could never make such a handle valid.
create or replace function public.generate_username(display_name text)
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
  base := lower(coalesce(display_name, ''));
  while base ~ '(admin|moderator|support)' loop
    base := regexp_replace(base, '(admin|moderator|support)', '', 'g');
  end loop;
  base := btrim(regexp_replace(base, '[^a-z0-9]+', '_', 'g'), '_');
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
