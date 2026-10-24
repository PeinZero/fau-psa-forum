-- Ranking and moderator posts: thread votes, cached comment counts, browse sorts (hot, new,
-- top, active), and threads written by moderators go live without a review round.

-- Moderator posts

-- Moderators are the reviewers, so their own threads go live at once, reviewed by themselves,
-- and they are not held to the cap of 3 waiting for review. Seeds and the service role keep
-- whatever status they insert.
create or replace function public.threads_before_insert()
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

  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if public.is_moderator() then
    new.status := 'published';
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
    new.last_activity_at := now();
  else
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

-- Insert policies see the row after the before-insert trigger has set the status.
drop policy "members submit pending threads" on public.threads;
create policy "members submit pending threads, moderators publish"
  on public.threads for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (status = 'pending' or (status = 'published' and (select public.is_moderator())))
  );

-- A published insert already notifies the users mentioned in the body (threads_notify_insert),
-- and only pending inserts reach the moderator queue, so moderator posts page nobody else.

-- Cached counters

alter table public.threads
  add column comment_count int not null default 0,
  add column score int not null default 0;

-- Visible comments only (replies included): hidden ones are gone for the public.
create function public.comments_apply_thread_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta int;
begin
  if tg_op = 'INSERT' then
    delta := (new.hidden_at is null)::int;
  elsif tg_op = 'DELETE' then
    delta := -(old.hidden_at is null)::int;
  else
    delta := (new.hidden_at is null)::int - (old.hidden_at is null)::int;
  end if;
  if delta <> 0 then
    update public.threads set comment_count = comment_count + delta
    where id = coalesce(new.thread_id, old.thread_id);
  end if;
  return null;
end;
$$;

create trigger comments_apply_thread_count
  after insert or delete or update of hidden_at on public.comments
  for each row execute function public.comments_apply_thread_count();

-- Only votes and comments move the counters, even if a column grant were ever widened by mistake.
create function public.threads_guard_counters()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    raise exception 'the score and comment count of a thread change only through votes and comments'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger threads_guard_counters
  before update of score, comment_count on public.threads
  for each row
  when (old.score is distinct from new.score or old.comment_count is distinct from new.comment_count)
  execute function public.threads_guard_counters();

-- Thread votes: same rules as comment votes. Scores are public through threads.score, who voted
-- stays private to the voter, votes notify nobody.

create table public.thread_votes (
  thread_id bigint not null references public.threads (id) on delete cascade,
  -- Account deletion removes the person's votes and takes them back out of the scores.
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);

create index thread_votes_user_id_idx on public.thread_votes (user_id);

-- Runs as the caller. Archived threads are read-only: votes there can neither be cast, changed
-- nor withdrawn.
create function public.thread_votes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target record;
begin
  if current_user not in ('anon', 'authenticated') then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE'
    and (new.thread_id is distinct from old.thread_id or new.user_id is distinct from old.user_id) then
    raise exception 'a vote cannot be moved to another thread' using errcode = '42501';
  end if;

  select t.author_id, t.status into target
  from public.threads t
  where t.id = coalesce(new.thread_id, old.thread_id);

  if not found or target.status <> 'published' then
    raise exception 'voting is only possible on published threads' using errcode = '42501';
  end if;
  if target.author_id = (select auth.uid()) then
    raise exception 'you cannot vote on your own thread' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger thread_votes_guard
  before insert or update or delete on public.thread_votes
  for each row execute function public.thread_votes_guard();

create function public.thread_votes_apply_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.threads set score = score - old.value where id = old.thread_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.threads set score = score + new.value where id = new.thread_id;
  end if;
  return null;
end;
$$;

create trigger thread_votes_apply_score
  after insert or update or delete on public.thread_votes
  for each row execute function public.thread_votes_apply_score();

-- Muted and banned members cannot vote, and new votes share the comment votes' pace.
create trigger thread_votes_block_restricted
  before insert on public.thread_votes
  for each row execute function public.restrictions_block_writes();

