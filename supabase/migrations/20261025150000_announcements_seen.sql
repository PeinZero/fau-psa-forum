-- Unseen-announcements badge: each member remembers when they last opened /announcements.
-- Existing profiles start at the migration time so nobody gets a wall of old announcements;
-- new profiles start at their sign-up time.
alter table public.profiles
  add column announcements_seen_at timestamptz default now();

-- The existing own-row update policy and profiles_guard_update still apply; only this column is added.
grant update (announcements_seen_at) on table public.profiles to authenticated;
