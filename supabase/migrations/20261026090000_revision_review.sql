-- Edits to public threads go live immediately; moderators read each revision afterwards and
-- mark it reviewed, so the "Recent edits" queue empties. Existing revisions stay unreviewed.

alter table public.thread_revisions
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null;

-- Moderator queue (unreviewed, newest first) and the "Reviewed" history.
create index thread_revisions_unreviewed_created_idx
  on public.thread_revisions (created_at desc) where reviewed_at is null;
create index thread_revisions_reviewed_at_idx
  on public.thread_revisions (reviewed_at desc) where reviewed_at is not null;
create index thread_revisions_reviewed_by_idx on public.thread_revisions (reviewed_by);

-- The database decides who reviewed and when; a client can only switch the review on or off.
create function public.thread_revisions_record_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reviewed_at is null then
    new.reviewed_by := null;
  else
    new.reviewed_at := now();
    new.reviewed_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger thread_revisions_record_review
  before update of reviewed_at on public.thread_revisions
  for each row
  when (old.reviewed_at is distinct from new.reviewed_at)
  execute function public.thread_revisions_record_review();

grant update (reviewed_at) on table public.thread_revisions to authenticated;

create policy "moderators review revisions"
  on public.thread_revisions for update to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

revoke execute on function public.thread_revisions_record_review() from public, anon, authenticated;