create function public.thread_votes_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    perform pg_advisory_xact_lock(hashtextextended('rate_thread_votes:' || new.user_id::text, 0));
    perform public.enforce_rate_limit(
      (select count(*) from public.thread_votes where user_id = new.user_id and created_at > now() - interval '1 minute'),
      30, 'You are voting too fast. Please wait a minute and try again.'
    );
  end if;
  return new;
end;
$$;

create trigger thread_votes_rate_limit
  before insert on public.thread_votes
  for each row execute function public.thread_votes_rate_limit();

-- Reputation: a received thread vote counts like a comment vote (+1 / -1), never from oneself.
-- Deleting a thread takes the points it earned with it.

alter table public.reputation_events
  add column thread_id bigint references public.threads (id) on delete cascade;

create index reputation_events_thread_id_idx on public.reputation_events (thread_id);

create function public.award_thread_points(thread bigint, voter uuid, reason text, points int)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.reputation_events (user_id, points, reason, thread_id)
  select t.author_id, award_thread_points.points, award_thread_points.reason, t.id
  from public.threads t
  where t.id = award_thread_points.thread and t.author_id is not null
    and t.author_id is distinct from award_thread_points.voter;
$$;

create function public.thread_votes_apply_reputation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.value = old.value then
    return null;
  end if;
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.award_thread_points(
      old.thread_id, old.user_id, case when old.value > 0 then 'upvote' else 'downvote' end, -old.value
    );
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.award_thread_points(
      new.thread_id, new.user_id, case when new.value > 0 then 'upvote' else 'downvote' end, new.value
    );
  end if;
  return null;
end;
$$;

create trigger thread_votes_apply_reputation
  after insert or update or delete on public.thread_votes
  for each row execute function public.thread_votes_apply_reputation();

-- Backfill: the counters as if the triggers had always existed.
update public.threads t
set comment_count = c.n
from (
  select thread_id, count(*)::int as n from public.comments where hidden_at is null group by thread_id
) c
where c.thread_id = t.id and t.comment_count <> c.n;

update public.threads t
set score = v.total
from (select thread_id, sum(value)::int as total from public.thread_votes group by thread_id) v
where v.thread_id = t.id and t.score <> v.total;

-- Browse lists. Each indexed sort reads one of these in order; "hot" is computed per row and
-- sorted in memory, which is fine at a student forum's size (a few thousand threads).
create index threads_status_activity_id_idx on public.threads (status, last_activity_at desc, id desc);
create index threads_status_created_idx on public.threads (status, created_at desc, id desc);
create index threads_status_top_idx on public.threads (status, (score * 2 + comment_count) desc, id desc);
create index threads_category_status_activity_idx
  on public.threads (category_id, status, last_activity_at desc, id desc);
create index threads_category_status_created_idx
  on public.threads (category_id, status, created_at desc, id desc);

