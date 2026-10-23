-- New accounts cannot post links in comments. Threads are reviewed by moderators before anyone sees
-- them, so only comments, which appear immediately, are a spam channel. An account is trusted once it
-- is a day old and has written 3 comments; moderators and the service role are exempt. Bare
-- domains without a scheme are not detected: the rule stops link-dropping bots, not determined people.

create function public.contains_link(body text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select body ~* '(https?://|www\.)' or body ~ '\]\(';
$$;

-- Counts hidden comments too, which row-level security hides from the author.
create function public.my_comment_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.comments where author_id = (select auth.uid());
$$;

create function public.comments_link_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_moderator() then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then
    return new;
  end if;
  if not public.contains_link(new.body) then
    return new;
  end if;
  if (select created_at from public.profiles where id = new.author_id) > now() - interval '1 day'
    or public.my_comment_count() - (tg_op = 'UPDATE')::int < 3 then
    raise exception 'new accounts cannot post links yet' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger comments_link_limit
  before insert or update of body on public.comments
  for each row execute function public.comments_link_limit();
