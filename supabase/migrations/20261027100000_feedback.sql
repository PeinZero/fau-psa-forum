-- In-app feedback for the friends-and-family launch. Signed-in people send short notes about the
-- forum itself; only moderators read and clear them. Members cannot read any feedback, their own
-- included, so the form is write-only for them.

create table public.feedback (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  message text not null check (char_length(btrim(message)) between 5 and 2000),
  page text check (page is null or char_length(page) <= 300),
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_user_id_created_at_idx on public.feedback (user_id, created_at);

-- Members cannot read feedback, so the trigger counts their recent rows through this helper.
create function public.my_recent_feedback_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.feedback
  where user_id = (select auth.uid()) and created_at > now() - interval '1 hour';
$$;

-- 5 per hour per member; moderators and the service role are exempt like the other rate limits.
create function public.feedback_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_moderator() then
    perform pg_advisory_xact_lock(hashtextextended('rate_feedback:' || new.user_id::text, 0));
    perform public.enforce_rate_limit(
      public.my_recent_feedback_count(),
      5, 'You have sent a lot of feedback in the last hour. Please try again later.'
    );
  end if;
  return new;
end;
$$;

create trigger feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.feedback_rate_limit();

alter table public.feedback enable row level security;

revoke all on table public.feedback from anon, authenticated;
revoke all on sequence public.feedback_id_seq from anon, authenticated;
-- user_id is not insertable, so it always comes from the session.
grant select, delete, insert (message, page) on table public.feedback to authenticated;

create policy "members send feedback"
  on public.feedback for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "moderators read feedback"
  on public.feedback for select to authenticated
  using ((select public.is_moderator()));

create policy "moderators delete feedback"
  on public.feedback for delete to authenticated
  using ((select public.is_moderator()));

revoke execute on function
  public.my_recent_feedback_count(),
  public.feedback_rate_limit()
from public, anon, authenticated;

grant execute on function public.my_recent_feedback_count() to authenticated;
