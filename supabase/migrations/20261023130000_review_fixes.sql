-- Safe to re-run: every statement replaces what it defines.

-- Profiles: one naming rule for new sign-ups and for accounts created before the trigger existed.

create or replace function public.default_display_name(meta jsonb, email text, user_id uuid)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  chosen_name text;
begin
  chosen_name := btrim(left(btrim(coalesce(
    nullif(btrim(meta ->> 'full_name'), ''),
    nullif(btrim(meta ->> 'name'), ''),
    split_part(coalesce(email, ''), '@', 1)
  )), 40));
  if char_length(chosen_name) < 2 then
    chosen_name := 'member-' || left(user_id::text, 8);
  end if;
  return chosen_name;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, public.default_display_name(new.raw_user_meta_data, new.email, new.id));
  return new;
end;
$$;

-- The owner signed in before the migrations ran, so their account has no profile yet.
insert into public.profiles (id, display_name)
select u.id, public.default_display_name(u.raw_user_meta_data, u.email, u.id)
from auth.users u
on conflict (id) do nothing;

-- Threads: approval puts a thread at the top of the lists like any new activity.
-- Fires after threads_guard_update (triggers run in name order), so the guard never sees it.

create or replace function public.threads_touch_on_publish()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.last_activity_at := now();
  return new;
end;
$$;

drop trigger if exists threads_touch_on_publish on public.threads;
create trigger threads_touch_on_publish
  before update of status on public.threads
  for each row
  when (old.status in ('pending', 'rejected') and new.status = 'published')
  execute function public.threads_touch_on_publish();

-- Moderators may curate anyone's thread; every edit by someone other than the author is kept
-- so the author and other moderators can see what changed. Edits to public threads go live
-- immediately and are reviewed afterwards from the revisions.
create or replace function public.threads_record_revision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_public boolean := old.status in ('published', 'archived');
begin
  if (new.title is distinct from old.title or new.body is distinct from old.body)
    and (is_public or old.author_id is distinct from (select auth.uid())) then
    insert into public.thread_revisions (thread_id, title, body, edited_by)
    values (old.id, old.title, old.body, (select auth.uid()));
    if is_public then
      new.edited_at := now();
    end if;
  end if;
  return new;
end;
$$;

-- Comments: moderators hide comments but never put words in someone else's mouth.

create or replace function public.comments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.body is distinct from old.body then
    if not exists (
      select 1 from public.threads where id = new.thread_id and status = 'published'
    ) then
      raise exception 'comments are only possible on published threads' using errcode = '42501';
    end if;
  end if;

  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.hidden_at is not null or new.hidden_by is not null then
      raise exception 'only moderators can hide comments' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.thread_id is distinct from old.thread_id
    or new.author_id is distinct from old.author_id
    or new.created_at is distinct from old.created_at then
    raise exception 'thread, author and created_at of a comment are read-only' using errcode = '42501';
  end if;

  if new.body is distinct from old.body and old.author_id is distinct from (select auth.uid()) then
    raise exception 'only the author can edit a comment' using errcode = '42501';
  end if;

  if new.hidden_at is distinct from old.hidden_at or new.hidden_by is distinct from old.hidden_by then
    if not public.is_moderator() then
      raise exception 'only moderators can hide comments' using errcode = '42501';
    end if;
    new.hidden_by := case when new.hidden_at is null then null else (select auth.uid()) end;
  end if;

  if new.body is distinct from old.body then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;

-- A hidden comment stays as the moderator left it; its author can no longer change it.
drop policy if exists "authors edit own comments, moderators hide" on public.comments;
create policy "authors edit own comments, moderators hide"
  on public.comments for update to authenticated
  using ((author_id = (select auth.uid()) and hidden_at is null) or (select public.is_moderator()))
  with check (author_id = (select auth.uid()) or (select public.is_moderator()));

revoke execute on function
  public.default_display_name(jsonb, text, uuid),
  public.threads_touch_on_publish()
from public, anon, authenticated;
