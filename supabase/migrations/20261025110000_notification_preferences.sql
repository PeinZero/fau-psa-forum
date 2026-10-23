-- Notification preferences: per-type mute for in-app notifications and the email frequency.
-- Emails are not sent yet (needs custom SMTP); the frequency is stored for when they are.

create table public.notification_preferences (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  muted_types public.notification_type[] not null default '{}',
  email_frequency text not null default 'off' check (email_frequency in ('off', 'instant', 'daily')),
  updated_at timestamptz not null default now()
);

create function public.notification_preferences_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger notification_preferences_touch
  before update on public.notification_preferences
  for each row execute function public.notification_preferences_touch();

-- The one place that decides whether someone wants a notification type. No row = everything on.
create function public.notification_muted(recipient uuid, kind public.notification_type)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.notification_preferences
    where user_id = recipient and kind = any (muted_types)
  );
$$;

-- Every notify trigger inserts into notifications, so muted types are dropped here centrally.
create function public.notifications_skip_muted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.notification_muted(new.recipient_id, new.type) then
    return null;
  end if;
  return new;
end;
$$;

create trigger notifications_skip_muted
  before insert on public.notifications
  for each row execute function public.notifications_skip_muted();

-- Per comment each person still gets at most one notification: the highest-priority type they
-- have not muted, so muting replies still leaves the "new comment on your thread" notice.
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
  where c.recipient is not null
    and c.recipient is distinct from new.author_id
    and not public.notification_muted(c.recipient, c.kind)
  order by c.recipient, c.priority;
  return null;
end;
$$;

-- Row level security and grants. user_id is grantable only so upserts that repeat the conflict
-- key work; the policies pin it to the caller.

alter table public.notification_preferences enable row level security;

revoke all on table public.notification_preferences from anon, authenticated;
grant select,
  insert (user_id, muted_types, email_frequency),
  update (user_id, muted_types, email_frequency)
  on table public.notification_preferences to authenticated;

create policy "users read their own preferences"
  on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users create their own preferences"
  on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users change their own preferences"
  on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke execute on function
  public.notification_preferences_touch(),
  public.notification_muted(uuid, public.notification_type),
  public.notifications_skip_muted()
from public, anon, authenticated;
