-- Moderation audit log, canned rejection reasons, and timed mutes and bans.
-- Moderators answer for their decisions to each other: every decision lands in an append-only
-- log written by triggers. A restriction is either a mute (read, but not post, report, vote or
-- apply) or a ban (additionally no edits), optionally with an end date.

-- A new enum value cannot be used in the transaction that adds it. Nothing below casts to it
-- at creation time: the plpgsql trigger bodies are only planned on their first run.
alter type public.notification_type add value 'account_muted';
alter type public.notification_type add value 'account_banned';
alter type public.notification_type add value 'account_unrestricted';

-- Restrictions: the single-row "restricted" flag becomes a history of mutes and bans.

drop trigger comments_reject_if_restricted on public.comments;
drop trigger threads_reject_if_restricted on public.threads;
drop trigger reports_reject_if_restricted on public.reports;
drop trigger comment_votes_reject_if_restricted on public.comment_votes;
drop function public.reject_if_restricted();
drop function public.am_restricted();
drop function public.set_user_restricted(uuid, boolean, text);

create type public.restriction_kind as enum ('mute', 'ban');

-- Existing restrictions blocked posting until lifted, which is a permanent mute.
alter table public.user_restrictions drop constraint user_restrictions_pkey;
alter table public.user_restrictions rename column restricted_by to created_by;
alter table public.user_restrictions rename constraint user_restrictions_restricted_by_fkey to user_restrictions_created_by_fkey;
alter index public.user_restrictions_restricted_by_idx rename to user_restrictions_created_by_idx;
alter table public.user_restrictions
  add column id bigint generated always as identity primary key,
  add column kind public.restriction_kind not null default 'mute',
  add column expires_at timestamptz,
  add column lifted_at timestamptz,
  add column lifted_by uuid references public.profiles (id) on delete set null,
  add constraint user_restrictions_expiry check (expires_at is null or expires_at > created_at),
  add constraint user_restrictions_lifted check (lifted_at is not null or lifted_by is null);
alter table public.user_restrictions alter column kind drop default;

create index user_restrictions_user_created_idx on public.user_restrictions (user_id, created_at desc);
create index user_restrictions_lifted_by_idx on public.user_restrictions (lifted_by);

-- Writes go through restrict_user() and lift_restriction() only.
revoke all on table public.user_restrictions from anon, authenticated;
revoke all on sequence public.user_restrictions_id_seq from anon, authenticated;
grant select on table public.user_restrictions to authenticated;

-- Members see their own restrictions with the reason, so they know why and until when.
drop policy "moderators read restrictions" on public.user_restrictions;
create policy "moderators read all, users their own restrictions"
  on public.user_restrictions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_moderator()));

-- Active = not lifted and not expired. Exact kind: a ban does not count as a mute here.
create function public.is_restricted(uid uuid, kind public.restriction_kind)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_restrictions r
    where r.user_id = uid and r.kind = is_restricted.kind and r.lifted_at is null
      and (r.expires_at is null or r.expires_at > now())
  );
$$;

-- The message a blocked write raises, worded for the caller; null when nothing applies.
-- Updates pass include_mutes = false because a mute still allows edits. Reads only the
-- caller's own rows, so the posting triggers may call it.
create function public.restriction_block_message(include_mutes boolean)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select
    case r.kind when 'ban' then 'your account is banned' else 'your account is muted' end
    || coalesce(' until ' || to_char(r.expires_at at time zone 'Europe/Berlin', 'FMDD Mon YYYY, HH24:MI'), '')
    || ': ' || r.reason
  from public.user_restrictions r
  where r.user_id = (select auth.uid()) and r.lifted_at is null
    and (r.expires_at is null or r.expires_at > now())
    and (include_mutes or r.kind = 'ban')
  order by (r.kind = 'ban') desc, r.expires_at desc nulls first
  limit 1;
$$;

create function public.restrictions_block_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  message text;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  message := public.restriction_block_message(tg_op = 'INSERT');
  if message is not null then
    raise exception '%', message using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger threads_block_restricted
  before insert on public.threads
  for each row execute function public.restrictions_block_writes();
create trigger threads_block_restricted_edit
  before update of title, body, category_id, city on public.threads
  for each row execute function public.restrictions_block_writes();
create trigger comments_block_restricted
  before insert on public.comments
  for each row execute function public.restrictions_block_writes();
create trigger comments_block_restricted_edit
  before update of body on public.comments
  for each row execute function public.restrictions_block_writes();
