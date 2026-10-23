-- Guides: ordered checklists curated by the moderators ("Arriving in Erlangen": Anmeldung ->
-- bank account -> health insurance -> RP appointment). Steps link to a thread or carry their
-- own text. Members tick steps off privately.

create table public.guides (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(btrim(title)) between 4 and 120),
  summary text not null default '' check (char_length(summary) <= 300),
  is_featured boolean not null default false,
  sort_order int not null default 0,
  -- Null after the creator deletes their account; the guide stays.
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guides_featured_sort_idx on public.guides (is_featured desc, sort_order, id);
create index guides_created_by_idx on public.guides (created_by);

create table public.guide_steps (
  id bigint generated always as identity primary key,
  guide_id bigint not null references public.guides (id) on delete cascade,
  position int not null,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  body text check (char_length(body) <= 5000),
  -- A deleted thread leaves the step in place with its own text.
  thread_id bigint references public.threads (id) on delete set null,
  constraint guide_steps_guide_position_key unique (guide_id, position)
);

create index guide_steps_thread_id_idx on public.guide_steps (thread_id);

create table public.guide_progress (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  step_id bigint not null references public.guide_steps (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, step_id)
);

create index guide_progress_step_id_idx on public.guide_progress (step_id);

create function public.guides_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger guides_touch
  before update on public.guides
  for each row execute function public.guides_touch();

-- Editing a step counts as editing its guide.
create function public.guide_steps_touch_guide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.guides set updated_at = now()
  where id in (new.guide_id, old.guide_id);
  return null;
end;
$$;

create trigger guide_steps_touch_guide
  after insert or update or delete on public.guide_steps
  for each row execute function public.guide_steps_touch_guide();

-- Row level security and grants

alter table public.guides enable row level security;
alter table public.guide_steps enable row level security;
alter table public.guide_progress enable row level security;

revoke all on table public.guides, public.guide_steps, public.guide_progress from anon, authenticated;
revoke all on sequence public.guides_id_seq, public.guide_steps_id_seq from anon, authenticated;
grant select on table public.guides, public.guide_steps to anon, authenticated;
grant insert (slug, title, summary, is_featured, sort_order),
  update (slug, title, summary, is_featured, sort_order), delete
  on table public.guides to authenticated;
grant insert (guide_id, position, title, body, thread_id),
  update (position, title, body, thread_id), delete
  on table public.guide_steps to authenticated;
grant select, insert (step_id), delete on table public.guide_progress to authenticated;

create policy "guides are public"
  on public.guides for select to anon, authenticated
  using (true);

create policy "moderators create guides"
  on public.guides for insert to authenticated
  with check ((select public.is_moderator()));

create policy "moderators edit guides"
  on public.guides for update to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

create policy "moderators delete guides"
  on public.guides for delete to authenticated
  using ((select public.is_moderator()));

create policy "guide steps are public"
  on public.guide_steps for select to anon, authenticated
  using (true);

create policy "moderators create guide steps"
  on public.guide_steps for insert to authenticated
  with check ((select public.is_moderator()));

create policy "moderators edit guide steps"
  on public.guide_steps for update to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

create policy "moderators delete guide steps"
  on public.guide_steps for delete to authenticated
  using ((select public.is_moderator()));

create policy "users read their own guide progress"
  on public.guide_progress for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users tick off steps for themselves"
  on public.guide_progress for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users untick their own steps"
  on public.guide_progress for delete to authenticated
  using (user_id = (select auth.uid()));

revoke execute on function
  public.guides_touch(),
  public.guide_steps_touch_guide()
from public, anon, authenticated;
