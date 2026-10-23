-- Rate limits on what members can create, so a script cannot flood the forum. Moderators and the
-- service role are exempt. The limits count rows by created_at, so they ease on their own; an
-- advisory lock per member and kind stops parallel requests from racing past the cap.

create function public.enforce_rate_limit(recent bigint, max_allowed int, message text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if recent >= max_allowed then
    raise exception 'rate limit: %', message using errcode = 'P0001';
  end if;
end;
$$;

-- Comments: 5 per minute and 100 per day.
create function public.comments_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_moderator() then
    perform pg_advisory_xact_lock(hashtextextended('rate_comments:' || new.author_id::text, 0));
    perform public.enforce_rate_limit(
      (select count(*) from public.comments where author_id = new.author_id and created_at > now() - interval '1 minute'),
      5, 'You are commenting too fast. Please wait a minute and try again.'
    );
    perform public.enforce_rate_limit(
      (select count(*) from public.comments where author_id = new.author_id and created_at > now() - interval '1 day'),
      100, 'You have reached the daily comment limit. Please try again tomorrow.'
    );
  end if;
  return new;
end;
$$;

create trigger comments_rate_limit
  before insert on public.comments
  for each row execute function public.comments_rate_limit();

-- Threads: 10 per day, on top of the cap of 3 waiting for review.
create function public.threads_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_moderator() then
    perform pg_advisory_xact_lock(hashtextextended('rate_threads:' || new.author_id::text, 0));
    perform public.enforce_rate_limit(
      (select count(*) from public.threads where author_id = new.author_id and created_at > now() - interval '1 day'),
      10, 'You have reached the daily limit for new threads. Please try again tomorrow.'
    );
  end if;
  return new;
end;
$$;

create trigger threads_rate_limit
  before insert on public.threads
  for each row execute function public.threads_rate_limit();

-- Reports: 10 per hour, on top of the cap of 10 open reports.
create function public.reports_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_moderator() then
    perform pg_advisory_xact_lock(hashtextextended('rate_reports:' || new.reporter_id::text, 0));
    perform public.enforce_rate_limit(
      (select count(*) from public.reports where reporter_id = new.reporter_id and created_at > now() - interval '1 hour'),
      10, 'You have sent many reports in the last hour. Please try again later.'
    );
  end if;
  return new;
end;
$$;

create trigger reports_rate_limit
  before insert on public.reports
  for each row execute function public.reports_rate_limit();

-- Votes: 30 new votes per minute. Changing or withdrawing a vote is not limited.
create function public.comment_votes_rate_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    perform pg_advisory_xact_lock(hashtextextended('rate_votes:' || new.user_id::text, 0));
    perform public.enforce_rate_limit(
      (select count(*) from public.comment_votes where user_id = new.user_id and created_at > now() - interval '1 minute'),
      30, 'You are voting too fast. Please wait a minute and try again.'
    );
  end if;
  return new;
end;
$$;

create trigger comment_votes_rate_limit
  before insert on public.comment_votes
  for each row execute function public.comment_votes_rate_limit();
