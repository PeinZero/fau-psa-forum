-- Moderators can restrict a member: they keep reading but cannot post, report or vote until a
-- moderator lifts it. The reason lives in its own table because profiles are public.

create table public.user_restrictions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  restricted_by uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index user_restrictions_restricted_by_idx on public.user_restrictions (restricted_by);

alter table public.user_restrictions enable row level security;

create policy "moderators read restrictions"
  on public.user_restrictions for select to authenticated
  using (public.is_moderator());

grant select on table public.user_restrictions to authenticated;

-- Moderators restrict members only, never themselves or each other.
create function public.set_user_restricted(target uuid, restricted boolean, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role public.user_role;
begin
  if not public.is_moderator() then
    raise exception 'only moderators can restrict accounts' using errcode = '42501';
  end if;

  select role into target_role from public.profiles where id = target;
  if not found then
    raise exception 'user not found' using errcode = 'P0002';
  end if;
  if target_role <> 'member' then
    raise exception 'moderators cannot be restricted' using errcode = '42501';
  end if;

  if restricted then
    if btrim(coalesce(reason, '')) = '' then
      raise exception 'a reason is required' using errcode = 'P0001';
    end if;
    insert into public.user_restrictions (user_id, restricted_by, reason)
    values (target, (select auth.uid()), btrim(reason))
    on conflict (user_id) do update set reason = excluded.reason, restricted_by = excluded.restricted_by;
  else
    delete from public.user_restrictions where user_id = target;
  end if;
end;
$$;

-- Reads the caller's own status past row-level security, so the posting triggers can use it.
create function public.am_restricted()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_restrictions where user_id = (select auth.uid()));
$$;

create function public.reject_if_restricted()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') and public.am_restricted() then
    raise exception 'your account is restricted' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger comments_reject_if_restricted
  before insert or update of body on public.comments
  for each row execute function public.reject_if_restricted();
create trigger threads_reject_if_restricted
  before insert on public.threads
  for each row execute function public.reject_if_restricted();
create trigger reports_reject_if_restricted
  before insert on public.reports
  for each row execute function public.reject_if_restricted();
create trigger comment_votes_reject_if_restricted
  before insert or update on public.comment_votes
  for each row execute function public.reject_if_restricted();

revoke execute on function
  public.set_user_restricted(uuid, boolean, text),
  public.am_restricted(),
  public.reject_if_restricted()
from public, anon, authenticated;
grant execute on function public.set_user_restricted(uuid, boolean, text), public.am_restricted() to authenticated;
