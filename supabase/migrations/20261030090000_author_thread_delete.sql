-- Authors may take back a thread nobody else relies on: one that was never public, so pending or
-- rejected. Published and archived threads stay, since answers, votes and links depend on them;
-- moderators still delete those with a reason through delete_thread().
-- Rejected threads that nobody fixes do not linger: they are deleted 7 days after the rejection or
-- the author's last edit, whichever is later, so a thread being fixed does not vanish.

-- Rejection is a decision on a thread waiting for review. A thread that was public has answers,
-- votes and links, and rejecting it would let its author or the nightly purge delete them; such a
-- thread is archived or deleted with a reason instead. Applies to every role, seeds included.
create function public.threads_reject_only_pending()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'only threads waiting for review can be rejected' using errcode = '42501';
end;
$$;

create trigger threads_reject_only_pending
  before update of status on public.threads
  for each row
  when (new.status = 'rejected' and old.status not in ('pending', 'rejected'))
  execute function public.threads_reject_only_pending();

-- Approval reviews the thread as it stands, so fixes made while it waited or after a rejection are
-- not edits of a public thread: they have no revision and must not show as "edited".
create or replace function public.threads_touch_on_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.last_activity_at := now();
  new.edited_at := null;
  return new;
end;
$$;

-- The retention clock needs to know when the author last worked on a rejected thread. Edits of
-- pending and rejected threads did not touch edited_at before (no revision, nothing went live), so
-- an author's change of the title, text, category or city of a rejected thread now stamps it. A
-- moderator moving the thread is not the author fixing it and leaves the clock alone.
-- Runs after threads_guard_update (triggers fire in name order), which refuses clients writing
-- edited_at themselves.
create function public.threads_touch_rejected_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.author_id = (select auth.uid())
    and (new.title is distinct from old.title
      or new.body is distinct from old.body
      or new.category_id is distinct from old.category_id
      or new.city is distinct from old.city) then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger threads_touch_rejected_edit
  before update of title, body, category_id, city on public.threads
  for each row
  when (old.status = 'rejected' and new.status = 'rejected')
  execute function public.threads_touch_rejected_edit();

-- Adding or removing images is the same kind of fix. Runs as the owner because clients cannot
-- write edited_at; the author check keeps it to the author's own changes. A thread being deleted
-- is already gone here, so nothing is stamped.
create function public.thread_images_touch_rejected_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.threads t
  set edited_at = now()
  where t.id in (select c.thread_id from changed c)
    and t.status = 'rejected'
    and t.author_id = (select auth.uid());
  return null;
end;
$$;

create trigger thread_images_touch_rejected_on_insert
  after insert on public.thread_images
  referencing new table as changed
  for each statement execute function public.thread_images_touch_rejected_edit();

create trigger thread_images_touch_rejected_on_delete
  after delete on public.thread_images
  referencing old table as changed
  for each statement execute function public.thread_images_touch_rejected_edit();

-- Security definer with its own checks rather than a delete policy: clients keep no delete grant
-- on threads, so moderators cannot delete through the API without a reason and a log entry.
-- Not a moderator action: no log entry and no notification. Banned authors cannot change their
-- content, so they cannot remove it either; muted authors still may. A thread the caller cannot
-- read is not found, so this never reveals someone else's pending or rejected thread.
-- Cascades as described at delete_thread(). Returns the storage keys of the thread's images in
-- gallery order, so the server can delete the files at once; the image rows also queue them for
-- the nightly cleanup.
create function public.delete_own_thread(p_thread_id bigint)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  restriction text;
  target public.threads;
  keys text[];
begin
  if caller is null then
    raise exception 'sign in to delete a thread' using errcode = '42501';
  end if;
  restriction := public.restriction_block_message(false);
  if restriction is not null then
    raise exception '%', restriction using errcode = 'P0001';
  end if;

  -- The lock waits for image uploads still in flight, so the returned keys are complete.
  select * into target from public.threads t where t.id = p_thread_id for update;
  if not found
    or (target.author_id is distinct from caller
      and target.status not in ('published', 'archived')
      and not public.is_moderator()) then
    raise exception 'thread not found' using errcode = 'P0002';
  end if;
  if target.author_id is distinct from caller then
    raise exception 'only the author can delete this thread' using errcode = '42501';
  end if;
  if target.status not in ('pending', 'rejected') then
    raise exception 'only pending or rejected threads can be deleted by their author' using errcode = '42501';
  end if;

  select coalesce(array_agg(i.storage_key order by i.id), '{}') into keys
  from public.thread_images i
  where i.thread_id = target.id;

  delete from public.threads where id = target.id;
  return keys;
end;
$$;

-- Run nightly by the media cleanup job as postgres, before it empties media_deletions, so the
-- images of purged threads go in the same run. Threads rejected outside the moderation flow have
-- no reviewed_at; their creation time stands in. No notification: the rejection notice already
-- said rejected threads are deleted after 7 days.
create function public.purge_rejected_threads()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purged integer;
begin
  with gone as (
    delete from public.threads t
    where t.status = 'rejected'
      and greatest(t.created_at, t.reviewed_at, t.edited_at) < now() - interval '7 days'
    returning 1
  )
  select count(*) into purged from gone;
  return purged;
end;
$$;

revoke execute on function
  public.threads_reject_only_pending(),
  public.threads_touch_on_publish(),
  public.threads_touch_rejected_edit(),
  public.thread_images_touch_rejected_edit(),
  public.delete_own_thread(bigint),
  public.purge_rejected_threads()
from public, anon, authenticated;

grant execute on function public.delete_own_thread(bigint) to authenticated;
