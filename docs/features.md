# Features

What the PSA FAU Community Forum does. Live site: https://fau-psa-forum.vercel.app. Launch plan: [launch.md](launch.md). Rules: [product.md](product.md).

## Reading & discovery
- Home is a landing page: hero, start-here guides, topics, popular questions, how it works, the latest pinned announcement and a community strip.
- `/browse` lists all threads with tabs Hot, New, Top (week, month, year, all time) and Active; filter by category and city, search inside the results, paginate.
- Hot ranks by votes, comments, a best answer and recent activity (formula in [schema.md](schema.md)).
- Category pages with a city filter (Erlangen, Nuremberg, both), sort tabs, search and a block of pinned threads. RP & Visa shows a "not legal advice" note.
- Thread pages: formatted text, up to 3 images in a gallery under it (tap for full size), best answer pinned on top, comments with one level of replies, votes on the thread.
- Thread banners and badges: Waiting for review, Rejected (with reason; deleted after 7 days unless approved), Outdated, Archived, Verified (month and year).
- Authors delete their own pending or rejected threads from the thread menu.
- Guides: step-by-step checklists (for example "First weeks in Erlangen") with progress saved per member and in the browser when signed out.
- Announcements: list with search and pagination, a page per announcement, a home banner for the latest pinned one, unread count on the header icon.
- About and Contributors pages (code contributors, moderator team, top helpers this month).
- Branded 404 and error pages, mobile menu.

## Search
- Full results page on Enter: sort by Relevance, Hot, Top or New; filters for category, city, has a best answer, verified; pagination.
- Typo tolerance ("anmledung" finds Anmeldung).
- Quick search with Ctrl/Cmd+K shows results while typing.

## Posting & discussion
- Ask form with title, category, city, markdown text and preview; similar existing threads appear while typing the title. Up to 3 images, shrunk in the browser before upload; the author adds or removes them when editing.
- Members' threads wait for moderator approval (at most 3 waiting); moderators' and superadmins' own threads publish at once.
- Comments and one level of replies; replying to a reply mentions that person.
- `@username` mentions with a picker.
- Up and down votes on threads and comments; comments sort by Top or Newest.
- Edit your own threads and comments; every thread edit is kept in a history.
- Report threads and comments (spam, offensive, wrong information, personal data, other).
- Request an update on a thread that looks old.
- Bookmark and follow threads; both listed on Saved.
- Share button (native share sheet on phones); shared links show a preview image in WhatsApp.
- Feedback button in the account menu, read by moderators in a feedback inbox.

## Notifications
- Bell with a live unread count (no reload) and a notifications page with pagination.
- Types: replies, mentions, comments on your thread, activity on followed threads, thread approved, rejected or deleted, best answer, moderator application decided, announcements, account muted, banned or restored.
- Per-type switches in notification settings.

## Accounts & profiles
- Sign in with Google or an email link; any email address.
- Welcome step on first sign-in (display name and username).
- Profile: display name, unique @username, optional badge (Student, Graduate, Postgrad, Resident).
- Public profile at `/u/<username>` with reputation and a Top helper badge.
- My threads with search, status filter and rejection reasons.
- Apply to become a moderator.
- Download all your data; delete your account (posts stay as "Deleted user").

## Moderation
- Queues with counts: pending threads (with possible duplicates), reports, update requests, recent edits, feedback, moderator applications.
- Thread actions: approve or reject with a reason, pin, mark outdated, verify, archive, move to another category or city, delete with a reason, choose best answer, hide comments. Moderators never change what other members wrote.
- Ready-made rejection reasons that can be edited before sending.
- Manage categories, announcements and guides; superadmins also manage user roles.
- Mute a user for 1, 7 or 30 days or permanently; ban (superadmin only). Moderators can't be muted or banned, only removed from the role. Muted users can read but not post, vote or report, and see the reason and end date.
- Recent sign-ups list for spotting spam accounts.
- Moderation log of every moderator action, filterable.
- "View as member" preview.

## Content
- 8 verified starter threads and 2 guides, already loaded (see [content/README.md](content/README.md)).
- A pinned welcome announcement.

## Design & accessibility
- Light and dark theme (follows the system, with a toggle).
- Phone-friendly from 360px; full keyboard use, `?` lists the shortcuts.
- Subtle animations that switch off with "reduce motion".
- English only. Details in [design.md](design.md).

## Privacy & security
- Permissions enforced in the database (Row Level Security), not only in the UI.
- Rate limits on posting, voting, reporting and feedback; link limits for new accounts.
- Safe markdown (no raw HTML), redirect protection, security headers.
- Data stays in the UK and EU (database and website in London, backups in Amsterdam); only email and display name are stored.
- Impressum and privacy policy pages (operator details still to fill in).

## Quality
- Vitest unit tests and PGlite database tests run on every pull request with lint, type check and build.
- Playwright browser tests run by hand ([testing.md](testing.md)).
- A scheduled job keeps the free database awake.
