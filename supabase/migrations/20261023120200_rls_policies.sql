-- Row level security and grants. Matrix: docs/schema.md "Permissions (RLS)".
-- Supabase grants everything in public to anon/authenticated by default; reset that to
-- the minimum. Column-level grants keep author, slug, review and timestamp columns
-- out of reach of clients entirely; the guard triggers handle member vs moderator.

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.threads enable row level security;
alter table public.thread_revisions enable row level security;
alter table public.comments enable row level security;
alter table public.moderator_applications enable row level security;

revoke all on table
  public.profiles, public.categories, public.threads, public.thread_revisions,
  public.comments, public.moderator_applications
from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select on table public.profiles, public.categories, public.threads, public.comments to anon;
grant select on table
  public.profiles, public.categories, public.threads, public.thread_revisions,
  public.comments, public.moderator_applications
to authenticated;

grant update (display_name, affiliation) on table public.profiles to authenticated;
grant insert (slug, name, description, sort_order), update (slug, name, description, sort_order), delete
  on table public.categories to authenticated;
grant insert (title, body, category_id, city),
  update (title, body, category_id, city, status, is_outdated, is_pinned, best_comment_id, rejection_reason)
  on table public.threads to authenticated;
grant insert (thread_id, body), update (body, hidden_at) on table public.comments to authenticated;
grant insert (motivation) on table public.moderator_applications to authenticated;

revoke execute on function
  public.is_moderator(),
  public.is_superadmin(),
  public.review_moderator_application(bigint, public.application_status),
  public.set_user_role(uuid, public.user_role),
  public.search_threads(text),
  public.handle_new_user(),
  public.profiles_guard_update(),
  public.threads_before_insert(),
  public.threads_guard_update(),
  public.threads_record_revision(),
  public.comments_guard(),
  public.comments_bump_thread_activity()
from public, anon, authenticated;

grant execute on function
  public.is_moderator(),
  public.is_superadmin(),
  public.review_moderator_application(bigint, public.application_status),
  public.set_user_role(uuid, public.user_role)
to authenticated;
grant execute on function public.search_threads(text) to anon, authenticated;

-- profiles: public display data; users edit only their own row (role via set_user_role()).

create policy "profiles are public"
  on public.profiles for select to anon, authenticated
  using (true);

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- categories

create policy "categories are public"
  on public.categories for select to anon, authenticated
  using (true);

create policy "moderators create categories"
  on public.categories for insert to authenticated
  with check ((select public.is_moderator()));

create policy "moderators rename categories"
  on public.categories for update to authenticated
  using ((select public.is_moderator()))
  with check ((select public.is_moderator()));

create policy "superadmin deletes categories"
  on public.categories for delete to authenticated
  using ((select public.is_superadmin()));

-- threads

create policy "public threads are readable"
  on public.threads for select to anon
  using (status in ('published', 'archived'));

create policy "members read public and own threads, moderators all"
  on public.threads for select to authenticated
  using (
    status in ('published', 'archived')
    or author_id = (select auth.uid())
    or (select public.is_moderator())
  );

create policy "members submit pending threads"
  on public.threads for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'pending');

create policy "authors edit own threads, moderators moderate"
  on public.threads for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_moderator()))
  with check (author_id = (select auth.uid()) or (select public.is_moderator()));

-- thread_revisions: written by trigger only.

create policy "moderators read revisions"
  on public.thread_revisions for select to authenticated
  using ((select public.is_moderator()));

-- comments

create policy "visible comments on public threads are readable"
  on public.comments for select to anon
  using (
    hidden_at is null
    and exists (
      select 1 from public.threads t
      where t.id = thread_id and t.status in ('published', 'archived')
    )
  );

create policy "members read visible comments, moderators all"
  on public.comments for select to authenticated
  using (
    (select public.is_moderator())
    or (hidden_at is null and exists (select 1 from public.threads t where t.id = thread_id))
  );

create policy "members comment as themselves"
  on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "authors edit own comments, moderators hide"
  on public.comments for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_moderator()))
  with check (author_id = (select auth.uid()) or (select public.is_moderator()));

-- moderator_applications: reviewed only through review_moderator_application().

create policy "applicants read own, moderators all applications"
  on public.moderator_applications for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_moderator()));

create policy "members apply for moderator"
  on public.moderator_applications for insert to authenticated
  with check (user_id = (select auth.uid()) and not (select public.is_moderator()));
