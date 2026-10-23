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
  `mod_new_application`, `mod_new_report`, `announcement`, `mod_new_update_request`,
  `followed_thread_activity`, `account_muted`, `account_banned`, `account_unrestricted`
- `update_request_status`: `open`, `resolved`, `dismissed`
- `restriction_kind`: `mute`, `ban`
- `moderation_action`: `thread_approved`, `thread_rejected`, `thread_archived`, `thread_unarchived`,
  `thread_pinned`, `thread_unpinned`, `thread_outdated`, `thread_verified`, `comment_hidden`,
  `comment_unhidden`, `best_answer_set`, `best_answer_unset`, `report_resolved`, `report_dismissed`,
  `update_request_resolved`, `update_request_dismissed`, `application_approved`,
  `application_rejected`, `role_changed`, `category_created`, `category_updated`, `category_deleted`,
  `announcement_created`, `announcement_deleted`, `guide_created`, `guide_deleted`,
  `revision_reviewed`, `user_muted`, `user_banned`, `user_unrestricted`

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
| reputation | int | default 0; cached sum of `reputation_events.points`, not client-writable |
| best_answer_count | int | default 0; cached number of current best answers, not client-writable |
| created_at | timestamptz | |
| announcements_seen_at | timestamptz null | default `now()`; when the member last opened `/announcements`, own row only; announcements newer than this are unseen |

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
| last_verified_at | timestamptz null | set by `mark_thread_verified()`: "Verified Oct 2026" badge; cleared with `verified_by` when a non-moderator changes title or body |
| verified_by | uuid null → profiles | moderator who verified last; set null on account deletion |
| created_at | timestamptz | |
| search | tsvector generated | title (weight A) + body (weight B), English config |

Trigram index `threads_title_trgm_idx` (`pg_trgm`, schema `extensions`) on `title` for typo-tolerant search.
`mark_thread_verified(thread_id)` (moderators/superadmin): sets `last_verified_at = now()`,
`verified_by = caller`; errors `only moderators can verify threads` (42501), `thread not found`
(P0002). A title or body edit by the author (any non-moderator) resets `last_verified_at` and
`verified_by` to null, since the edit goes live unreviewed; moderator edits keep the badge.
Threads unverified for more than 6 months get a soft "may be outdated" hint in the UI
(not the `is_outdated` flag).

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
| reviewed_at / reviewed_by | timestamptz null / uuid null → profiles | set null on account deletion |

Moderators review edits after the fact: `/mod/edits` and the "Recent edits" badge list every
revision with `reviewed_at` null, at any age. Moderators and superadmins may only update
`reviewed_at` (column grant plus a moderators-only update policy); a trigger stamps `now()` and
`reviewed_by = auth.uid()` when it is set and clears both when it is cleared. Members and anon
cannot review.

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
| score | int | default 0; sum of `comment_votes.value`, kept by triggers; not client-writable |
| created_at | timestamptz | |
| search | tsvector generated | |

Replies render under their parent; the UI pre-fills the `@handle` of the person replied to.
A hidden parent keeps its replies, which stay visible under the normal rules. Best answer can
be any comment, reply or not.

### comment_votes
Up/down votes on comments ("▲ score ▼"). Comments only; threads have no votes. Scores are
public through `comments.score`; who voted is readable only by the voter. Votes notify nobody.

| column | type | notes |
|---|---|---|
| comment_id | bigint → comments | cascade; PK with `user_id` (one vote per user per comment) |
| user_id | uuid → profiles | default `auth.uid()`; cascade, so account deletion takes the votes out of the scores |
| value | smallint | `-1` or `1` |
| created_at | timestamptz | |

Index `(user_id)`. Clients upsert on `(comment_id, user_id)` to vote or change a vote and delete
the row to withdraw it. Only visible comments on published threads take votes; archived
threads are read-only, so their votes can neither be cast, changed nor withdrawn. Insert/update
policies enforce the rules; a guard trigger reports them first with:
- `you cannot vote on your own comment` (42501)
- `voting is only possible on visible comments of published threads` (42501)
- `a vote cannot be moved to another comment` (42501; `update (comment_id)` is granted only
  because an upsert repeats the conflict key)

`comments.score` changes only through the vote triggers (`the score of a comment changes only
through votes`, 42501, even if a column grant were widened).

