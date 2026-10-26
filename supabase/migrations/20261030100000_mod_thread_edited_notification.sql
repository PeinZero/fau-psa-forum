-- Moderators hear when a public thread is edited, so the "Recent edits" queue does not wait
-- unnoticed. One notice per thread until its edits are reviewed: further edits in the meantime
-- land in the same queue entry, and the next edit after a review notifies again.

-- A new enum value cannot be used in the transaction that adds it. Nothing below casts to it
-- at creation time: the plpgsql trigger body is only planned on its first run.
alter type public.notification_type add value 'mod_thread_edited';

-- Every revision is a "Recent edits" queue item. An older unreviewed revision of the same thread
-- means the moderators were already told.
create function public.thread_revisions_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.thread_revisions r
    where r.thread_id = new.thread_id and r.reviewed_at is null and r.id < new.id
  ) then
    perform public.notify_moderators('mod_thread_edited', new.edited_by, new.thread_id, null);
  end if;
  return null;
end;
$$;

create trigger thread_revisions_notify
  after insert on public.thread_revisions
  for each row execute function public.thread_revisions_notify();

revoke execute on function public.thread_revisions_notify() from public, anon, authenticated;
