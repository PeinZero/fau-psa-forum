-- Feedback triage: moderators hear about new feedback and mark notes handled instead of deleting
-- them, so the inbox shows what still needs a look.

-- A new enum value cannot be used in the transaction that adds it. Nothing below casts to it
-- at creation time: the plpgsql trigger body is only planned on its first run.
alter type public.notification_type add value 'mod_new_feedback';

alter table public.feedback
  add column handled_at timestamptz,
  add column handled_by uuid references public.profiles (id) on delete set null;

create index feedback_handled_by_idx on public.feedback (handled_by);

-- Whoever flips handled_at is recorded, and the time is the server's, never the client's.
create function public.feedback_record_handling()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.handled_at is null then
    new.handled_by := null;
  else
    new.handled_at := now();
    new.handled_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger feedback_record_handling
  before update of handled_at on public.feedback
  for each row
  when (old.handled_at is distinct from new.handled_at)
  execute function public.feedback_record_handling();

grant update (handled_at) on table public.feedback to authenticated;

create policy "moderators mark feedback handled"
  on public.feedback for update to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

-- Feedback notices point at the note so the list can quote it; deleting the note removes them.
alter table public.notifications
  add column feedback_id bigint references public.feedback (id) on delete cascade;

create index notifications_feedback_id_idx on public.notifications (feedback_id);

drop function public.notify_moderators(public.notification_type, uuid, bigint, bigint);

-- Moderator queue items fan out to every moderator and superadmin except whoever caused them.
create function public.notify_moderators(
  kind public.notification_type, actor uuid, thread bigint, comment bigint, feedback bigint default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (recipient_id, actor_id, type, thread_id, comment_id, feedback_id)
  select id, actor, kind, thread, comment, feedback
  from public.profiles
  where role in ('moderator', 'superadmin') and id is distinct from actor;
$$;

create function public.feedback_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_moderators('mod_new_feedback', new.user_id, null, null, new.id);
  return null;
end;
$$;

create trigger feedback_notify
  after insert on public.feedback
  for each row execute function public.feedback_notify();

revoke execute on function
  public.feedback_record_handling(),
  public.notify_moderators(public.notification_type, uuid, bigint, bigint, bigint),
  public.feedback_notify()
from public, anon, authenticated;
