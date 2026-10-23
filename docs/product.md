# Product rules

Agreed with the owner. Read before building any user-facing feature.

- English only.
- Anyone can read without an account. Commenting (and later voice notes) requires sign-in.
- Sign-in: email magic link + Google. Any email address; no `@fau.de` restriction, no identity verification.
- Any signed-in user can submit a thread; it only becomes public after a moderator approves it.
- Any signed-in user can apply to become a moderator; moderators or the superadmin approve/reject.
- Moderators manage threads (e.g. archive, mark outdated). The owner is the single superadmin.
- Shared thread links must render rich previews in WhatsApp, so thread pages are server-rendered
  with per-thread `generateMetadata` (OpenGraph).
- Voice notes are postponed. When added: record in the browser with MediaRecorder, pick a
  supported mimeType (Safari/iOS records `audio/mp4`, not WebM), cap the length, store in Cloudflare R2.

The database schema is not decided yet: design it together with the owner before writing migrations.
Authorization belongs in Postgres Row Level Security, not only in the UI.
