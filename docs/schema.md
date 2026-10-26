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
- `moderation_action`: thread_approved/rejected/archived/unarchived/pinned/unpinned/outdated/verified/deleted, comment_hidden/unhidden, best_answer_set/unset, report_resolved/dismissed, update_request_resolved/dismissed, application_approved/rejected, role_changed, category_created/updated/deleted, announcement_created/deleted, guide_created/deleted, revision_reviewed, user_muted/banned/unrestricted

## Tables

Account deletion sets author columns to null ("Deleted user") on content tables; per-user rows cascade.

| table | key columns and purpose |
|---|---|
| `profiles` | `id` = auth user id; `display_name` 2-40; `username` unique @handle 3-20 `[a-z0-9_]`, stored lowercase, generated from the name, reserved words (admin, moderator, support, ...) rejected; `affiliation` badge; `role` (only via `set_user_role()`); `reputation`, `best_answer_count` (cached, trigger-written); `announcements_seen_at` |
| `categories` | `slug`, `name`, `description`, `sort_order`. Seeded: RP & Visa, Courses, Accommodation, Jobs, First Steps, Other |
| `threads` | `slug` (stable after edits), `title` 8-150, `body` markdown, `category_id`, `city` (null = not city-specific), `author_id`, `status` (default pending; moderator/superadmin threads insert as published), `is_outdated`, `is_pinned`, `best_comment_id`, `rejection_reason`, `reviewed_by/at`, `edited_at`, `last_activity_at`, `comment_count` and `score` (trigger-written), `last_verified_at`/`verified_by`, `search` tsvector (title A, body B), trigram index on title |
| `thread_images` | gallery under a thread, at most 3, shown in the order added (`order by id`): `thread_id`, `owner_id` (uploader; null after account deletion), `storage_key` unique `threads/<uuid v4>.webp\|jpg` in the media bucket, `content_type` webp/jpeg matching the key, `width`/`height` 1-1600, `size_bytes` <= 1 MB, `alt_text` 1-200 (trimmed, empty = null), `created_at`. Immutable: replace = delete + insert |
| `media_deletions` | queue of deleted images' files for the nightly cleanup: `storage_key` (primary key), `size_bytes`, `owner_id` (null after account deletion), `uploaded_at` (the image's `created_at`), `queued_at`. Written by a trigger on every `thread_images` delete; a queued key cannot be added to a gallery again. No client access |
| `thread_revisions` | previous title/body kept when the author edits a published/archived thread; adding or removing its images also writes one, with the current title/body and `image_keys` = the gallery before the change (keys in display order; null on text edits); `reviewed_at/by` set by moderators from `/mod/edits` |
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
| `notifications` | `recipient_id`, `actor_id`, `type`, optional `thread_id`, `comment_id`, `announcement_id`, `restriction_id`, `feedback_id`, `details` jsonb (what a notice needs once its target is gone), `read_at` (the only client-writable column) |
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
| edit thread title/body | | own | own | own |
| move a thread to another category or city | | own | any | any |
| read thread images (whoever can read the thread) | x | x | x | x |
| add/remove thread images (not on archived threads; no updates) | | own thread | own thread | own thread |
| comment and reply on published, non-archived threads | | x | x | x |
| edit own comment (not once hidden); nobody edits others' | | x | x | x |
| approve/reject/archive/outdate/pin threads, best answer, hide comments, `mark_thread_verified()` | | | x | x |
| delete a thread with a reason (`delete_thread()`; not while muted or banned) | | | x | x |
| vote (not own content); change or withdraw own vote | | x | x | x |
| report (max 10 open); read own reports | | x | x | x |
| read all reports; resolve/dismiss reports and update requests | | | x | x |
| request an update; read own requests | | x | x | x |
| apply to become moderator | | x | | |
| review applications | | | x | x |
| create/rename categories | | | x | x |
| delete categories; change roles (not to make a muted or banned member a moderator) | | | | x |
| post, edit, pin, delete announcements; manage guides and steps | | | x | x |
| bookmarks, follows, preferences, guide progress, own notifications | | x | x | x |
| change own username; delete own account (not the last superadmin) | | x | x | x |
| mute members, lift mutes | | | x | x |
| ban members, lift bans | | | | x |
| mute or ban a moderator or superadmin | | | | |
| read own restrictions / all restrictions | | own | all | all |
| read the moderation log; read and edit canned replies | | | x | x |
| send feedback (5 per hour) | | x | x | x |
| read, mark handled, delete feedback | | | x | x |
| read `reputation_events` | | | | |
| read or write `media_deletions` (triggers and the nightly cleanup as postgres only) | | | | |

