# Database schema

Agreed with the owner. Read before writing migrations, queries or RLS policies.
Authorization lives in Postgres Row Level Security; the UI only mirrors it.

## Enums

- `user_role`: `member`, `moderator`, `superadmin`
- `affiliation`: `student`, `graduate`, `postgrad`, `resident`
- `city`: `erlangen`, `nuremberg`, `both`
- `thread_status`: `pending`, `published`, `rejected`, `archived`
- `application_status`: `pending`, `approved`, `rejected`

## Tables

### profiles
One row per auth user, created by a trigger on `auth.users` insert.

| column | type | notes |
|---|---|---|
| id | uuid PK | = `auth.users.id`, cascade delete |
| display_name | text | 2–40 chars; defaults to Google name or email prefix |
| affiliation | affiliation null | self-chosen, unverified badge |
| role | user_role | default `member`; changed only via `set_user_role()` |
| created_at | timestamptz | |

Accounts that signed in before the trigger existed are backfilled with the same naming rule
(`default_display_name()`).

### categories
Seeded: RP & Visa, Courses, Accommodation, Jobs, First Steps, Other.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| slug | text unique | |
| name | text unique | |
| description | text null | |
| sort_order | int | |
| created_by | uuid null → profiles | |

### threads

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| slug | text unique | from title + short suffix, stable after edits (shared WhatsApp links never break) |
| title | text | 8–150 chars |
| body | text | markdown, ≤ 20k chars |
| category_id | bigint → categories | restrict delete |
| city | city null | null = not city-specific |
| author_id | uuid null → profiles | set null on account deletion ("deleted user"); knowledge stays |
| status | thread_status | default `pending` |
| is_outdated | bool | banner "information may be outdated"; thread stays open |
| is_pinned | bool | pinned on top of its category |
| best_comment_id | bigint null → comments | set by moderators; shown first |
| rejection_reason | text null | visible to the author |
| reviewed_by / reviewed_at | uuid null / timestamptz null | last moderation decision |
| edited_at | timestamptz null | set when title/body change after publishing |
| last_activity_at | timestamptz | bumped by new comments and on approval (pending/rejected → published); list sort order |
| created_at | timestamptz | |
| search | tsvector generated | title (weight A) + body (weight B), English config |

`archived` = read-only (no new comments), hidden from lists, still reachable by link and search.

### thread_revisions
History for the "edits go live, moderators notified" rule. A trigger inserts the previous
title/body whenever the title or body changes on a published/archived thread, or on a thread
in any status when the editor is not its author (moderator curation).

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| thread_id | bigint → threads | cascade |
| title, body | text | previous version |
| edited_by | uuid null → profiles | |
| created_at | timestamptz | |

Moderator dashboard "Recently edited" = revisions created since the moderator last looked
(or the last 7 days).

### comments
Flat, chronological.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| thread_id | bigint → threads | cascade |
| author_id | uuid null → profiles | set null on account deletion |
| body | text | 1–5k chars |
| edited_at | timestamptz null | |
| hidden_at / hidden_by | timestamptz null / uuid null | moderator soft-delete; hidden from the public, visible to moderators |
| created_at | timestamptz | |
| search | tsvector generated | |

### moderator_applications

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| user_id | uuid → profiles | cascade |
| motivation | text | 20–1000 chars |
| status | application_status | default `pending`; one pending application per user (partial unique index) |
| reviewed_by / reviewed_at | uuid null / timestamptz null | |
| created_at | timestamptz | |

Approval runs through `review_moderator_application(id, decision)`, which also sets the role.

### Later
- `voice_notes`: comment_id, R2 object key, mime type, duration (cap ~3 min).
- `reports`: "flag this" on threads/comments for moderators.
- Moderator daily email digest: needs custom SMTP + a daily scheduled job; until then the
  dashboard counters (pending threads, recent edits, applications) cover it.

## Permissions (RLS)

| action | anonymous | member | moderator | superadmin |
|---|---|---|---|---|
| read published/archived threads, visible comments, categories, public profile fields | ✓ | ✓ | ✓ | ✓ |
| read own pending/rejected threads | | ✓ | ✓ | ✓ |
| read all pending/rejected threads, hidden comments, revisions | | | ✓ | ✓ |
| submit thread (always `pending`) | | ✓ (max 3 pending) | ✓ | ✓ |
| edit thread title/body/category/city | | own | any (revisions recorded) | any (revisions recorded) |
| comment on published, non-archived threads | | ✓ | ✓ | ✓ |
| edit own comment (not once hidden); nobody edits others' comments | | ✓ | ✓ | ✓ |
| approve/reject/archive/outdate/pin threads, set best answer, hide comments | | | ✓ | ✓ |
| create/rename categories | | | ✓ | ✓ |
| delete categories | | | | ✓ |
| apply to become moderator | | ✓ | | |
| review moderator applications | | | ✓ | ✓ |
| change roles / demote moderators | | | | ✓ |

Status, review, pin and role columns are never writable by authors directly; moderation goes
through `security definer` functions or moderator-only policies, and a trigger rejects
member updates to protected columns. Moderators hide comments but cannot change their body.

## Search
`search_threads(q text)` uses `websearch_to_tsquery('english', q)` over thread `search` and
visible comment `search`, returns published + archived threads ranked by `ts_rank`
(threads matched in the title rank first).

## Applying migrations

Migrations live in `supabase/migrations/` and are applied by the owner with the Supabase CLI:

```sh
npx supabase login
npx supabase link --project-ref zjhrjhwqybzlahwbcxwh
npx supabase db push
```

`npm run test:db` replays the same migrations in PGlite and checks the RLS rules above.

After signing in to the site once, make the owner superadmin in the Supabase SQL editor
(roles otherwise change only through `set_user_role()`, which requires a superadmin):

```sql
update public.profiles set role = 'superadmin'
where id = (select id from auth.users where email = '<owner email>');
```
