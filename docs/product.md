# Product rules

Agreed with the owner. Read before building any user-facing feature.

- English only.
- The forum is an independent student project, not affiliated with FAU; the site footer and the About page carry this disclaimer. The city is always spelled "Nuremberg"; the university keeps its official name "FAU Erlangen-Nürnberg".
- Anyone can read without an account. Commenting (and later voice notes) requires sign-in.
- Sign-in: email magic link + Google. Any email address; no `@fau.de` restriction, no identity verification.
- Any signed-in user can submit a thread; it only becomes public after a moderator approves it.
  Moderators' and superadmins' own threads are published immediately (no review, no pending cap).
- Any signed-in user can apply to become a moderator; moderators or superadmins approve/reject.
- Moderators manage threads: approve/reject, mark outdated (banner, still open), archive (read-only,
  hidden from lists, still linkable), pin, pick one best answer, hide comments, create categories.
  The founders (owner and abdulmoeez1225) are superadmins; only superadmins change roles, and the last superadmin cannot be demoted.
- Threads carry a category and an optional city (Erlangen / Nuremberg / both).
- Authors can edit their threads after approval; edits go live and appear on the moderator dashboard.
- Moderators may edit any thread's title, body, category and city to keep information current;
  every edit by someone other than the author is kept as a revision. Moderators hide comments but
  never rewrite them; a hidden comment can no longer be edited by its author.
- Approving a thread moves it to the top of the lists, like new activity.
- Users may pick an unverified affiliation badge (student / graduate / postgrad / resident).
- Moderators post announcements (markdown, optionally pinned) on `/announcements`; everyone is
  notified and the newest pinned one shows as a dismissible banner on the home page.
- Signed-in users can report a public thread or comment (reason + optional note); moderators
  resolve or dismiss reports.
- Signed-in users upvote or downvote comments and threads, one vote each, never their own.
  Scores are public, who voted is private, votes send no notifications. Archived threads and
  hidden comments take no votes. Comments sort by Top (score, default) or Newest; the best
  answer stays pinned above both.
- Users can delete their account; their threads and comments stay, shown as "Deleted user".
- Shared thread links must render rich previews in WhatsApp, so thread pages are server-rendered
  with per-thread `generateMetadata` (OpenGraph).
- Voice notes are postponed. When added: record in the browser with MediaRecorder, pick a
  supported mimeType (Safari/iOS records `audio/mp4`, not WebM), cap the length, store in Cloudflare R2.

The schema is agreed in [schema.md](schema.md); change it only with the owner.
Authorization belongs in Postgres Row Level Security, not only in the UI.

## Replies, handles, mentions, notifications (database built, UI in progress; see schema.md)

- One level of replies on comments; replying to a reply attaches to the top-level comment.
- Every user has a unique @handle, generated from their name and editable in /account.
  Public profile pages `/u/[username]` are planned.
- `@handle` mentions in threads and comments notify the mentioned user once the content is public.
- Notifications for replies, mentions, comments on your thread, moderation results and the
  moderator queue (new threads, applications, reports): in-app bell with live updates now,
  email later.

## Wave 4 (database built, UI in progress; see schema.md)

- Verified date: moderators mark a thread "still accurate" (badge "Verified Oct 2026"); members flag "needs an update" with a short note (one open per thread, max 5 open), handled in a `/mod` queue; threads unverified for 6+ months show a soft hint.
- Bookmarks on `/saved` and thread follows: authors and commenters follow automatically, followers get notified about new comments and best answers, unfollow anytime.
- Notification preferences on `/account/notifications`: mute in-app types and choose an email frequency (stored now, emails once SMTP exists).
- Guides: moderator-curated step-by-step checklists linking threads; members tick steps off privately (local storage when signed out); featured guides on the home page.
- Advanced search: filters (category, city, best answer, verified), sort by relevance/newest/top, typo tolerance.
- Reputation: +1 per received upvote, −1 per downvote (comments and threads), +15 per best answer, never from self-votes; shown on profiles and as monthly Top helpers.

## Launch UI (database built; see schema.md)

- Thread lists sort by Hot (default), New, Top (week / month / year / all) or Active, paged 20 at a time; rows show score, comment count and an Answered mark. Pinned threads are shown in their own block on category pages, not lifted in the sorted list.
