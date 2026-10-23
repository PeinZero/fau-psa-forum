-- Announcements: moderators post news for the whole community; every member is notified.

-- A new enum value cannot be used in the transaction that adds it. Nothing below casts to it
-- at creation time: the plpgsql trigger body is only planned on its first run.
alter type public.notification_type add value 'announcement';

create table public.announcements (
  id bigint generated always as identity primary key,
  title text not null check (char_length(btrim(title)) between 4 and 120),
  body text not null check (body ~ '\S' and char_length(body) <= 10000),
  is_pinned boolean not null default false,
  -- Null after the author deletes their account; the announcement stays.
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- List order (pinned first, newest first) and the home banner's newest pinned announcement.
create index announcements_pinned_created_idx on public.announcements (is_pinned desc, created_at desc);
create index announcements_author_id_idx on public.announcements (author_id);

-- Only a changed title or body counts as an edit; pinning is not one.
create function public.announcements_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger announcements_touch
  before update of title, body on public.announcements
  for each row
  when (old.title is distinct from new.title or old.body is distinct from new.body)
  execute function public.announcements_touch();

alter table public.notifications
  add column announcement_id bigint references public.announcements (id) on delete cascade;

create index notifications_announcement_id_idx on public.notifications (announcement_id);

-- Everyone but the author hears about a new announcement.
create function public.announcements_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, announcement_id)
  select p.id, new.author_id, 'announcement', new.id
  from public.profiles p
  where p.id is distinct from new.author_id;
  return null;
end;
$$;

create trigger announcements_notify
  after insert on public.announcements
  for each row execute function public.announcements_notify();

-- Row level security and grants

alter table public.announcements enable row level security;

revoke all on table public.announcements from anon, authenticated;
revoke all on sequence public.announcements_id_seq from anon, authenticated;
grant select on table public.announcements to anon, authenticated;
grant insert (title, body, is_pinned), update (title, body, is_pinned), delete
  on table public.announcements to authenticated;

create policy "announcements are public"
  on public.announcements for select to anon, authenticated
  using (true);

create policy "moderators post announcements as themselves"
  on public.announcements for insert to authenticated
  with check ((select public.is_moderator()) and author_id = (select auth.uid()));

create policy "moderators edit announcements"
  on public.announcements for update to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

create policy "moderators delete announcements"
  on public.announcements for delete to authenticated
  using ((select public.is_moderator()));

revoke execute on function
  public.announcements_touch(),
  public.announcements_notify()
from public, anon, authenticated;
