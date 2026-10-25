# Product rules

Decisions agreed with the owner. Read before any user-facing feature. What exists: [features.md](features.md). Data rules: [schema.md](schema.md).

## Naming
- Product name: "PSA FAU Community Forum". Organisation: "Pakistan Student Association". Never "FAU PSA Forum" or "PSA Forum".
- The city is always "Nuremberg", never "Nürnberg" or "Nuernberg". The university keeps its official name "FAU Erlangen-Nürnberg".
- English only.
- Independent student project, not affiliated with FAU. The footer and the About page carry this disclaimer.
- Founders: Mahad Khalid Tarar (GitHub PeinZero, Founder) and Abdul Moeez (GitHub abdulmoeez1225, Co-founder). Both are superadmins.

## Roles
- Anyone can read without an account; everything else needs sign-in (Google or email link, any address, no `@fau.de` restriction, no identity verification).
- Member: posts, comments, votes, reports, bookmarks, follows; can apply to become a moderator.
- Moderator: approves threads, curates content, hides comments, creates categories, posts announcements and guides, reviews applications, mutes members.
- Superadmin: also changes roles, deletes categories, bans. The last superadmin cannot be demoted or delete their account.
- Affiliation badge (student, graduate, postgrad, resident) is self-chosen and unverified.

## Posting and approval
- A member's thread is public only after a moderator approves it; rejections carry a reason. Moderators' and superadmins' own threads publish at once with no pending cap.
- Threads have a category and an optional city (Erlangen, Nuremberg, both).
- Authors may edit after approval; edits go live and show in the moderators' edit review. Moderators may edit any thread's title, body, category and city to keep it current; non-author edits are kept as revisions. Moderators hide comments but never rewrite them, and a hidden comment can no longer be edited by its author.
- Outdated: banner, thread stays open. Archived: read-only, hidden from lists, still linkable. One best answer per thread, chosen by a moderator, always pinned above the comment sort.
- Verified: moderators mark a thread still accurate; members can request an update; threads unverified for 6+ months get a soft hint.
- Votes: one per user, never on own content; scores are public, voters private; no vote notifications. Reputation: +1 upvote, -1 downvote, +15 best answer.
- Mutes and bans are visible to the member with reason and end date.
- Account deletion keeps threads and comments as "Deleted user".

## Other decisions
- Announcements are written by moderators in markdown; everyone is notified; the newest pinned one shows as a dismissible home banner.
- Shared thread links must render rich previews in WhatsApp, so thread pages are server-rendered with per-thread metadata.
- Voice notes are postponed. When built: browser MediaRecorder with a supported mimeType (Safari/iOS records `audio/mp4`), stored like images (Backblaze B2 behind the Cloudflare media Worker).
- Communities and sub-communities (other groups or universities) are on hold.
