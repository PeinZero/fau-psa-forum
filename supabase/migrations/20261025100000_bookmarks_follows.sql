-- Bookmarks (private reading list on /saved) and thread follows (notifications about new
-- answers). Both are private to their owner.

-- A new enum value cannot be used in the transaction that adds it. Nothing below casts to it
-- at creation time: plpgsql bodies are only planned on their first run.
alter type public.notification_type add value 'followed_thread_activity';

create table public.bookmarks (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  thread_id bigint not null references public.threads (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

create index bookmarks_user_created_idx on public.bookmarks (user_id, created_at desc);
create index bookmarks_thread_id_idx on public.bookmarks (thread_id);

create table public.thread_follows (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  thread_id bigint not null references public.threads (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, thread_id)
);

create index thread_follows_thread_id_idx on public.thread_follows (thread_id);

-- People follow what they started or answered; unfollowing later sticks until they comment again.
create function public.threads_auto_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.author_id is not null then
    insert into public.thread_follows (user_id, thread_id) values (new.author_id, new.id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger threads_auto_follow
  after insert on public.threads
  for each row execute function public.threads_auto_follow();

create function public.comments_auto_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.author_id is not null then
    insert into public.thread_follows (user_id, thread_id) values (new.author_id, new.thread_id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger comments_auto_follow
  after insert on public.comments
  for each row execute function public.comments_auto_follow();

-- Existing authors and commenters follow their threads as if the rule had always existed.
insert into public.thread_follows (user_id, thread_id, created_at)
select author_id, id, created_at from public.threads where author_id is not null
union all
select author_id, thread_id, min(created_at) from public.comments where author_id is not null
group by author_id, thread_id
on conflict do nothing;

-- A visible comment notifies each person once:
-- reply beats mention beats thread_comment beats followed_thread_activity.
create or replace function public.comments_notify()
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
    union all
    select f.user_id, 'followed_thread_activity', 4 from public.thread_follows f where f.thread_id = new.thread_id
  ) c
  where c.recipient is not null and c.recipient is distinct from new.author_id
  order by c.recipient, c.priority;
  return null;
end;
$$;

-- A hidden comment is unreadable for members, so it no longer appears in their notifications.
create or replace function public.comments_retract_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications
  where comment_id = new.id and type in ('reply', 'mention', 'thread_comment', 'followed_thread_activity');
  return null;
end;
$$;

-- Unchanged from before except the last block: a new best answer also reaches the followers.
create or replace function public.threads_notify_update()
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

    insert into public.notifications (recipient_id, actor_id, type, thread_id, comment_id)
    select f.user_id, actor, 'followed_thread_activity', new.id, c.id
    from public.thread_follows f
    join public.comments c on c.id = new.best_comment_id
    where f.thread_id = new.id
      and f.user_id is distinct from actor
      and f.user_id is distinct from c.author_id;
  end if;
  return null;
end;
$$;

-- Row level security and grants. Only threads the person can read can be saved or followed.

alter table public.bookmarks enable row level security;
alter table public.thread_follows enable row level security;

revoke all on table public.bookmarks, public.thread_follows from anon, authenticated;
grant select, insert (thread_id), delete on table public.bookmarks, public.thread_follows to authenticated;

create policy "users read their own bookmarks"
  on public.bookmarks for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users bookmark threads they can read"
  on public.bookmarks for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.threads t where t.id = bookmarks.thread_id)
  );

create policy "users remove their own bookmarks"
  on public.bookmarks for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "users read their own follows"
  on public.thread_follows for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users follow threads they can read"
  on public.thread_follows for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.threads t where t.id = thread_follows.thread_id)
  );

create policy "users unfollow threads"
  on public.thread_follows for delete to authenticated
  using (user_id = (select auth.uid()));

revoke execute on function
  public.threads_auto_follow(),
  public.comments_auto_follow()
from public, anon, authenticated;
