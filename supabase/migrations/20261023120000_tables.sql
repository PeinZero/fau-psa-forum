create type public.user_role as enum ('member', 'moderator', 'superadmin');
create type public.affiliation as enum ('student', 'graduate', 'postgrad', 'resident');
create type public.city as enum ('erlangen', 'nuremberg', 'both');
create type public.thread_status as enum ('pending', 'published', 'rejected', 'archived');
create type public.application_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 40),
  affiliation public.affiliation,
  role public.user_role not null default 'member',
  created_at timestamptz not null default now()
);

create table public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null unique check (char_length(btrim(name)) between 2 and 60),
  description text check (char_length(description) <= 300),
  sort_order int not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null
);

create table public.threads (
  id bigint generated always as identity primary key,
  -- Generated on insert by trigger and never follows title edits, so shared WhatsApp links keep working.
  slug text not null unique default '',
  title text not null check (char_length(btrim(title)) between 8 and 150),
  body text not null check (char_length(body) <= 20000),
  category_id bigint not null references public.categories (id) on delete restrict,
  city public.city,
  -- Null after account deletion: the knowledge stays, shown as "deleted user".
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  status public.thread_status not null default 'pending',
  is_outdated boolean not null default false,
  is_pinned boolean not null default false,
  best_comment_id bigint,
  rejection_reason text check (char_length(rejection_reason) <= 1000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  edited_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', title), 'A') || setweight(to_tsvector('english', body), 'B')
  ) stored
);

create table public.thread_revisions (
  id bigint generated always as identity primary key,
  thread_id bigint not null references public.threads (id) on delete cascade,
  title text not null,
  body text not null,
  edited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.comments (
  id bigint generated always as identity primary key,
  thread_id bigint not null references public.threads (id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  body text not null check (char_length(btrim(body)) >= 1 and char_length(body) <= 5000),
  edited_at timestamptz,
  hidden_at timestamptz,
  hidden_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('english', body)) stored
);

alter table public.threads
  add constraint threads_best_comment_id_fkey
  foreign key (best_comment_id) references public.comments (id) on delete set null;

create table public.moderator_applications (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  motivation text not null check (char_length(btrim(motivation)) between 20 and 1000),
  status public.application_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Thread lists: pinned first, then most recent activity, per category or across all.
create index threads_status_category_activity_idx
  on public.threads (status, category_id, is_pinned desc, last_activity_at desc);
create index threads_status_activity_idx
  on public.threads (status, is_pinned desc, last_activity_at desc);
-- Moderator queue, oldest first.
create index threads_pending_created_idx on public.threads (created_at) where status = 'pending';
create index threads_author_status_idx on public.threads (author_id, status);
create index threads_search_idx on public.threads using gin (search);
create index threads_best_comment_id_idx on public.threads (best_comment_id);
create index threads_reviewed_by_idx on public.threads (reviewed_by);

create index thread_revisions_thread_created_idx on public.thread_revisions (thread_id, created_at desc);
-- Moderator dashboard "recently edited".
create index thread_revisions_created_idx on public.thread_revisions (created_at desc);
create index thread_revisions_edited_by_idx on public.thread_revisions (edited_by);

create index comments_thread_created_idx on public.comments (thread_id, created_at);
create index comments_author_idx on public.comments (author_id);
create index comments_hidden_by_idx on public.comments (hidden_by);
create index comments_search_idx on public.comments using gin (search);

create index categories_sort_order_idx on public.categories (sort_order);
create index categories_created_by_idx on public.categories (created_by);

create unique index moderator_applications_one_pending_idx
  on public.moderator_applications (user_id) where status = 'pending';
create index moderator_applications_user_idx on public.moderator_applications (user_id);
create index moderator_applications_status_created_idx
  on public.moderator_applications (status, created_at);
create index moderator_applications_reviewed_by_idx on public.moderator_applications (reviewed_by);