create trigger reports_block_restricted
  before insert on public.reports
  for each row execute function public.restrictions_block_writes();
create trigger update_requests_block_restricted
  before insert on public.update_requests
  for each row execute function public.restrictions_block_writes();
create trigger comment_votes_block_restricted
  before insert on public.comment_votes
  for each row execute function public.restrictions_block_writes();
create trigger moderator_applications_block_restricted
  before insert on public.moderator_applications
  for each row execute function public.restrictions_block_writes();
-- Marking announcements as seen stays possible; only the public profile fields are frozen.
create trigger profiles_block_restricted_edit
  before update of display_name, affiliation, username on public.profiles
  for each row execute function public.restrictions_block_writes();

-- Moderators mute members; only the superadmin bans, or restricts a moderator. Nobody restricts
-- the superadmin or themselves. One active restriction per kind: lift it before changing it.
create function public.restrict_user(
  target uuid,
  kind public.restriction_kind,
  reason text,
  duration interval default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  target_role public.user_role;
  created_id bigint;
begin
  if not public.is_moderator() then
    raise exception 'only moderators can restrict accounts' using errcode = '42501';
  end if;
  if restrict_user.kind = 'ban' and not public.is_superadmin() then
    raise exception 'only the superadmin can ban accounts' using errcode = '42501';
  end if;
  if target = actor then
    raise exception 'you cannot restrict yourself' using errcode = '42501';
  end if;

  -- Locks the target so two moderators cannot restrict the same account at once.
  select p.role into target_role from public.profiles p where p.id = target for update;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if target_role = 'superadmin' then
    raise exception 'the superadmin cannot be restricted' using errcode = '42501';
  end if;
  if target_role = 'moderator' and not public.is_superadmin() then
    raise exception 'only the superadmin can restrict moderators' using errcode = '42501';
  end if;
  if btrim(coalesce(restrict_user.reason, '')) = '' then
    raise exception 'a reason is required' using errcode = 'P0001';
  end if;
  if duration is not null and duration <= interval '0' then
    raise exception 'the duration must be positive' using errcode = '22023';
  end if;
  if public.is_restricted(target, restrict_user.kind) then
    raise exception 'this user is already %', case restrict_user.kind when 'ban' then 'banned' else 'muted' end
      using errcode = 'P0001';
  end if;

  insert into public.user_restrictions (user_id, kind, reason, expires_at, created_by)
  values (target, restrict_user.kind, btrim(restrict_user.reason), now() + duration, actor)
  returning id into created_id;
  return created_id;
end;
$$;

create function public.lift_restriction(restriction_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  restriction public.user_restrictions;
  target_role public.user_role;
begin
  if not public.is_moderator() then
    raise exception 'only moderators can lift restrictions' using errcode = '42501';
  end if;

  select * into restriction from public.user_restrictions r where r.id = lift_restriction.restriction_id for update;
  if not found then
    raise exception 'restriction not found' using errcode = 'P0002';
  end if;
  if restriction.user_id = (select auth.uid()) then
    raise exception 'you cannot lift your own restriction' using errcode = '42501';
  end if;
  if restriction.kind = 'ban' and not public.is_superadmin() then
    raise exception 'only the superadmin can lift a ban' using errcode = '42501';
  end if;
  select p.role into target_role from public.profiles p where p.id = restriction.user_id;
  if target_role <> 'member' and not public.is_superadmin() then
    raise exception 'only the superadmin can restrict moderators' using errcode = '42501';
  end if;
  if restriction.lifted_at is not null then
    raise exception 'this restriction was already lifted' using errcode = 'P0001';
  end if;
  if restriction.expires_at is not null and restriction.expires_at <= now() then
    raise exception 'this restriction has already ended' using errcode = 'P0001';
  end if;

  update public.user_restrictions
  set lifted_at = now(), lifted_by = (select auth.uid())
  where id = lift_restriction.restriction_id;
end;
$$;

-- Restriction notices point at their restriction, so the page can show the reason and end date.
alter table public.notifications
  add column restriction_id bigint references public.user_restrictions (id) on delete cascade;

create index notifications_restriction_id_idx on public.notifications (restriction_id);

-- Moderation log

create type public.moderation_action as enum (
  'thread_approved', 'thread_rejected', 'thread_archived', 'thread_unarchived',
  'thread_pinned', 'thread_unpinned', 'thread_outdated', 'thread_verified',
  'comment_hidden', 'comment_unhidden', 'best_answer_set', 'best_answer_unset',
  'report_resolved', 'report_dismissed', 'update_request_resolved', 'update_request_dismissed',
  'application_approved', 'application_rejected', 'role_changed',
  'category_created', 'category_updated', 'category_deleted',
  'announcement_created', 'announcement_deleted', 'guide_created', 'guide_deleted',
  'revision_reviewed', 'user_muted', 'user_banned', 'user_unrestricted'
);

-- Titles and names are copied into details, so entries stay readable after the target is deleted.
create table public.moderation_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action public.moderation_action not null,
  thread_id bigint references public.threads (id) on delete set null,
  comment_id bigint references public.comments (id) on delete set null,
  target_user_id uuid references public.profiles (id) on delete set null,
  reason text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index moderation_log_created_idx on public.moderation_log (created_at desc);
create index moderation_log_actor_created_idx on public.moderation_log (actor_id, created_at desc);
create index moderation_log_action_created_idx on public.moderation_log (action, created_at desc);
create index moderation_log_thread_id_idx on public.moderation_log (thread_id);
create index moderation_log_comment_id_idx on public.moderation_log (comment_id);
create index moderation_log_target_user_id_idx on public.moderation_log (target_user_id);

-- Only decisions taken by a signed-in moderator are logged; seed scripts, cascades and members
-- changing their own content are not moderation.
create function public.log_moderation(
  action public.moderation_action,
  thread bigint,
  comment bigint,
  target uuid,
  reason text default null,
  details jsonb default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.moderation_log (actor_id, action, thread_id, comment_id, target_user_id, reason, details)
  select (select auth.uid()), action, thread, comment, target, reason, details
  where public.is_moderator();
$$;

create function public.threads_log_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  about jsonb := jsonb_build_object('title', new.title);
  best_author uuid;
begin
  if not public.is_moderator() then
    return null;
  end if;

  if new.status is distinct from old.status then
    if new.status = 'published' and old.status = 'archived' then
      perform public.log_moderation('thread_unarchived', new.id, null, new.author_id, null, about);
    elsif new.status = 'published' then
      perform public.log_moderation('thread_approved', new.id, null, new.author_id, null, about);
    elsif new.status = 'rejected' then
      perform public.log_moderation('thread_rejected', new.id, null, new.author_id, new.rejection_reason, about);
    elsif new.status = 'archived' then
      perform public.log_moderation('thread_archived', new.id, null, new.author_id, null, about);
    end if;
  end if;

  if new.is_pinned is distinct from old.is_pinned then
    perform public.log_moderation(
      case when new.is_pinned then 'thread_pinned' else 'thread_unpinned' end::public.moderation_action,
      new.id, null, new.author_id, null, about
    );
  end if;

  if new.is_outdated is distinct from old.is_outdated then
    perform public.log_moderation(
      'thread_outdated', new.id, null, new.author_id, null, about || jsonb_build_object('outdated', new.is_outdated)
    );
  end if;

  if new.last_verified_at is not null and new.last_verified_at is distinct from old.last_verified_at then
    perform public.log_moderation('thread_verified', new.id, null, new.author_id, null, about);
  end if;

  -- A deleted best answer clears the column through its foreign key; that is no decision.
  if new.best_comment_id is distinct from old.best_comment_id then
    select c.author_id into best_author from public.comments c
    where c.id = coalesce(new.best_comment_id, old.best_comment_id);
    if not found then
      return null;
    end if;
    perform public.log_moderation(
      case when new.best_comment_id is null then 'best_answer_unset' else 'best_answer_set' end::public.moderation_action,
      new.id, coalesce(new.best_comment_id, old.best_comment_id), best_author, null, about
    );
  end if;
  return null;
end;
$$;

create trigger threads_log_moderation
  after update on public.threads
  for each row execute function public.threads_log_moderation();

create function public.comments_log_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_moderation(
    case when new.hidden_at is null then 'comment_unhidden' else 'comment_hidden' end::public.moderation_action,
    new.thread_id, new.id, new.author_id, null,
    jsonb_build_object('title', (select t.title from public.threads t where t.id = new.thread_id))
  );
  return null;
end;
$$;

create trigger comments_log_moderation
  after update of hidden_at on public.comments
  for each row
  when ((old.hidden_at is null) <> (new.hidden_at is null))
  execute function public.comments_log_moderation();

create function public.reports_log_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.threads;
  comment_author uuid;
begin
  if new.comment_id is not null then
    select c.author_id into comment_author from public.comments c where c.id = new.comment_id;
    select t.* into thread from public.threads t
    where t.id = (select c.thread_id from public.comments c where c.id = new.comment_id);
  else
    select t.* into thread from public.threads t where t.id = new.thread_id;
  end if;

  perform public.log_moderation(
    case when new.status = 'resolved' then 'report_resolved' else 'report_dismissed' end::public.moderation_action,
    thread.id, new.comment_id, coalesce(comment_author, thread.author_id), null,
    jsonb_build_object('title', thread.title, 'report_id', new.id, 'report_reason', new.reason)
  );
  return null;
end;
$$;

create trigger reports_log_moderation
  after update of status on public.reports
  for each row
  when (old.status is distinct from new.status and new.status in ('resolved', 'dismissed'))
  execute function public.reports_log_moderation();

create function public.update_requests_log_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_moderation(
    case when new.status = 'resolved' then 'update_request_resolved' else 'update_request_dismissed' end::public.moderation_action,
    new.thread_id, null, new.requester_id, null,
    jsonb_build_object(
      'title', (select t.title from public.threads t where t.id = new.thread_id),
      'update_request_id', new.id
    )
  );
  return null;
end;
$$;

create trigger update_requests_log_moderation
  after update of status on public.update_requests
  for each row
  when (old.status is distinct from new.status and new.status in ('resolved', 'dismissed'))
  execute function public.update_requests_log_moderation();

create function public.moderator_applications_log_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_moderation(
    case when new.status = 'approved' then 'application_approved' else 'application_rejected' end::public.moderation_action,
    null, null, new.user_id, null, jsonb_build_object('application_id', new.id)
  );
  return null;
end;
$$;

create trigger moderator_applications_log_moderation
  after update of status on public.moderator_applications
  for each row
  when (old.status = 'pending' and new.status in ('approved', 'rejected'))
  execute function public.moderator_applications_log_moderation();

-- An approved application promotes the applicant in the same transaction; that entry already
-- says it, so the promotion is not logged a second time.
create function public.profiles_log_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.moderator_applications a
    where a.user_id = new.id and a.status = 'approved' and a.reviewed_at = now()
  ) then
    return null;
  end if;
  perform public.log_moderation(
    'role_changed', null, null, new.id, null, jsonb_build_object('from', old.role, 'to', new.role)
  );
  return null;
end;
$$;

create trigger profiles_log_role_change
  after update of role on public.profiles
  for each row
  when (old.role is distinct from new.role)
  execute function public.profiles_log_role_change();

create function public.categories_log_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_moderation('category_created', null, null, null, null,
      jsonb_build_object('category_id', new.id, 'name', new.name, 'slug', new.slug));
  elsif tg_op = 'UPDATE' then
    if (new.name, new.slug, new.description, new.sort_order) is distinct from (old.name, old.slug, old.description, old.sort_order) then
      perform public.log_moderation('category_updated', null, null, null, null,
        jsonb_build_object('category_id', new.id, 'name', new.name, 'slug', new.slug, 'old_name', old.name));
    end if;
  else
    perform public.log_moderation('category_deleted', null, null, null, null,
      jsonb_build_object('category_id', old.id, 'name', old.name, 'slug', old.slug));
  end if;
  return null;
end;
$$;

create trigger categories_log_moderation
  after insert or update or delete on public.categories
  for each row execute function public.categories_log_moderation();

create function public.announcements_log_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_moderation('announcement_created', null, null, null, null,
      jsonb_build_object('announcement_id', new.id, 'title', new.title));
  else
    perform public.log_moderation('announcement_deleted', null, null, null, null,
      jsonb_build_object('announcement_id', old.id, 'title', old.title));
  end if;
  return null;
end;
$$;

create trigger announcements_log_moderation
  after insert or delete on public.announcements
  for each row execute function public.announcements_log_moderation();

create function public.guides_log_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_moderation('guide_created', null, null, null, null,
      jsonb_build_object('guide_id', new.id, 'title', new.title, 'slug', new.slug));
  else
    perform public.log_moderation('guide_deleted', null, null, null, null,
      jsonb_build_object('guide_id', old.id, 'title', old.title, 'slug', old.slug));
  end if;
  return null;
end;
$$;

create trigger guides_log_moderation
  after insert or delete on public.guides
  for each row execute function public.guides_log_moderation();

create function public.thread_revisions_log_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.log_moderation('revision_reviewed', new.thread_id, null, new.edited_by, null,
    jsonb_build_object(
      'title', (select t.title from public.threads t where t.id = new.thread_id),
      'revision_id', new.id
    ));
  return null;
end;
$$;

create trigger thread_revisions_log_review
  after update of reviewed_at on public.thread_revisions
  for each row
  when (old.reviewed_at is null and new.reviewed_at is not null)
  execute function public.thread_revisions_log_review();

-- The restricted member hears about it from the team, with the reason on the notification page.
create function public.user_restrictions_log_and_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  about jsonb := jsonb_build_object('restriction_id', new.id, 'kind', new.kind, 'expires_at', new.expires_at);
begin
  if tg_op = 'INSERT' then
    perform public.log_moderation(
      case when new.kind = 'ban' then 'user_banned' else 'user_muted' end::public.moderation_action,
      null, null, new.user_id, new.reason, about
    );
    insert into public.notifications (recipient_id, actor_id, type, restriction_id)
    values (
      new.user_id, new.created_by,
      case when new.kind = 'ban' then 'account_banned' else 'account_muted' end::public.notification_type,
      new.id
    );
  elsif old.lifted_at is null and new.lifted_at is not null then
    perform public.log_moderation('user_unrestricted', null, null, new.user_id, null, about);
    insert into public.notifications (recipient_id, actor_id, type, restriction_id)
    values (new.user_id, new.lifted_by, 'account_unrestricted', new.id);
  end if;
  return null;
end;
$$;

create trigger user_restrictions_log_and_notify
  after insert or update of lifted_at on public.user_restrictions
  for each row execute function public.user_restrictions_log_and_notify();

-- Canned rejection reasons: a starting point the moderator can still edit before sending.
create table public.canned_replies (
  id bigint generated always as identity primary key,
  label text not null check (char_length(btrim(label)) between 1 and 60),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  sort_order int not null default 0
);

create index canned_replies_sort_order_idx on public.canned_replies (sort_order, id);

insert into public.canned_replies (label, body, sort_order) values
  ('Already answered — link',
   'This question is already answered here: <link>. Please have a look, and add a comment there if something is missing.', 10),
  ('Not about student life in Erlangen/Nürnberg',
   'This forum is for student life in Erlangen and Nürnberg, and this thread is outside that topic, so we could not publish it.', 20),
  ('Missing details',
   'Please add a few more details (your situation, city, dates and what you already tried) so others can answer, then submit it again.', 30),
  ('Personal data included',
   'Your thread contains personal data such as names, phone numbers, addresses or case numbers. Please remove them and submit it again.', 40),
  ('Duplicate',
   'There is already a thread on this topic. Please search for it and continue the conversation there.', 50);

-- Row level security and grants

alter table public.moderation_log enable row level security;
alter table public.canned_replies enable row level security;

revoke all on table public.moderation_log, public.canned_replies from anon, authenticated;
revoke all on sequence public.moderation_log_id_seq, public.canned_replies_id_seq from anon, authenticated;
grant select on table public.moderation_log to authenticated;
grant select, insert (label, body, sort_order), update (label, body, sort_order), delete
  on table public.canned_replies to authenticated;

create policy "moderators read the moderation log"
  on public.moderation_log for select to authenticated
  using ((select public.is_moderator()));

create policy "moderators read canned replies"
  on public.canned_replies for select to authenticated
  using ((select public.is_moderator()));

create policy "moderators add canned replies"
  on public.canned_replies for insert to authenticated
  with check ((select public.is_moderator()));

create policy "moderators edit canned replies"
  on public.canned_replies for update to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

create policy "moderators delete canned replies"
  on public.canned_replies for delete to authenticated
  using ((select public.is_moderator()));

revoke execute on function
  public.is_restricted(uuid, public.restriction_kind),
  public.restriction_block_message(boolean),
  public.restrictions_block_writes(),
  public.restrict_user(uuid, public.restriction_kind, text, interval),
  public.lift_restriction(bigint),
  public.log_moderation(public.moderation_action, bigint, bigint, uuid, text, jsonb),
  public.threads_log_moderation(),
  public.comments_log_moderation(),
  public.reports_log_moderation(),
  public.update_requests_log_moderation(),
  public.moderator_applications_log_moderation(),
  public.profiles_log_role_change(),
  public.categories_log_moderation(),
  public.announcements_log_moderation(),
  public.guides_log_moderation(),
  public.thread_revisions_log_review(),
  public.user_restrictions_log_and_notify()
from public, anon, authenticated;

grant execute on function
  public.restriction_block_message(boolean),
  public.restrict_user(uuid, public.restriction_kind, text, interval),
  public.lift_restriction(bigint)
to authenticated;