### update_requests
"This needs an update" flags from members; moderators work through them in `/mod`.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| thread_id | bigint → threads | cascade; must be `published` |
| requester_id | uuid null → profiles | default `auth.uid()`; set null on account deletion |
| note | text null | ≤ 300 chars |
| status | update_request_status | default `open`; moderators change it |
| resolved_by / resolved_at | uuid null / timestamptz null | set by trigger on a status change; cleared on reopen |
| created_at | timestamptz | |

One open request per member per thread (`update_requests_one_open_per_thread_idx`), at most 5
open per member (moderators included). Errors from the insert trigger:
- `updates can only be requested for published threads` (42501)
- `you already asked for an update of this thread` (23505)
- `you already have 5 open update requests` (P0001)

### bookmarks / thread_follows
Private to their owner. Same shape: `user_id` (default `auth.uid()`, → profiles cascade),
`thread_id` (→ threads cascade), `created_at`, PK `(user_id, thread_id)`. Only threads the person
can read can be saved or followed. `/saved` lists bookmarks.

Authors follow their thread on insert and commenters the thread they comment on (`on conflict do
nothing`; commenting again after unfollowing follows again). Existing authors and commenters were
backfilled. Unfollow = delete the row.

### notification_preferences
One optional row per user (no row = everything on).

| column | type | notes |
|---|---|---|
| user_id | uuid PK → profiles | default `auth.uid()`; cascade |
| muted_types | notification_type[] | default `{}`; in-app notifications of these types are not created |
| email_frequency | text | `off` (default), `instant`, `daily`; stored only, emails need custom SMTP |
| updated_at | timestamptz | bumped by trigger |

Clients upsert on `user_id`. `notification_muted(recipient, type)` is the central check: a
`before insert` trigger on `notifications` drops muted rows for every notify trigger, and the
per-comment dedupe picks the highest-priority type the recipient has not muted.

### guides / guide_steps / guide_progress
Moderator-curated checklists ("Arriving in Erlangen").