Status, review, pin and role columns are never writable by authors directly; moderation goes through `security definer` functions or moderator-only policies, and triggers reject member updates to protected columns. Moderators never change what someone else wrote: they hide comments, and on another member's thread they change status, flags and category or city, but not its title, body or images (42501 `only the author can change a thread's title and text`); a thread that cannot stay is deleted whole. Anyone muted or banned cannot insert threads, thread images, comments, reports, update requests, votes or applications, or delete threads; banned users also cannot edit their profile or content, or remove thread images. Nobody restricts themselves, and moderators and superadmins are never muted or banned (42501 `moderators cannot be muted or banned; remove the moderator role first`): someone who should not moderate loses the role instead. A muted or banned member cannot become a moderator, neither through `set_user_role()` nor an approved application (P0001 `lift the mute or ban before making this member a moderator`). A mute or ban a moderator received before this rule stays until it ends or the superadmin lifts it, and still blocks their posts and thread deletions.

## Functions and triggers

Functions:
- `handle_new_user()`: creates the profile on sign-up. `generate_username()`, `default_display_name()`, `is_reserved_username()` build and check handles.
- `is_moderator()`, `is_superadmin()`, `is_restricted(uid, kind)`: policy helpers.
- `set_user_role()`: the only way to change a role; the last superadmin cannot be demoted; a muted or banned member cannot be promoted.
- `review_moderator_application(id, decision)`: decides and promotes.
- `mark_thread_verified(id)`: sets `last_verified_at`; a non-moderator edit of title or body, or adding or removing images of a published/archived thread, clears it.
- `restrict_user(target, kind, reason, duration)`, `lift_restriction(id)`: all mutes and bans; members only.
- `delete_own_account()`: deletes the auth user; cascades as described above.
- `mark_all_notifications_read()`, `notification_muted(recipient, type)`.
- `mentioned_user_ids(body)`: first 10 distinct `@handle`s; max 10 mention notifications per thread or comment over its lifetime.
- `top_helpers(since)`: top 10 by points, public.
- `search_threads_v2`, `browse_threads`, `browse_threads_count`: see Search and ranking.
- `check_image_upload(thread_id, count, bytes, removed_ids default '{}')`: raises what adding that many images would raise; the server calls it before uploading files. Images of the thread listed in `removed_ids` (replaced right after the check) do not count toward its 3, but still count toward the daily limits and storage. Thread null = a new thread: only the image limits (3 per thread, daily, storage); `create_thread_with_images()` runs the thread's own checks and the server deletes the uploaded files when it fails.
- `create_thread_with_images(title, body, category_id, city, images jsonb)`: inserts the thread like the client does, then its images in array order, in one transaction; returns the slug. Signed-in users only. Items: `{storage_key, content_type, width, height, size_bytes, alt_text}`.
- `delete_thread(thread_id, reason)`: moderators and superadmins only (42501), not while muted or banned (P0001, the restriction message); reason 1-1000 characters after trimming (P0001); missing thread P0002. Logs `thread_deleted` (title in `details`, author as target, reason), notifies the author (`thread_deleted`, see Notifications), deletes the thread and returns its images' `storage_key`s in gallery order so the server can remove the files at once; the cascade also queues them in `media_deletions`. Clients have no other way to delete a thread.

Triggers (one line each):
- Counters: comment inserts/hides/deletes update `threads.comment_count`; vote triggers update `score` and write `reputation_events`; best-answer changes award points.
- Activity: new comments and approval bump `last_activity_at`.
- Guards: protected-column guards on profiles, threads and comments (only the author changes a thread's title and body or a comment's body); vote guards; one-reply-level rule; username rules; `profiles_refuse_restricted_promotion` (no moderator or superadmin role while a mute or ban is active).
- Revisions: edits write `thread_revisions`; reviewing stamps who and when. `thread_images_record_revision` writes one revision per published/archived thread and statement that adds or removes images, sets `edited_at` and, for non-moderators, clears the verification; none for pending/rejected threads, a thread created in the same transaction, or a thread being deleted.
- Image cleanup: `thread_images_queue_deletion` queues every deleted image row in `media_deletions` (client delete, cascade, `delete_thread()`, service role); `thread_images_reject_queued_keys` refuses a queued key (23505 `a deleted image cannot be added again`).
- Decisions: reports, update requests and feedback record who handled them and when.
- Follows: threads and comments auto-follow for their author.
- Notifications: `security definer` triggers per event (see below); a before-insert trigger drops muted types.
- Moderation log: `log_moderation()` triggers record moderator actions only (not seeds, cascades or members' own edits); `delete_thread()` writes `thread_deleted`.
- Limits: `*_rate_limit`, `comments_link_limit`, `restrictions_block_writes`, `thread_images_before_insert` (who, archived, 3 per thread) and `thread_images_enforce_limits` (daily and storage limits, once per statement).

Limits (moderators and the service role are exempt from rate and link limits):
- Comments 5 per minute and 100 per day; threads 10 per day; reports 10 per hour; new votes 30 per minute per kind; feedback 5 per hour. Messages start with `rate limit: `.
- Comments with a link need an account at least a day old with 3 comments.
- Thread images, counted over images uploaded in the last 24 hours, live rows plus `media_deletions` rows by `uploaded_at` and original owner (deleting and uploading again does not reset a limit): 6 per member (moderators exempt) and 300 site-wide (only the service role exempt). The sum of `size_bytes` over live and queued images stays <= 8,000,000,000 for everyone (the free 10 GB bucket is shared with backups), so deleted images free storage only once the nightly cleanup has removed their files. One advisory lock serialises image inserts. Messages: `a thread can have at most 3 images`, `rate limit: You can add up to 6 images a day. ...`, `rate limit: The forum has reached its daily limit for new images. ...`, `image storage is full`.

## Deleting a thread

`delete_thread()` removes the thread and, through the foreign keys, everything that only exists for it: comments and replies, thread and comment votes, images (the rows; their files are queued in `media_deletions`, and the server also deletes them at once), bookmarks, follows, revisions, reports on the thread or its comments, update requests and notifications about it (the author's `thread_deleted` notice has no `thread_id` and stays). The reputation events of its votes and best answer cascade too, so the points the thread earned are taken back and `profiles.reputation` and `best_answer_count` follow the ledger. Guide steps keep their own title and text without the link (`thread_id` set null). Moderation log entries stay with `thread_id` and `comment_id` set null; they keep the title they copied.

## Notifications

Types: `reply`, `mention`, `thread_comment`, `followed_thread_activity`, `thread_approved`, `thread_rejected`, `best_answer`, `application_approved`, `application_rejected`, `announcement`, `account_muted`, `account_banned`, `account_unrestricted`, `thread_deleted`, and moderator queue types `mod_new_thread`, `mod_new_application`, `mod_new_report`, `mod_new_update_request`, `mod_new_feedback`.

- Only `security definer` triggers and functions insert; the actor is never notified; nothing is sent about content the recipient cannot read.
- `thread_deleted` goes to the author when a moderator or the superadmin deletes their thread (not when they delete their own, not to a deleted account). The thread is gone, so `thread_id` is null and `details` is `{title, reason}`; `actor_id` is the moderator.
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
