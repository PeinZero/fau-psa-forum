# Product rules

Agreed with the owner. Read before building any user-facing feature.

- English only.
- Anyone can read without an account. Commenting (and later voice notes) requires sign-in.
- Sign-in: email magic link + Google. Any email address; no `@fau.de` restriction, no identity verification.
- Any signed-in user can submit a thread; it only becomes public after a moderator approves it.
- Any signed-in user can apply to become a moderator; moderators or the superadmin approve/reject.
- Moderators manage threads: approve/reject, mark outdated (banner, still open), archive (read-only,
  hidden from lists, still linkable), pin, pick one best answer, hide comments, create categories.
  The owner is the single superadmin and the only one who changes roles.
- Threads carry a category and an optional city (Erlangen / Nuremberg / both).
- Authors can edit their threads after approval; edits go live and appear on the moderator dashboard.
- Users may pick an unverified affiliation badge (student / graduate / postgrad / resident).
- Shared thread links must render rich previews in WhatsApp, so thread pages are server-rendered
  with per-thread `generateMetadata` (OpenGraph).
- Voice notes are postponed. When added: record in the browser with MediaRecorder, pick a
  supported mimeType (Safari/iOS records `audio/mp4`, not WebM), cap the length, store in Cloudflare R2.

The schema is agreed in [schema.md](schema.md); change it only with the owner.
Authorization belongs in Postgres Row Level Security, not only in the UI.
