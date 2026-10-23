-- Comment votes: members surface the best answers. Scores are public through comments.score,
-- who voted stays private to the voter. Votes never notify anyone.

alter table public.comments add column score integer not null default 0;

create table public.comment_votes (
  comment_id bigint not null references public.comments (id) on delete cascade,
  -- Account deletion removes the person's votes and takes them back out of the scores.
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_votes_user_id_idx on public.comment_votes (user_id);

-- Runs as the caller, so a member cannot even see a hidden comment to vote on. Archived
-- threads are read-only: votes there can neither be cast, changed nor withdrawn.
create function public.comment_votes_guard()
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
    and (new.comment_id is distinct from old.comment_id or new.user_id is distinct from old.user_id) then
    raise exception 'a vote cannot be moved to another comment' using errcode = '42501';
  end if;

  select c.author_id, c.hidden_at, t.status into target
  from public.comments c
  join public.threads t on t.id = c.thread_id
  where c.id = coalesce(new.comment_id, old.comment_id);

  if not found or target.hidden_at is not null or target.status <> 'published' then
    raise exception 'voting is only possible on visible comments of published threads' using errcode = '42501';
  end if;
  if target.author_id = (select auth.uid()) then
    raise exception 'you cannot vote on your own comment' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger comment_votes_guard
  before insert or update or delete on public.comment_votes
  for each row execute function public.comment_votes_guard();

-- The cached score is the sum of the votes; it also follows cascades from account deletion.
create function public.comment_votes_apply_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.comments set score = score - old.value where id = old.comment_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.comments set score = score + new.value where id = new.comment_id;
  end if;
  return null;
end;
$$;

create trigger comment_votes_apply_score
  after insert or update or delete on public.comment_votes
  for each row execute function public.comment_votes_apply_score();

-- Only votes move the score, even if a column grant were ever widened by mistake.
create function public.comments_guard_score()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    raise exception 'the score of a comment changes only through votes' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger comments_guard_score
  before update of score on public.comments
  for each row
  when (old.score is distinct from new.score)
  execute function public.comments_guard_score();

-- Row level security and grants. comments.score stays out of every client grant on comments.
-- update (comment_id) is only there because an upsert repeats the conflict key in its SET;
-- the guard rejects moving a vote.

alter table public.comment_votes enable row level security;

revoke all on table public.comment_votes from anon, authenticated;
grant select, insert (comment_id, value), update (comment_id, value), delete
  on table public.comment_votes to authenticated;

create policy "voters read their own votes"
  on public.comment_votes for select to authenticated
  using (user_id = (select auth.uid()));

create policy "members vote on visible comments of published threads, not their own"
  on public.comment_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.comments c
      join public.threads t on t.id = c.thread_id
      where c.id = comment_votes.comment_id
        and c.hidden_at is null
        and t.status = 'published'
        and c.author_id is distinct from (select auth.uid())
    )
  );

create policy "voters change their own votes"
  on public.comment_votes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.comments c
      join public.threads t on t.id = c.thread_id
      where c.id = comment_votes.comment_id
        and c.hidden_at is null
        and t.status = 'published'
        and c.author_id is distinct from (select auth.uid())
    )
  );

create policy "voters withdraw their own votes"
  on public.comment_votes for delete to authenticated
  using (user_id = (select auth.uid()));

revoke execute on function
  public.comment_votes_guard(),
  public.comment_votes_apply_score(),
  public.comments_guard_score()
from public, anon, authenticated;
