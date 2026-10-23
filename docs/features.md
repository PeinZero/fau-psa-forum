# Feature list

Status as of 2026-10-25. **Live** = merged and deployed on https://fau-psa-forum.vercel.app. Ticket numbers refer to
https://github.com/PeinZero/fau-psa-forum/issues and the board at https://github.com/users/PeinZero/projects/1.

## Reading and discovery
| Feature | Status |
|---|---|
| Public reading without an account | Live |
| Home: hero, category cards with icons and thread counts, latest threads (pinned first) | Live |
| Category pages with Erlangen / Nuremberg / both filter (general threads show in both) | Live |
| Thread page: breadcrumbs, markdown body, best answer pinned on top, outdated / archived / pending / rejected banners, "edited" marker | Live |
| Announcements page, home banner for the latest pinned announcement (dismissable) | Live |
| Unread badge on the announcements icon (and in the account menu on phones) | Live |
| Guides: step-by-step checklists (e.g. arriving in Erlangen) with progress, featured on the home page (#36) | Live |
| "Verified Oct 2026" badge and "not verified in over 6 months" hint on threads (#33) | Live |
| About and Contributors pages (GitHub contributors live, moderators, how to contribute) | Live |
| "Top helpers this month" on Contributors (#38) | Live |

## Search
| Feature | Status |
|---|---|
| Full-text search page across titles, bodies and comments | Live |
| ⌘K / Ctrl K command palette: live results while typing (partial words), recent threads, quick actions | Live |
| Filters (category, city, has best answer, verified), sort (relevance / newest / top), typo tolerance, highlighted snippets (#37) | Live |
| "Search in <category>" from the palette (#37) | Live |
| Similar-threads suggestions while writing a new thread, possible duplicates in the moderator queue (#32) | Live |

## Posting and discussion
| Feature | Status |
|---|---|
| Submit a thread (title, category, city, markdown with preview); moderator approval; max 3 waiting per member | Live |
| Edit own threads (moderators can edit any); every edit kept in history | Live |
| Comments with markdown, edit own comments | Live |
| One level of replies; replying to a reply pre-fills `@handle` | Live |
| @mentions with a person picker while typing | Live |
| Upvotes / downvotes on comments, Top / Newest sorting, best answer stays pinned | Live |
| "⋯" menus for thread and comment actions (Edit, Copy link, Report, moderation) | Live |
| Report a thread or comment (reasons + note) | Live |
| Bookmarks and following threads, `/saved` page (#34) | Live |
| "Request an update" for stale information (#33) | Live |

## Notifications
| Feature | Status |
|---|---|
| Bell with unread count that updates live (Realtime) and `/notifications` page | Live |
| Replies, mentions, comments on your thread, moderation results, best answer, mod queue, announcements | Live |
| Activity on threads you follow, update requests for moderators (#33, #34) | Live |
| Notification settings: mute any type, email preference stored (#35) | Live |
| Email delivery | Not built: needs custom SMTP (#17) |

## Accounts and profiles
| Feature | Status |
|---|---|
| Sign in with Google or email magic link, any email address | Live |
| Clear sign-in error messages | Live |
| Profile: display name, unique @handle, optional badge (Student / Graduate / Postgrad / Resident) | Live |
| Public profile pages `/u/username` | Live |
| Reputation and "Top helper" badge on profiles (#38) | Live |
| My threads with status and rejection reason | Live |
| Apply to become a moderator | Live |
| Delete account (content stays as "Deleted user") | Live |

## Moderation (`/mod`)
| Feature | Status |
|---|---|
| Overview with counts; sidebar on desktop, tabs on phones | Live |
| Pending queue: approve / reject with reason | Live |
| Recently edited threads with before / after | Live |
| Reports queue: resolve, dismiss, hide comment, archive thread | Live |
| Moderator applications; categories; user roles (superadmin only) | Live |
| Announcements editor (write, preview, pin, delete) | Live |
| Thread actions: approve, pin, mark outdated, archive, best answer, hide comment | Live |
| "View as member" switch for moderators | Live |
| Update-requests queue and "Mark as still accurate" (#33) | Live |
| Guides editor (#36) | Live |
| Possible duplicates shown on pending threads (#32) | Live |

## Design and experience
| Feature | Status |
|---|---|
| Linear-style design system (docs/design.md), light / dark following the system with a toggle | Live |
| Subtle animations and page transitions, all off with "reduce motion" | Live |
| Mobile-first (tested at 360–390px), keyboard accessible, AA contrast | Live |
| WhatsApp / social preview images for the site, categories and threads | Live |

## Security, privacy and quality
| Feature | Status |
|---|---|
| All permissions enforced in Postgres row level security, 219 policy tests in PGlite | Live |
| Safe redirects, safe markdown (no raw HTML, scripted links stripped), security headers, sign-out protection | Live |
| EU hosting (Supabase eu-west, Vercel), minimal personal data | Live |
| Open source (MIT), protected `main`, PR previews | Live |

## Not built yet (board)
| Item | Owner |
|---|---|
| Communities and sub-communities, epic #4 (#5–#14), decisions pending | Mahad |
| Notification emails / digest (#35 email part, #21), custom SMTP (#17) | Abdul (#17, #21) |
| Impressum and privacy policy (#18), custom domain (#19) | Abdul |
| Voice notes (#20), support-us page (#26) | Abdul |
| README + CONTRIBUTING (#22), good first issues (#23–#25) | Abdul |
| Test suite: Vitest + Playwright e2e in CI (#41) | Abdul |
| Keep database awake (#45), SEO sitemap / robots (#46), Sentry (#47), data export (#48) | Abdul |
| Moderation audit log, mute / ban (#39), PWA + push (#40), anti-spam (#42), analytics (#43) | Backlog |
| Database backups | No ticket yet |