-- Published threads for the home and category pages, paged. Pinned threads are not lifted to the
-- top here: category pages show them in their own block. Filters:
-- - p_period: only threads created within the last week, month or year ('all' = no limit); the
--   UI offers it with "top", but it filters every sort so browse_threads_count matches.
-- - p_city: that city, both cities, or not city-specific (as on the category pages).
-- - p_q: case-insensitive substring of title or body, at most 100 characters (the search limit).
-- Sorts:
-- - hot: (score + 2·comments + 3 if answered + 1) / (hours since last activity + 2)^1.5, so
--   fresh discussion rises and quiet threads sink even with a high score
-- - new: newest first; top: score·2 + comments; active: last activity first
-- Runs as the caller, so row level security applies on top of the published filter.
create function public.browse_threads(
  p_sort text default 'hot',
  p_period text default 'all',
  p_category_id bigint default null,
  p_city public.city default null,
  p_q text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns setof public.threads
language plpgsql
stable
set search_path = ''
as $$
declare
  since timestamptz;
  needle text := nullif(lower(btrim(p_q)), '');
  page_size int := least(greatest(coalesce(p_limit, 20), 1), 100);
  skip int := greatest(coalesce(p_offset, 0), 0);
begin
  if char_length(p_q) > 100 then
    raise exception 'search is limited to 100 characters' using errcode = '22001';
  end if;
  since := case coalesce(p_period, 'all')
    when 'week' then now() - interval '7 days'
    when 'month' then now() - interval '1 month'
    when 'year' then now() - interval '1 year'
    when 'all' then '-infinity'::timestamptz
  end;
  if since is null then
    raise exception 'unknown period: %', p_period using errcode = '22023';
  end if;

  case coalesce(p_sort, 'hot')
  when 'new' then
    return query
    select t.* from public.threads t
    where t.status = 'published' and t.created_at >= since
      and (p_category_id is null or t.category_id = p_category_id)
      and (p_city is null or t.city is null or t.city in (p_city, 'both'))
      and (needle is null or strpos(lower(t.title), needle) > 0 or strpos(lower(t.body), needle) > 0)
    order by t.created_at desc, t.id desc
    limit page_size offset skip;
  when 'active' then
    return query
    select t.* from public.threads t
    where t.status = 'published' and t.created_at >= since
      and (p_category_id is null or t.category_id = p_category_id)
      and (p_city is null or t.city is null or t.city in (p_city, 'both'))
      and (needle is null or strpos(lower(t.title), needle) > 0 or strpos(lower(t.body), needle) > 0)
    order by t.last_activity_at desc, t.id desc
    limit page_size offset skip;
  when 'top' then
    return query
    select t.* from public.threads t
    where t.status = 'published' and t.created_at >= since
      and (p_category_id is null or t.category_id = p_category_id)
      and (p_city is null or t.city is null or t.city in (p_city, 'both'))
      and (needle is null or strpos(lower(t.title), needle) > 0 or strpos(lower(t.body), needle) > 0)
    order by t.score * 2 + t.comment_count desc, t.id desc
    limit page_size offset skip;
  when 'hot' then
    return query
    select t.* from public.threads t
    where t.status = 'published' and t.created_at >= since
      and (p_category_id is null or t.category_id = p_category_id)
      and (p_city is null or t.city is null or t.city in (p_city, 'both'))
      and (needle is null or strpos(lower(t.title), needle) > 0 or strpos(lower(t.body), needle) > 0)
    order by
      (t.score + 2 * t.comment_count + 3 * (t.best_comment_id is not null)::int + 1)::float8
        / power(greatest(extract(epoch from now() - t.last_activity_at)::float8, 0) / 3600 + 2, 1.5) desc,
      t.last_activity_at desc, t.id desc
    limit page_size offset skip;
  else
    raise exception 'unknown sort: %', p_sort using errcode = '22023';
  end case;
end;
$$;

-- The total behind browse_threads, for the pagination.
create function public.browse_threads_count(
  p_period text default 'all',
  p_category_id bigint default null,
  p_city public.city default null,
  p_q text default null
)
returns bigint
language plpgsql
stable
set search_path = ''
as $$
declare
  since timestamptz;
  needle text := nullif(lower(btrim(p_q)), '');
begin
  if char_length(p_q) > 100 then
    raise exception 'search is limited to 100 characters' using errcode = '22001';
  end if;
  since := case coalesce(p_period, 'all')
    when 'week' then now() - interval '7 days'
    when 'month' then now() - interval '1 month'
    when 'year' then now() - interval '1 year'
    when 'all' then '-infinity'::timestamptz
  end;
  if since is null then
    raise exception 'unknown period: %', p_period using errcode = '22023';
  end if;

  return (
    select count(*) from public.threads t
    where t.status = 'published' and t.created_at >= since
      and (p_category_id is null or t.category_id = p_category_id)
      and (p_city is null or t.city is null or t.city in (p_city, 'both'))
      and (needle is null or strpos(lower(t.title), needle) > 0 or strpos(lower(t.body), needle) > 0)
  );
end;
$$;

-- Search gains the "hot" sort (same formula as browse_threads); "top" reads the cached count of
-- visible comments instead of counting them per row. Everything else is unchanged.
create or replace function public.search_threads_v2(
  q text,
  p_category_id bigint default null,
  p_city public.city default null,
  p_has_best_answer boolean default null,
  p_verified boolean default null,
  p_sort text default 'relevance'
)
returns setof public.threads
language plpgsql
stable
set search_path = ''
set pg_trgm.word_similarity_threshold = 0.4
as $$
begin
  if char_length(q) > 100 then
    raise exception 'search is limited to 100 characters' using errcode = '22001';
  end if;
  return query
  with query as (
    select websearch_to_tsquery('english', coalesce(q, '')) as tsq, btrim(coalesce(q, '')) as words
  ),
  candidates as (
    select t.id, t.title, t.search
    from public.threads t
    where t.status in ('published', 'archived')
      and (p_category_id is null or t.category_id = p_category_id)
      and (p_city is null or t.city = p_city or (t.city = 'both' and p_city <> 'both'))
      and (p_has_best_answer is null or (t.best_comment_id is not null) = p_has_best_answer)
      and (p_verified is null
        or coalesce(t.last_verified_at > now() - interval '6 months', false) = p_verified)
  ),
  text_hits as (
    select c.id, ts_rank(c.search, query.tsq) as rank, ts_filter(c.search, '{a}') @@ query.tsq as in_title
    from candidates c, query
    where c.search @@ query.tsq
    union all
    select cm.thread_id, ts_rank(cm.search, query.tsq) * 0.5, false
    from public.comments cm
    join candidates c on c.id = cm.thread_id, query
    where cm.search @@ query.tsq and cm.hidden_at is null
  ),
  text_ranked as (
    select id, bool_or(in_title) as in_title, max(rank) as rank from text_hits group by id
  ),
  matches as (
    select id, 2 as tier, in_title, rank as score from text_ranked
    union all
    select c.id, 1, false, extensions.word_similarity(query.words, c.title)
    from candidates c, query
    where query.words <> ''
      and query.words operator(extensions.<%) c.title
      and c.id not in (select id from text_ranked)
      and (select count(*) from text_ranked) < 5
    union all
    select c.id, 0, false, 0 from candidates c, query where query.words = ''
  )
  select t.*
  from matches m
  join public.threads t on t.id = m.id
  order by
    case when p_sort = 'newest' then t.created_at end desc,
    case when p_sort = 'top' then t.comment_count end desc,
    case when p_sort = 'hot' then
      (t.score + 2 * t.comment_count + 3 * (t.best_comment_id is not null)::int + 1)::float8
        / power(greatest(extract(epoch from now() - t.last_activity_at)::float8, 0) / 3600 + 2, 1.5)
    end desc,
    m.tier desc, m.in_title desc, m.score desc, t.last_activity_at desc, t.id desc;
end;
$$;

-- Row level security and grants. threads.score and comment_count stay out of every client grant.
-- update (thread_id) is only there because an upsert repeats the conflict key in its SET; the
-- guard rejects moving a vote.

alter table public.thread_votes enable row level security;

revoke all on table public.thread_votes from anon, authenticated;
grant select, insert (thread_id, value), update (thread_id, value), delete
  on table public.thread_votes to authenticated;

create policy "voters read their own thread votes"
  on public.thread_votes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "members vote on published threads, not their own"
  on public.thread_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.threads t
      where t.id = thread_votes.thread_id
        and t.status = 'published'
        and t.author_id is distinct from (select auth.uid())
    )
  );

create policy "voters change their own thread votes"
  on public.thread_votes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.threads t
      where t.id = thread_votes.thread_id
        and t.status = 'published'
        and t.author_id is distinct from (select auth.uid())
    )
  );

create policy "voters withdraw their own thread votes"
  on public.thread_votes for delete to authenticated
  using (user_id = (select auth.uid()));

revoke execute on function
  public.comments_apply_thread_count(),
  public.threads_guard_counters(),
  public.thread_votes_guard(),
  public.thread_votes_apply_score(),
  public.thread_votes_rate_limit(),
  public.award_thread_points(bigint, uuid, text, int),
  public.thread_votes_apply_reputation(),
  public.browse_threads(text, text, bigint, public.city, text, int, int),
  public.browse_threads_count(text, bigint, public.city, text)
from public, anon, authenticated;

grant execute on function
  public.browse_threads(text, text, bigint, public.city, text, int, int),
  public.browse_threads_count(text, bigint, public.city, text)
to anon, authenticated;