`guides`: id identity, `slug` unique (`^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 80), `title` 4–120,
`summary` ≤ 300 (default `''`), `is_featured` (home page), `sort_order`, `created_by` (default
`auth.uid()`, set null on deletion), `created_at`, `updated_at` (bumped by any guide or step edit).

`guide_steps`: id identity, `guide_id` → guides cascade, `position` int (unique per guide, so
reorder through a temporary position), `title` 2–120, `body` markdown ≤ 5000 null, `thread_id` →
threads null (set null when the thread is deleted).

`guide_progress`: `user_id` (default `auth.uid()`, cascade), `step_id` → guide_steps cascade,
`completed_at` default now(); PK `(user_id, step_id)`. Tick = insert (`on conflict do nothing`
for repeats), untick = delete. Signed-out progress lives in local storage.

### reputation_events
Append-only points ledger written only by triggers; private: no client grants or policies, since
its rows would reveal who wrote hidden comments and who received each downvote.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| user_id | uuid → profiles | cascade; who earned (or lost) the points |
| points | int | |
| reason | text | `upvote`, `downvote`, `best_answer` |
| comment_id | bigint null → comments | cascade: deleting a comment takes its points with it |
| created_at | timestamptz | |

Received upvote +1, downvote −1, best answer +15, always to the comment's author; never from a
vote on one's own comment. Changing or withdrawing a vote and unsetting or switching a best
answer append the opposite points with the same reason, so sums over any period stay right.
`profiles.reputation` / `best_answer_count` follow every ledger insert and delete (cascades
included); a guard rejects client writes (`reputation changes only through votes and best
answers`, 42501). Votes and best answers from before the ledger were backfilled.
`top_helpers(since)` (anon too, `security definer`) returns the 10 users with the highest positive point total since
`since`: `user_id, username, display_name, points`.

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
`delete_own_account()` (authenticated only) deletes the caller's `auth.users` row. The profile,
moderator applications, comment votes (scores and the voted authors' reputation drop accordingly), bookmarks, follows, notification preferences, guide progress and the user's own reputation events cascade; threads, comments, revisions and reports stay with the
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
| restriction_id | bigint null → user_restrictions | cascade; set for `account_*` notices |
| created_at | timestamptz | |
| read_at | timestamptz null | the only client-writable column |

Index `(recipient_id, read_at, created_at desc)` serves the bell count and the list.
`mark_all_notifications_read()` marks the caller's unread rows.

When they fire (the actor is never notified; nothing is sent about content the recipient
cannot read, so pending threads and hidden comments notify nobody but moderators):

| event | recipients → type |
|---|---|
| visible comment on a published thread | parent comment's author → `reply`, mentioned users → `mention`, thread author → `thread_comment`, followers → `followed_thread_activity`; one per recipient, reply beats mention beats thread_comment beats followed_thread_activity (muted types are skipped, so the next one applies) |
| comment edited | newly mentioned users not yet notified about that comment → `mention` (max 10 mentions per comment in total) |
| comment hidden | its `reply` / `mention` / `thread_comment` / `followed_thread_activity` notifications are deleted |
| new pending thread | every moderator and superadmin → `mod_new_thread` |
| thread pending/rejected → published | author → `thread_approved`; users mentioned in the body → `mention` (as from the author) |
| published thread body edited | users mentioned for the first time on this thread → `mention` (max 10 mentions per thread in total) |
| thread → rejected | author → `thread_rejected` |
| best answer set | comment author → `best_answer`; followers except the comment author and the actor → `followed_thread_activity` |
| new update request | every moderator and superadmin → `mod_new_update_request` (thread_id) |
| new moderator application | every moderator and superadmin → `mod_new_application` |
| application approved / rejected | applicant → `application_approved` / `application_rejected` |
| new report | every moderator and superadmin → `mod_new_report` (thread_id and comment_id of the target) |
| new announcement | every other user → `announcement` (announcement_id); deleting the announcement deletes them |
| account muted / banned / restriction lifted | the member → `account_muted` / `account_banned` / `account_unrestricted` (restriction_id) |

Delivery: bell with unread count in the header + `/notifications` page (mark one/all read).
`notifications` is in the `supabase_realtime` publication; subscribe with `postgres_changes`
filtered by `recipient_id`. Realtime checks the select policy per subscriber, so RLS decides
which rows each one receives.

### Planned next
- Public profile page `/u/[username]` (name, badge, published threads).
- Email copies of notifications once custom SMTP exists (`notification_preferences.email_frequency`
  is already stored).

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
| vote on visible comments of published threads, not their own; change/withdraw own vote | | ✓ | ✓ | ✓ |
| read comment scores | ✓ | ✓ | ✓ | ✓ |
| read who voted | | own votes | own votes | own votes |
| read own notifications, set `read_at`, `mark_all_notifications_read()` | | ✓ | ✓ | ✓ |
| read announcements | ✓ | ✓ | ✓ | ✓ |
| post, edit, pin and delete announcements | | | ✓ | ✓ |
| `mark_thread_verified()` | | | ✓ | ✓ |
| request an update of a published thread | | ✓ (one open per thread, max 5 open) | ✓ | ✓ |
| read update requests | | own | all | all |
| resolve/dismiss update requests | | | ✓ | ✓ |
| bookmark / follow threads they can read; read and delete own | | ✓ | ✓ | ✓ |
| read and write own notification preferences | | ✓ | ✓ | ✓ |
| read guides and steps | ✓ | ✓ | ✓ | ✓ |
| create, edit and delete guides and steps | | | ✓ | ✓ |
| tick/untick own guide progress; read own progress | | ✓ | ✓ | ✓ |
| read reputation (profiles, `top_helpers()`) | ✓ | ✓ | ✓ | ✓ |
| read `reputation_events` | | | | |
| mute members (`restrict_user()`), lift mutes | | | ✓ | ✓ |
| ban, lift bans, restrict moderators | | | | ✓ |
| read restrictions | | own | all | all |
| read the moderation log | | | ✓ | ✓ |
| read and edit canned replies | | | ✓ | ✓ |

Status, review, pin and role columns are never writable by authors directly; moderation goes
through `security definer` functions or moderator-only policies, and a trigger rejects
member updates to protected columns. Moderators hide comments but cannot change their body.

## Restrictions

`user_restrictions`: history of mutes and bans.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| user_id | uuid → profiles | cascade |
| kind | restriction_kind | `mute` or `ban` |
| reason | text | 1–500 chars, required; shown to the member |
| expires_at | timestamptz null | null = permanent |
| created_by | uuid null → profiles | set null on account deletion |
| created_at | timestamptz | |
| lifted_at / lifted_by | timestamptz null / uuid null → profiles | set by `lift_restriction()` |

Active = not lifted and (`expires_at` null or in the future); `is_restricted(uid, kind)` checks one
kind. Rows from before the history (the old single "restricted" flag) became permanent mutes.
No client writes: `restrict_user(target, kind, reason, duration interval null)` and
`lift_restriction(restriction_id)`. Moderators read all rows, members their own.

Who may: moderators mute members; only a superadmin bans, lifts a ban, or restricts/lifts on a
moderator; nobody restricts a superadmin or themselves. One active restriction per kind
(`this user is already muted|banned`, P0001). Other errors: `only moderators can restrict accounts`,
`only the superadmin can ban accounts`, `you cannot restrict yourself`, `the superadmin cannot be
restricted`, `only the superadmin can restrict moderators`, `only the superadmin can lift a ban`
(42501), `a reason is required`, `this restriction was already lifted`, `this restriction has already
ended` (P0001), `the duration must be positive` (22023).

Enforcement (`restrictions_block_writes()`, before-insert/update triggers, client roles only):
muted or banned users cannot insert threads, comments, reports, update requests, comment votes or
moderator applications; banned users also cannot change their profile's display name, affiliation
or username, their threads' title/body/category/city or their comments' body. Reading, bookmarks,
follows, notifications and withdrawing votes stay allowed. The error (P0001) is worded for the
member: `your account is muted until 31 Oct 2026, 14:00: <reason>`, `your account is muted:
<reason>` (permanent), `your account is banned[ until …]: <reason>` (Berlin time; a ban wins).
UI: `/mod/users` and `/mod/signups` (restrict, badges, lift), "Mute author…" in thread and comment
menus, a banner on the comment form, `/new` and the edit page.

## Moderation log

`moderation_log`: append-only, written only by `security definer` triggers (`log_moderation()`)
when the signed-in actor is a moderator; seed scripts, cascades and members' own edits are not
logged. Moderators and superadmins read it on `/mod/log`; no client grants beyond select.

| column | type | notes |
|---|---|---|
| id | bigint identity PK | |
| actor_id | uuid null → profiles | set null on account deletion |
| action | moderation_action | |
| thread_id / comment_id | bigint null | set null when the target is deleted |
| target_user_id | uuid null → profiles | the member affected (author, applicant, restricted user) |
| reason | text null | rejection reason, restriction reason |
| details | jsonb null | `title` of the thread/announcement/guide, category `name`, role `from`/`to`, `outdated`, restriction `kind`/`expires_at`, ids |
| created_at | timestamptz | |

Sources: thread status/pin/outdated/verification/best-answer changes, comment hide/unhide, report
and update-request decisions, application reviews (the promotion that comes with an approval is
not logged twice), role changes, category create/update/delete, announcement and guide create/delete,
revision reviews, restrictions and lifts.

## Canned replies

`canned_replies (id, label 1–60, body 1–1000, sort_order)`: rejection reasons moderators pick in
the reject dialogs (thread menu and `/mod/threads`) and can still edit before sending. Moderators
read and write them on `/mod/replies`; members and anon cannot read them. Five are seeded.

## Link limits

`comments_link_limit` rejects comments (inserts and body edits) that contain a link unless the
account is at least a day old and has written 3 comments, hidden ones included
(`my_comment_count()` bypasses RLS to count them). Moderators and the service role are exempt.
Threads are not covered: moderators review them before anyone sees them. A link is a scheme
(`http://`, `https://`), `www.` or a markdown `](`; bare domains are not detected.

## Search
`search_threads(q text)` uses `websearch_to_tsquery('english', q)` over thread `search` and
visible comment `search`, returns published + archived threads ranked by `ts_rank`
(threads matched in the title rank first). Unchanged for existing callers.

`search_threads_v2(q, p_category_id, p_city, p_has_best_answer, p_verified, p_sort)` (anon too,
runs as the caller) adds filters and sorts, published + archived only:
- full-text matches as above; when they are fewer than 5, titles with `word_similarity ≥ 0.4`
  (pg_trgm, `extensions` schema) join after them, so "anmledung" finds Anmeldung
- empty `q` lists every thread matching the filters; `q` longer than 100 characters raises
  `search is limited to 100 characters` (22001), matching `SEARCH_QUERY_MAX` in the UI
- `p_city`: that city or `both` (`both` = only `both`); `p_has_best_answer`: best_comment_id set
  or not; `p_verified`: verified within the last 6 months or not
- `p_sort`: `relevance` (default; full text, title first, then fuzzy), `newest` (created_at),
  `top` (visible comment count); ties by last activity

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
