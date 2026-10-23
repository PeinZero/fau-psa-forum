# Database schema

Agreed with the owner. Read before writing migrations, queries or RLS policies.
Authorization lives in Postgres Row Level Security; the UI only mirrors it.

## Enums

- `user_role`: `member`, `moderator`, `superadmin`
- `affiliation`: `student`, `graduate`, `postgrad`, `resident`
- `city`: `erlangen`, `nuremberg`, `both`
- `thread_status`: `pending`, `published`, `rejected`, `archived`
- `application_status`: `pending`, `approved`, `rejected`
- `report_reason`: `spam`, `offensive`, `wrong_info`, `personal_data`, `other`
- `report_status`: `open`, `resolved`, `dismissed`
- `notification_type`: `reply`, `mention`, `thread_comment`, `thread_approved`, `thread_rejected`,
  `best_answer`, `application_approved`, `application_rejected`, `mod_new_thread`,
  `mod_new_application`, `mod_new_report`, `announcement`

## Tables

### profiles
One row per auth user, created by a trigger on `auth.users` insert.

| column | type | notes |
|---|---|---|
| id | uuid PK | = `auth.users.id`, cascade delete |
| display_name | text | 2–40 chars; defaults to Google name or email prefix |
| username | text unique | @handle, 3–20 chars `[a-z0-9_]`, stored lowercase; editable by the user |
| affiliation | affiliation null | self-chosen, unverified badge |
| role | user_role | default `member`; changed only via `set_user_role()` |
| created_at | timestamptz | |

Accounts that signed in before the trigger existed are backfilled with the same naming rule
(`default_display_name()`).

Handles: a `before insert` trigger on `profiles` derives the username from the display name
(`generate_username()`: lowercase, the staff words admin/moderator/support dropped, every run
of other characters becomes `_`, cut to 20,
`_user` appended below 3 chars, numeric suffix `ayesha_khan2` when taken or reserved), so
`handle_new_user()` needs no change. Existing profiles were backfilled the same way in sign-up
order. Plain `text` rather than `citext`: the value is always stored lowercase, so a normal
unique constraint is case-insensitive and nothing depends on an extension (or on
`search_path` resolving citext operators). Look handles up with the lowercased input.

When a user sets their own username it is trimmed and lowercased, then rejected with:
- `username must be 3 to 20 characters: letters, digits or underscores` (23514)
- `username is reserved` (23514): admin, mod, moderator, support, root, system, null, me, new,
  settings, and any handle containing admin, moderator or support (`fau_psa_admin`). Names that
  only contain "mod" (`modassir`) are fine. Checked by the trigger when a handle is set, so
  handles chosen before a word became reserved stay until their owner changes them.
- `username is already taken` (23505); a race past this check hits the
  `profiles_username_key` unique constraint instead.

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
Chronological with one level of replies.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| thread_id | bigint → threads | cascade |
| author_id | uuid null → profiles | set null on account deletion |
| body | text | 1–5k chars |
| edited_at | timestamptz null | |
| hidden_at / hidden_by | timestamptz null / uuid null | moderator soft-delete; hidden from the public, visible to moderators |
| parent_id | bigint null → comments | cascade; set on insert only. Must be a comment of the same thread the replier can see ("a reply must belong to a visible comment of the same thread"); a reply to a reply is re-pointed to the top-level comment |
| created_at | timestamptz | |
| search | tsvector generated | |

Replies render under their parent; the UI pre-fills the `@handle` of the person replied to.
A hidden parent keeps its replies, which stay visible under the normal rules. Best answer can
be any comment, reply or not.

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

### reports
"Flag this" on a thread or comment, for the moderators.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| reporter_id | uuid null → profiles | default `auth.uid()`; set null on account deletion |
| thread_id | bigint null → threads | cascade |
| comment_id | bigint null → comments | cascade; exactly one of `thread_id` / `comment_id` (`reports_one_target`) |
| reason | report_reason | |
| details | text null | ≤ 500 chars |
| status | report_status | default `open` |
| resolved_by / resolved_at | uuid null / timestamptz null | set by trigger when a moderator changes the status; cleared on reopen |
| created_at | timestamptz | |

Only published/archived threads and visible comments on them can be reported. One open report
per reporter per target (`reports_one_open_per_target_idx`); members have at most 10 open
reports ("you already have 10 open reports"), moderators are exempt.

