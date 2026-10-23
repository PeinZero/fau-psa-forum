-- Reports: members flag a thread or comment for the moderators.

create type public.report_reason as enum ('spam', 'offensive', 'wrong_info', 'personal_data', 'other');
create type public.report_status as enum ('open', 'resolved', 'dismissed');

create table public.reports (
  id bigint generated always as identity primary key,
  -- Null after the reporter deletes their account; the moderators still see the report.
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  thread_id bigint references public.threads (id) on delete cascade,
  comment_id bigint references public.comments (id) on delete cascade,
  reason public.report_reason not null,
  details text check (char_length(details) <= 500),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_one_target check ((thread_id is null) <> (comment_id is null))
);

-- One open report per reporter per thread or comment; reporting again after a decision is fine.
create unique index reports_one_open_per_target_idx
  on public.reports (reporter_id, thread_id, comment_id) nulls not distinct
  where status = 'open' and reporter_id is not null;
-- Moderator queue, oldest first.
create index reports_open_created_idx on public.reports (created_at) where status = 'open';
create index reports_reporter_status_idx on public.reports (reporter_id, status);
create index reports_thread_id_idx on public.reports (thread_id);
create index reports_comment_id_idx on public.reports (comment_id);
create index reports_resolved_by_idx on public.reports (resolved_by);

create function public.reports_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_moderator() then
    -- Serialises concurrent reports by the same member so the cap cannot be raced.
    perform pg_advisory_xact_lock(hashtextextended('open_reports:' || new.reporter_id::text, 0));
    if (
      select count(*) from public.reports
      where reporter_id = new.reporter_id and status = 'open'
    ) >= 10 then
      raise exception 'you already have 10 open reports' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_before_insert();

create function public.reports_record_decision()
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

create trigger reports_record_decision
  before update of status on public.reports
  for each row
  when (old.status is distinct from new.status)
  execute function public.reports_record_decision();

alter table public.reports enable row level security;

revoke all on table public.reports from anon, authenticated;
grant select on table public.reports to authenticated;
grant insert (thread_id, comment_id, reason, details), update (status)
  on table public.reports to authenticated;

-- Only what the reporter can see publicly can be reported, so pending threads stay invisible.
create policy "members report public threads and visible comments"
  on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and (
      exists (
        select 1 from public.threads t
        where t.id = reports.thread_id and t.status in ('published', 'archived')
      )
      or exists (
        select 1 from public.comments c
        join public.threads t on t.id = c.thread_id
        where c.id = reports.comment_id and c.hidden_at is null
          and t.status in ('published', 'archived')
      )
    )
  );

create policy "reporters read own, moderators all reports"
  on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_moderator()));

create policy "moderators decide reports"
  on public.reports for update to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

-- Account deletion: the profile, applications and sessions go; threads and comments stay
-- with author_id null and are shown as "Deleted user".

create function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'sign in to delete your account' using errcode = '42501';
  end if;

  -- Locking every superadmin row serialises this with concurrent demotions and deletions.
  perform 1 from public.profiles where role = 'superadmin' for update;

  if exists (select 1 from public.profiles where id = caller and role = 'superadmin')
    and (select count(*) from public.profiles where role = 'superadmin') <= 1 then
    raise exception 'the last superadmin cannot delete their account' using errcode = 'P0001';
  end if;

  delete from auth.users where id = caller;
end;
$$;

revoke execute on function
  public.reports_before_insert(),
  public.reports_record_decision(),
  public.delete_own_account()
from public, anon, authenticated;

grant execute on function public.delete_own_account() to authenticated;
