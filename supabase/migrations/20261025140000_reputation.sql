-- Reputation: points for helping. A received upvote is +1, a downvote -1, a best answer +15.
-- reputation_events is an append-only ledger written by triggers: taking a vote back or
-- unsetting a best answer appends the opposite points with the same reason, so "points since"
-- sums stay right for the monthly Top helpers. profiles.reputation and best_answer_count cache
-- the ledger's totals.

alter table public.profiles
  add column reputation int not null default 0,
  add column best_answer_count int not null default 0;

create table public.reputation_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  points int not null,
  reason text not null check (reason in ('upvote', 'downvote', 'best_answer')),
  -- Deleting a comment takes the points it earned with it.
  comment_id bigint references public.comments (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index reputation_events_created_user_idx on public.reputation_events (created_at, user_id);
create index reputation_events_user_id_idx on public.reputation_events (user_id);
create index reputation_events_comment_id_idx on public.reputation_events (comment_id);

-- Keeps the cached totals equal to the ledger, also when cascades delete events.
create function public.reputation_events_apply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
    set reputation = reputation + new.points,
        best_answer_count = best_answer_count + case when new.reason = 'best_answer' then sign(new.points)::int else 0 end
    where id = new.user_id;
  else
    update public.profiles
    set reputation = reputation - old.points,
        best_answer_count = best_answer_count - case when old.reason = 'best_answer' then sign(old.points)::int else 0 end
    where id = old.user_id;
  end if;
  return null;
end;
$$;

create trigger reputation_events_apply
  after insert or delete on public.reputation_events
  for each row execute function public.reputation_events_apply();

-- Points go to the comment's author, never for a vote on one's own comment. A comment that is
-- already gone (cascade from deleting it) earns nothing; its events are deleted with it.
create function public.award_comment_points(comment bigint, voter uuid, reason text, points int)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.reputation_events (user_id, points, reason, comment_id)
  select c.author_id, points, reason, c.id
  from public.comments c
  where c.id = comment and c.author_id is not null and c.author_id is distinct from voter;
$$;

create function public.comment_votes_apply_reputation()
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
    perform public.award_comment_points(
      old.comment_id, old.user_id, case when old.value > 0 then 'upvote' else 'downvote' end, -old.value
    );
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.award_comment_points(
      new.comment_id, new.user_id, case when new.value > 0 then 'upvote' else 'downvote' end, new.value
    );
  end if;
  return null;
end;
$$;

create trigger comment_votes_apply_reputation
  after insert or update or delete on public.comment_votes
  for each row execute function public.comment_votes_apply_reputation();

-- Who picked the best answer does not matter: the answer's author earns it.
create function public.threads_apply_best_answer_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.best_comment_id is not null then
    perform public.award_comment_points(old.best_comment_id, null, 'best_answer', -15);
  end if;
  if new.best_comment_id is not null then
    perform public.award_comment_points(new.best_comment_id, null, 'best_answer', 15);
  end if;
  return null;
end;
$$;

create trigger threads_apply_best_answer_points
  after update of best_comment_id on public.threads
  for each row
  when (old.best_comment_id is distinct from new.best_comment_id)
  execute function public.threads_apply_best_answer_points();

-- Only the ledger moves the cached totals, even if a column grant were ever widened by mistake.
create function public.profiles_guard_reputation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    raise exception 'reputation changes only through votes and best answers' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_reputation
  before update of reputation, best_answer_count on public.profiles
  for each row
  when (old.reputation is distinct from new.reputation or old.best_answer_count is distinct from new.best_answer_count)
  execute function public.profiles_guard_reputation();

-- Votes and best answers given before the ledger existed.
insert into public.reputation_events (user_id, points, reason, comment_id, created_at)
select c.author_id, v.value, case when v.value > 0 then 'upvote' else 'downvote' end, c.id, v.created_at
from public.comment_votes v
join public.comments c on c.id = v.comment_id
where c.author_id is not null and c.author_id <> v.user_id;

insert into public.reputation_events (user_id, points, reason, comment_id)
select c.author_id, 15, 'best_answer', c.id
from public.threads t
join public.comments c on c.id = t.best_comment_id
where c.author_id is not null;

-- Top helpers: the 10 members with the most points earned since a moment (e.g. this month).
-- Runs as owner because the ledger itself is private: its rows tie points to comments, which
-- would reveal who wrote hidden comments and who received each downvote. Only totals leave it.
create function public.top_helpers(since timestamptz)
returns table (user_id uuid, username text, display_name text, points int)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, sum(e.points)::int as points
  from public.reputation_events e
  join public.profiles p on p.id = e.user_id
  where e.created_at >= since
  group by p.id
  having sum(e.points) > 0
  order by sum(e.points) desc, p.username
  limit 10;
$$;

-- Row level security and grants. Totals are public through profiles and top_helpers(); the
-- ledger has no client grants or policies at all.

alter table public.reputation_events enable row level security;

revoke all on table public.reputation_events from anon, authenticated;
revoke all on sequence public.reputation_events_id_seq from anon, authenticated;

revoke execute on function
  public.reputation_events_apply(),
  public.award_comment_points(bigint, uuid, text, int),
  public.comment_votes_apply_reputation(),
  public.threads_apply_best_answer_points(),
  public.profiles_guard_reputation(),
  public.top_helpers(timestamptz)
from public, anon, authenticated;

grant execute on function public.top_helpers(timestamptz) to anon, authenticated;
