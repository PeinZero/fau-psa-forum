-- Verified-on date and "needs update" requests. Bureaucracy answers (RP, Anmeldung, insurance)
-- go stale; moderators confirm a thread is still accurate, members flag ones that are not.

-- A new enum value cannot be used in the transaction that adds it. Nothing below casts to it
-- at creation time: the plpgsql trigger body is only planned on its first run.
alter type public.notification_type add value 'mod_new_update_request';

alter table public.threads
  add column last_verified_at timestamptz,
  add column verified_by uuid references public.profiles (id) on delete set null;

create index threads_verified_by_idx on public.threads (verified_by);

-- Verification columns are outside every client grant on threads; only this function sets them.
create function public.mark_thread_verified(thread_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'only moderators can verify threads' using errcode = '42501';
  end if;
  update public.threads
  set last_verified_at = now(), verified_by = (select auth.uid())
  where id = mark_thread_verified.thread_id;
  if not found then
    raise exception 'thread not found' using errcode = 'P0002';
  end if;
end;
$$;

-- A verification vouches for the text a moderator read. Author edits go live without review,
-- so they drop the badge until a moderator verifies again; moderator edits keep it.
create or replace function public.threads_guard_update()
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
  else
    if new.status is distinct from old.status
      or new.is_pinned is distinct from old.is_pinned
      or new.is_outdated is distinct from old.is_outdated
      or new.best_comment_id is distinct from old.best_comment_id
      or new.rejection_reason is distinct from old.rejection_reason
      or new.reviewed_by is distinct from old.reviewed_by
      or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'only moderators can change moderation fields' using errcode = '42501';
    end if;
    if new.title is distinct from old.title or new.body is distinct from old.body then
      new.last_verified_at := null;
      new.verified_by := null;
    end if;
  end if;
  return new;
end;
$$;

create type public.update_request_status as enum ('open', 'resolved', 'dismissed');

create table public.update_requests (
  id bigint generated always as identity primary key,
  thread_id bigint not null references public.threads (id) on delete cascade,
  -- Null after the requester deletes their account; the moderators still see the request.
  requester_id uuid default auth.uid() references public.profiles (id) on delete set null,
  note text check (char_length(note) <= 300),
  status public.update_request_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- One open request per member per thread; asking again after a decision is fine.
create unique index update_requests_one_open_per_thread_idx
  on public.update_requests (requester_id, thread_id)
  where status = 'open' and requester_id is not null;
-- Moderator queue, oldest first.
create index update_requests_open_created_idx on public.update_requests (created_at) where status = 'open';
create index update_requests_thread_id_idx on public.update_requests (thread_id);
create index update_requests_requester_status_idx on public.update_requests (requester_id, status);
create index update_requests_resolved_by_idx on public.update_requests (resolved_by);

create function public.update_requests_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if not exists (select 1 from public.threads where id = new.thread_id and status = 'published') then
      raise exception 'updates can only be requested for published threads' using errcode = '42501';
    end if;
    -- Serialises concurrent requests by the same member so the cap cannot be raced.
    perform pg_advisory_xact_lock(hashtextextended('open_update_requests:' || new.requester_id::text, 0));
    if exists (
      select 1 from public.update_requests
      where requester_id = new.requester_id and thread_id = new.thread_id and status = 'open'
    ) then
      raise exception 'you already asked for an update of this thread' using errcode = '23505';
    end if;
    if (
      select count(*) from public.update_requests
      where requester_id = new.requester_id and status = 'open'
    ) >= 5 then
      raise exception 'you already have 5 open update requests' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger update_requests_before_insert
  before insert on public.update_requests
  for each row execute function public.update_requests_before_insert();

create function public.update_requests_record_decision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'open' then
    new.resolved_by := null;
    new.resolved_at := null;
  else
    new.resolved_by := (select auth.uid());
    new.resolved_at := now();
  end if;
  return new;
end;
$$;

create trigger update_requests_record_decision
  before update of status on public.update_requests
  for each row
  when (old.status is distinct from new.status)
  execute function public.update_requests_record_decision();

create function public.update_requests_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_moderators('mod_new_update_request', new.requester_id, new.thread_id, null);
  return null;
end;
$$;

create trigger update_requests_notify
  after insert on public.update_requests
  for each row execute function public.update_requests_notify();

-- Row level security and grants

alter table public.update_requests enable row level security;

revoke all on table public.update_requests from anon, authenticated;
revoke all on sequence public.update_requests_id_seq from anon, authenticated;
grant select on table public.update_requests to authenticated;
grant insert (thread_id, note), update (status) on table public.update_requests to authenticated;

create policy "members request updates of published threads"
  on public.update_requests for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and exists (
      select 1 from public.threads t
      where t.id = update_requests.thread_id and t.status = 'published'
    )
  );

create policy "requesters read own, moderators all update requests"
  on public.update_requests for select to authenticated
  using (requester_id = (select auth.uid()) or (select public.is_moderator()));

create policy "moderators decide update requests"
  on public.update_requests for update to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

revoke execute on function
  public.mark_thread_verified(bigint),
  public.update_requests_before_insert(),
  public.update_requests_record_decision(),
  public.update_requests_notify()
from public, anon, authenticated;

grant execute on function public.mark_thread_verified(bigint) to authenticated;
