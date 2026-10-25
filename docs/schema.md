# Database schema

Reference for tables, permissions and rules. **`supabase/migrations/*.sql` is the source of truth**: the latest definition of a function or policy wins, so read the migrations for column constraints, exact error messages and trigger bodies. Authorization lives in Postgres Row Level Security (RLS); the UI only mirrors it. Change the schema only with the owner.

## Enums

- `user_role`: member, moderator, superadmin
- `affiliation`: student, graduate, postgrad, resident
- `city`: erlangen, nuremberg, both
- `thread_status`: pending, published, rejected, archived
- `application_status`, `report_status`, `update_request_status`: pending/open, approved/resolved, rejected/dismissed
- `report_reason`: spam, offensive, wrong_info, personal_data, other
- `restriction_kind`: mute, ban
- `notification_type`: see Notifications
- `moderation_action`: thread_approved/rejected/archived/unarchived/pinned/unpinned/outdated/verified, comment_hidden/unhidden, best_answer_set/unset, report_resolved/dismissed, update_request_resolved/dismissed, application_approved/rejected, role_changed, category_created/updated/deleted, announcement_created/deleted, guide_created/deleted, revision_reviewed, user_muted/banned/unrestricted

## Tables

Account deletion sets author columns to null ("Deleted user") on content tables; per-user rows cascade.

| table | key columns and purpose |
|---|---|
| `profiles` | `id` = auth user id; `display_name` 2-40; `username` unique @handle 3-20 `[a-z0-9_]`, stored lowercase, generated from the name, reserved words (admin, moderator, support, ...) rejected; `affiliation` badge; `role` (only via `set_user_role()`); `reputation`, `best_answer_count` (cached, trigger-written); `announcements_seen_at` |
| `categories` | `slug`, `name`, `description`, `sort_order`. Seeded: RP & Visa, Courses, Accommodation, Jobs, First Steps, Other |
| `threads` | `slug` (stable after edits), `title` 8-150, `body` markdown, `category_id`, `city` (null = not city-specific), `author_id`, `status` (default pending; moderator/superadmin threads insert as published), `is_outdated`, `is_pinned`, `best_comment_id`, `rejection_reason`, `reviewed_by/at`, `edited_at`, `last_activity_at`, `comment_count` and `score` (trigger-written), `last_verified_at`/`verified_by`, `search` tsvector (title A, body B), trigram index on title |
| `thread_revisions` | previous title/body kept on edits of published/archived threads or by a non-author; `reviewed_at/by` set by moderators from `/mod/edits` |
| `comments` | `thread_id`, `author_id`, `body` 1-5k, `parent_id` (one reply level; replies to replies re-point to the top-level comment), `hidden_at/by` (moderator soft delete), `score`, `search` |
| `thread_votes`, `comment_votes` | one vote per user and target, `value` -1/1; owner-only read; no own-content votes; published threads only; archived frozen |
| `update_requests` | "needs an update" flags: `note` <= 300, one open per member per thread, max 5 open per member, published threads only |
| `bookmarks`, `thread_follows` | private `(user_id, thread_id)`; authors and commenters follow automatically |
| `notification_preferences` | `muted_types[]`, `email_frequency` (off/instant/daily, stored only); no row = everything on |
| `guides`, `guide_steps`, `guide_progress` | moderator checklists: `slug`, `title`, `summary`, `is_featured`, `sort_order`; steps have `position`, `title`, `body`, optional `thread_id`; progress is per member |
| `reputation_events` | append-only points ledger, trigger-written, no client access |
| `moderator_applications` | `motivation` 20-1000, one pending per user; approval via `review_moderator_application()` |
| `reports` | exactly one of `thread_id`/`comment_id`, `reason`, `details` <= 500, `status`; one open per reporter per target, max 10 open per member |
| `announcements` | `title` 4-120, `body` markdown <= 10k, `is_pinned` |
| `feedback` | `message` 5-2000, `page`, `handled_at/by` (moderators triage); members write only |
| `notifications` | `recipient_id`, `actor_id`, `type`, optional `thread_id`, `comment_id`, `announcement_id`, `restriction_id`, `feedback_id`, `read_at` (the only client-writable column) |
| `user_restrictions` | mute/ban history: `reason` required, `expires_at` (null = permanent), `lifted_at/by` |
| `moderation_log` | append-only audit of moderator actions: `action`, `thread_id`, `comment_id`, `target_user_id`, `reason`, `details` jsonb |
| `canned_replies` | editable rejection reasons for moderators (`label`, `body`) |

Client-writable counters are guarded: `score`, `comment_count`, `reputation` and `best_answer_count` change only through their triggers (error 42501).

## Permissions (RLS)

A = anonymous, M = member, Mod = moderator, S = superadmin.

| action | A | M | Mod | S |
|---|---|---|---|---|
| read published/archived threads, visible comments, categories, public profile fields, scores, announcements, guides, reputation | x | x | x | x |
| read own pending/rejected threads | | x | x | x |
| read all pending/rejected threads, hidden comments, revisions | | | x | x |
| submit thread (max 3 pending; 10 per day) | | x | x (published at once) | x |
| edit thread title/body/category/city | | own | any, revisions kept | any |
| comment and reply on published, non-archived threads | | x | x | x |
| edit own comment (not once hidden); nobody edits others' | | x | x | x |
| approve/reject/archive/outdate/pin threads, best answer, hide comments, `mark_thread_verified()` | | | x | x |
| vote (not own content); change or withdraw own vote | | x | x | x |
| report (max 10 open); read own reports | | x | x | x |
| read all reports; resolve/dismiss reports and update requests | | | x | x |
| request an update; read own requests | | x | x | x |
| apply to become moderator | | x | | |
| review applications | | | x | x |
| create/rename categories | | | x | x |
| delete categories; change roles | | | | x |
| post, edit, pin, delete announcements; manage guides and steps | | | x | x |
| bookmarks, follows, preferences, guide progress, own notifications | | x | x | x |
| change own username; delete own account (not the last superadmin) | | x | x | x |
| mute members, lift mutes | | | x | x |
| ban, lift bans, restrict moderators | | | | x |
| read own restrictions / all restrictions | | own | all | all |
| read the moderation log; read and edit canned replies | | | x | x |
| send feedback (5 per hour) | | x | x | x |
| read, mark handled, delete feedback | | | x | x |
| read `reputation_events` | | | | |