### announcements
News from the moderators on `/announcements`; the newest pinned one is the home page banner.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| title | text | 4–120 chars |
| body | text | markdown, not blank, ≤ 10k chars |
| is_pinned | bool | pinned first, then newest first |
| author_id | uuid null → profiles | default `auth.uid()`; set null on account deletion |
| created_at | timestamptz | |
| updated_at | timestamptz | set by trigger when title or body change (pinning is not an edit) |

Posting one notifies every profile except the author (`announcement`).

### Account deletion
`delete_own_account()` (authenticated only) deletes the caller's `auth.users` row. The profile
and moderator applications cascade; threads, comments, revisions and reports stay with the
user column set to null ("Deleted user"). The last superadmin cannot delete their account
("the last superadmin cannot delete their account").
The function is owned by `postgres`, which on hosted Supabase may delete from `auth.users`;
`npm run test:db` runs as a PGlite superuser, so it proves the cascades but not that grant.

### Mentions
`@username` in a thread body or comment body. `mentioned_user_ids(body)` (internal, used by the
notification triggers) takes the first 10 distinct `@handle` tokens, matched case-insensitively
where the `@` does not follow a letter, digit or underscore (so `bilal@example.com` is no
mention), and returns the ids of the users that exist in first-mention order. Mentions inside
markdown code also count. A comment and a thread body each send at most 10 `mention`
notifications over their lifetime, edits included; past that, newly added handles notify nobody.
The UI renders them as links to `/u/[username]` and opens a user picker on `@`.

### notifications
Inserted only by `security definer` triggers; clients read their own and set `read_at`.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| recipient_id | uuid → profiles | cascade |
| actor_id | uuid null → profiles | who caused it; set null on account deletion |
| type | notification_type | |
| thread_id | bigint null → threads | cascade |
| comment_id | bigint null → comments | cascade |
| announcement_id | bigint null → announcements | cascade |
| created_at | timestamptz | |
| read_at | timestamptz null | the only client-writable column |

Index `(recipient_id, read_at, created_at desc)` serves the bell count and the list.
`mark_all_notifications_read()` marks the caller's unread rows.

When they fire (the actor is never notified; nothing is sent about content the recipient
cannot read, so pending threads and hidden comments notify nobody but moderators):

| event | recipients → type |
|---|---|
| visible comment on a published thread | parent comment's author → `reply`, mentioned users → `mention`, thread author → `thread_comment`; one per recipient, reply beats mention beats thread_comment |
| comment edited | newly mentioned users not yet notified about that comment → `mention` (max 10 mentions per comment in total) |
| comment hidden | its `reply` / `mention` / `thread_comment` notifications are deleted |
| new pending thread | every moderator and superadmin → `mod_new_thread` |
| thread pending/rejected → published | author → `thread_approved`; users mentioned in the body → `mention` (as from the author) |
| published thread body edited | users mentioned for the first time on this thread → `mention` (max 10 mentions per thread in total) |
| thread → rejected | author → `thread_rejected` |
| best answer set | comment author → `best_answer` |
| new moderator application | every moderator and superadmin → `mod_new_application` |
| application approved / rejected | applicant → `application_approved` / `application_rejected` |
| new report | every moderator and superadmin → `mod_new_report` (thread_id and comment_id of the target) |
| new announcement | every other user → `announcement` (announcement_id); deleting the announcement deletes them |

Delivery: bell with unread count in the header + `/notifications` page (mark one/all read).
`notifications` is in the `supabase_realtime` publication; subscribe with `postgres_changes`
filtered by `recipient_id`. Realtime checks the select policy per subscriber, so RLS decides
which rows each one receives.

### Planned next
- Public profile page `/u/[username]` (name, badge, published threads).
- Email copies of notifications once custom SMTP exists, with a per-user opt-out.

### Later
- `voice_notes`: comment_id, R2 object key, mime type, duration (cap ~3 min).
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
| report published/archived threads and visible comments | | ✓ (max 10 open) | ✓ | ✓ |
| read reports | | own | all | all |
| resolve/dismiss reports | | | ✓ | ✓ |
| delete own account (`delete_own_account()`) | | ✓ | ✓ | ✓ (not the last superadmin) |
| reply to a visible comment (one level) | | ✓ | ✓ | ✓ |
| change own username | | ✓ | ✓ | ✓ |
| read own notifications, set `read_at`, `mark_all_notifications_read()` | | ✓ | ✓ | ✓ |
| read announcements | ✓ | ✓ | ✓ | ✓ |
| post, edit, pin and delete announcements | | | ✓ | ✓ |

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
