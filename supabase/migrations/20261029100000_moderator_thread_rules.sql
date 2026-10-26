-- Moderators keep threads in order but no longer put words in a member's mouth: on a thread they
-- did not write they decide its status, flags and verification and may move it to another
-- category or city, but only its author changes its title, text and images. A thread that cannot
-- stay is deleted as a whole, with a reason, by a moderator or the superadmin, and its author is
-- told why. Moderators and superadmins are never muted or banned: a mute or ban would leave their
-- moderation powers in place, so someone who should not moderate loses the role instead.

-- A new enum value cannot be used in the transaction that adds it. Nothing below casts to these at
-- creation time: the plpgsql function bodies are only planned on their first run.
alter type public.moderation_action add value 'thread_deleted';
alter type public.notification_type add value 'thread_deleted';

-- The thread is gone when its author reads the notice, so the notice carries what they need to
-- know (title, reason). Clients still only mark notifications read.
alter table public.notifications add column details jsonb;

-- Moderators mute members; only the superadmin bans. Nobody restricts themselves. One active
-- restriction per kind: lift it before changing it.
-- Moderators who were muted or banned before this rule keep that restriction until it ends or the
-- superadmin lifts it: lifting it here would hand back what a decision took away, and removing
-- their role here would be a role change nobody decided or logged.
create or replace function public.restrict_user(
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

  -- Locks the target so a restriction and a promotion of the same account cannot cross.
  select p.role into target_role from public.profiles p where p.id = target for update;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if target_role <> 'member' then
    raise exception 'moderators cannot be muted or banned; remove the moderator role first' using errcode = '42501';
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

-- Covers set_user_role() and an approved moderator application alike.
create function public.profiles_refuse_restricted_promotion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_restricted(new.id, 'mute') or public.is_restricted(new.id, 'ban') then
    raise exception 'lift the mute or ban before making this member a moderator' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger profiles_refuse_restricted_promotion
  before update of role on public.profiles
  for each row
  when (new.role <> 'member' and old.role is distinct from new.role)
  execute function public.profiles_refuse_restricted_promotion();

revoke execute on function public.profiles_refuse_restricted_promotion() from public, anon, authenticated;

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

  -- Also once the author deleted their account: nobody else speaks for them.
  if (new.title is distinct from old.title or new.body is distinct from old.body)
    and old.author_id is distinct from (select auth.uid()) then
    raise exception 'only the author can change a thread''s title and text' using errcode = '42501';
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
    -- A member's edit goes live without review, so it drops the verification until a moderator
    -- verifies again; a moderator editing their own thread vouches for it themselves.
    if new.title is distinct from old.title or new.body is distinct from old.body then
      new.last_verified_at := null;
      new.verified_by := null;
    end if;
  end if;
  return new;
end;
$$;

-- Security definer with its own checks rather than a delete policy: clients have no delete grant on
-- threads, and a policy would let a moderator delete through the API without a reason or a log
-- entry. Here the reason, the log entry and the deletion succeed or fail together.
-- The cascades take everything that only exists for the thread with it: comments, votes and the
-- reputation they earned, images, bookmarks, follows, revisions, reports, update requests and
-- notifications about it. Guide steps keep their own text without the link, and earlier log entries keep
-- the title they copied. Returns the storage keys of the thread's images in gallery order, so the
-- server can delete the files at once; the image rows also queue them for the nightly cleanup.
-- A moderator still muted or banned from before moderators could no longer be restricted does not
-- delete threads.
create function public.delete_thread(p_thread_id bigint, p_reason text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  reason text := btrim(coalesce(p_reason, ''), E' \t\r\n');
  restriction text;
  target public.threads;
  keys text[];
begin
  if not public.is_moderator() then
    raise exception 'only moderators can delete threads' using errcode = '42501';
  end if;
  restriction := public.restriction_block_message(true);
  if restriction is not null then
    raise exception '%', restriction using errcode = 'P0001';
  end if;
  if reason = '' then
    raise exception 'a reason is required to delete a thread' using errcode = 'P0001';
  end if;
  if char_length(reason) > 1000 then
    raise exception 'the reason can be at most 1000 characters' using errcode = 'P0001';
  end if;

  -- The lock waits for image uploads still in flight, so the returned keys are complete.
  select * into target from public.threads t where t.id = p_thread_id for update;
  if not found then
    raise exception 'thread not found' using errcode = 'P0002';
  end if;

  select coalesce(array_agg(i.storage_key order by i.id), '{}') into keys
  from public.thread_images i
  where i.thread_id = target.id;

  -- thread_id turns null with the thread; the title keeps the entry readable.
  perform public.log_moderation('thread_deleted', target.id, null, target.author_id, reason,
    jsonb_build_object('title', target.title));

  -- Without thread_id, so the notice outlives the thread; muted types are dropped on insert.
  if target.author_id is not null and target.author_id is distinct from (select auth.uid()) then
    insert into public.notifications (recipient_id, actor_id, type, details)
    values (target.author_id, (select auth.uid()), 'thread_deleted',
      jsonb_build_object('title', target.title, 'reason', reason));
  end if;

  delete from public.threads where id = target.id;
  return keys;
end;
$$;

revoke execute on function public.delete_thread(bigint, text) from public, anon, authenticated;
grant execute on function public.delete_thread(bigint, text) to authenticated;