Status, review, pin and role columns are never writable by authors directly; moderation goes through `security definer` functions or moderator-only policies, and triggers reject member updates to protected columns. Moderators hide comments but never change their body. Anyone muted or banned cannot insert threads, comments, reports, update requests, votes or applications; banned users also cannot edit their profile or content. Nobody restricts a superadmin or themselves.

## Functions and triggers

Functions:
- `handle_new_user()`: creates the profile on sign-up. `generate_username()`, `default_display_name()`, `is_reserved_username()` build and check handles.
- `is_moderator()`, `is_superadmin()`, `is_restricted(uid, kind)`: policy helpers.
- `set_user_role()`: the only way to change a role; the last superadmin cannot be demoted.
- `review_moderator_application(id, decision)`: decides and promotes.
- `mark_thread_verified(id)`: sets `last_verified_at`; a non-moderator edit of title or body clears it.
- `restrict_user(target, kind, reason, duration)`, `lift_restriction(id)`: all mutes and bans.
- `delete_own_account()`: deletes the auth user; cascades as described above.
- `mark_all_notifications_read()`, `notification_muted(recipient, type)`.
- `mentioned_user_ids(body)`: first 10 distinct `@handle`s; max 10 mention notifications per thread or comment over its lifetime.
- `top_helpers(since)`: top 10 by points, public.
- `search_threads_v2`, `browse_threads`, `browse_threads_count`: see Search and ranking.

Triggers (one line each):
- Counters: comment inserts/hides/deletes update `threads.comment_count`; vote triggers update `score` and write `reputation_events`; best-answer changes award points.
- Activity: new comments and approval bump `last_activity_at`.
- Guards: protected-column guards on profiles, threads and comments; vote guards; one-reply-level rule; username rules.
- Revisions: edits write `thread_revisions`; reviewing stamps who and when.
- Decisions: reports, update requests and feedback record who handled them and when.
- Follows: threads and comments auto-follow for their author.
- Notifications: `security definer` triggers per event (see below); a before-insert trigger drops muted types.
- Moderation log: `log_moderation()` triggers record moderator actions only (not seeds, cascades or members' own edits).
- Limits: `*_rate_limit`, `comments_link_limit`, `restrictions_block_writes`.

Limits (moderators and the service role are exempt from rate and link limits):
- Comments 5 per minute and 100 per day; threads 10 per day; reports 10 per hour; new votes 30 per minute per kind; feedback 5 per hour. Messages start with `rate limit: `.
- Comments with a link need an account at least a day old with 3 comments.

## Notifications

Types: `reply`, `mention`, `thread_comment`, `followed_thread_activity`, `thread_approved`, `thread_rejected`, `best_answer`, `application_approved`, `application_rejected`, `announcement`, `account_muted`, `account_banned`, `account_unrestricted`, and moderator queue types `mod_new_thread`, `mod_new_application`, `mod_new_report`, `mod_new_update_request`, `mod_new_feedback`.

- Only `security definer` triggers insert; the actor is never notified; nothing is sent about content the recipient cannot read.
- A comment sends at most one notification per recipient: reply beats mention beats thread_comment beats followed_thread_activity (muted types fall through to the next).
- Hiding a comment deletes its notifications. Moderator queue items go to every moderator and superadmin except the actor. Announcements go to every other user.
- `notifications` is in the `supabase_realtime` publication; RLS decides what each subscriber receives. Index `(recipient_id, read_at, created_at desc)` serves the bell.
- Email copies are not sent; `email_frequency` is stored only.

## Search and ranking

- `search_threads_v2(q, category, city, has_best_answer, verified, sort)`: full text (`websearch_to_tsquery('english')`) over threads and visible comments, published and archived only; when fewer than 5 hits, trigram matches (`word_similarity >= 0.4`) follow. Sorts: relevance, newest, top, hot. `q` is limited to 100 characters (22001). `search_threads(q)` is the older relevance-only version.
- `browse_threads(sort, period, category, city, q, limit, offset)` and `browse_threads_count(...)`: published threads, run as the caller. `period` week/month/year/all filters by `created_at`; `limit` clamped to 1-100; `city` matches that city, `both` and not city-specific.
- Sorts: `new` = created_at; `top` = score x 2 + comment_count; `active` = last_activity_at; `hot` = (score + 2 x comment_count + 3 x answered + 1) / (hours since last activity + 2)^1.5, computed per row (fine at this size). Pinned threads are not lifted in the list; category pages show them separately.
- Verified means checked within the last 6 months.

## Migration rules

- Every database change is a new file `supabase/migrations/<timestamp>_<name>.sql`. Never edit a merged migration; write a new one.
- Every new table needs RLS enabled, policies, a case in `supabase/tests/rls.test.ts` and a row in the matrix above.
- A new enum value cannot be used in the transaction that adds it.
- `npm run test:db` replays all migrations in PGlite and checks RLS and triggers (it cannot prove hosted-Supabase grants such as the one `delete_own_account()` needs).
- Applying to the live project and seeds: [deployment.md](deployment.md).
