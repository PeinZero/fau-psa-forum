# Launch plan

Everything about getting from today to a public launch. What the product does: [features.md](features.md). Board: https://github.com/users/PeinZero/projects/1

**Scale assumption: 1,000 to 1,500 users at most.** Free plans are enough. Anything that only matters at a bigger scale is left out on purpose. Prices are rough and from the providers' public pages (checked October 2026); check them before paying. This is general information, not legal advice.

## What is missing before a public launch

| Missing | Why | Issue |
|---|---|---|
| Operator name and address for the Impressum and privacy policy | German law. The pages exist but show placeholders (`src/lib/legal.ts`). Contact: psa.community.forum@gmail.com | #18 |
| Database backups | The free Supabase plan has none. The nightly workflow is built; the owner still has to create the Backblaze bucket, key and secrets ([deployment.md](deployment.md#backups)) | #69 |
| Own domain | Trust, and a stable link in WhatsApp | #19 |
| Bot protection on email sign-in (Cloudflare Turnstile) | Stops fake sign-ups and sign-in email abuse | #74 |
| Error monitoring (Sentry, EU, no personal data) | Otherwise we only hear about breakage from users | #47 |

Not blocking the launch, do soon after: Google findability, sitemap and robots (#46); images in threads (#72), stored in Backblaze B2 behind a Cloudflare Worker (#71).

## Launch steps

1. **Friends-and-family round** on the vercel.app address. Invite a small group. Ask them to sign in, ask or answer a real question, and report anything confusing with the in-app "Send feedback" button. Moderators read it at `/mod/feedback`.
2. **Fix** the important problems from the feedback. Run the Playwright suite once by hand ([testing.md](testing.md)).
3. **Finish the must-do list** above (Impressum details, backups, domain, Turnstile, Sentry).
4. **Grow the content** from 8 to about 20 threads. Missing topics: bank account, SIM and contracts, first week at FAU, course choices, halal shops and mosques, doctors, taxes for working students, extending the permit after graduation.
5. **Find 4 to 6 moderators**: a mix of students, graduates and residents.
6. **Public launch**: post in the PSA WhatsApp groups and pin it.

## Every week after launch

- Moderators clear the queues: pending threads, reports, update requests, recent edits, feedback.
- When someone asks in WhatsApp something that already has a thread, reply with the link. This is the most important growth habit.
- Write 1 or 2 new threads for questions that came up more than once.

## Running costs

### Today: 0 EUR

| Service | Plan | Limit that matters |
|---|---|---|
| Vercel (website) | Hobby, free | Personal, non-commercial use only; about 100 GB traffic per month |
| Supabase (database, sign-in) | Free | 500 MB database, 50,000 monthly users, 5 GB traffic; pauses after 7 quiet days (our keep-awake job prevents that); no backups (our nightly dump covers that) |
| GitHub (code, CI, board) | Free | none for us |
| Gmail SMTP (sign-in emails) | Free | about 500 emails per day |

At 1,500 users the free plans cover traffic and storage: 500 MB holds tens of thousands of threads.

### What we add

| Item | Cost | When |
|---|---|---|
| Domain (.de or .com) | about 10 EUR per year | Before public launch |
| Sentry free plan | 0 | Before public launch |
| Cloudflare Turnstile | 0 | Before public launch |
| Backups | 0 with our own nightly dump (#69), or Supabase Pro 25 USD per month | Before public launch |
| Backblaze B2 (backups and images) | 0 up to 10 GB stored in total; no payment card on the account, so it cannot bill | Backups before public launch, images when built |
| Cloudflare Worker for images | 0 up to 100,000 requests a day; no card | When images are built |

### What would push us to a paid plan

- **Supabase Pro (25 USD per month):** when losing a day of data is not acceptable, or the database nears 400 MB. A nightly dump to private storage is the free route and enough for a friends-and-community forum.
- **Resend (free plan, 3,000 emails per month):** only if we add email notifications and Gmail's daily limit starts to block sign-in emails. Roughly when more than 300 people want emails on the same day.
- **Vercel Pro (20 USD per month):** only if the site becomes commercial (sponsors, ads) or traffic passes the free limit. Neither is expected at 1,500 users.
- **Backblaze pay-as-you-go:** only if images near the 8 GB upload stop (#72). Add a card and set Backblaze's daily spending caps first, so storage still cannot run up a bill.

### Budget options for year one

| Option | What | Per year |
|---|---|---|
| A. Minimum (recommended) | Free plans, domain, own nightly backup | about 10 EUR |
| B. Safer | A plus Supabase Pro (managed daily backups, no pausing) | about 300 EUR |

Start with A. Move to B if people come to depend on the forum or a restore test from our own dump fails.

## Funding

**No money goes to a student personally.** Regular collection by a student for a project they run can count as self-employment, which most student residence permits do not allow, and it can create tax duties. No personal donation links or sponsor pages.

Routes, best first:
1. **PSA pays the small costs.** The domain is about 10 EUR per year; ask the PSA board to cover it.
2. **FAU student representation (StuVe)** for option B, if it is ever needed.
3. **Free credits** for students and open source (GitHub Student Developer Pack, open-source programmes of Vercel, Supabase and Sentry). Terms change, so check them.

## Legal checklist (Germany)

- **Impressum:** name and postal address of whoever runs the site (#18). The decided operator is a named maintainer as a private person; PSA as an association would be better if it agrees.
- **Privacy policy:** what we store (email, display name, posts), where (Supabase London, Vercel London, Gmail for sign-in emails, Cloudflare for the sign-in bot check, Backblaze Amsterdam for backups), how long, how to delete it. Update it whenever a service changes (domain registrar, Backblaze, the Cloudflare image Worker, Sentry).
- **Delete account and download data:** done.
- **Illegal content:** remove it quickly once reported (report button, moderators).

## Risks

| Risk | What we do |
|---|---|
| Empty forum at launch | Starter content loaded; write about 12 more threads first |
| Moderators lose interest | 4 to 6 moderators, weekly routine, thank them on the Contributors page |
| Data lost | Backups before public launch |
| Fake sign-ups or email abuse | Turnstile, rate limits, approval queue, mute and ban |
| Wrong or outdated advice | Verified badge, "Request an update", Outdated banner; the official office is always the final source |
| One person holds all access | Both founders can log in everywhere (GitHub, Vercel, Supabase, domain, email) |

## Roles

| Role | Who | Tasks |
|---|---|---|
| Founder, superadmin | Mahad Khalid Tarar | Product, roles, final decisions, service accounts |
| Co-founder, superadmin | Abdul Moeez | Board, tests, launch tasks |
| Moderators | 4 to 6 volunteers | Approve threads, handle reports and update requests, write threads |
| Contributors | Any PSA member | Code, threads, feedback |

## Success metrics (check monthly)

- Active members, new threads and comments per week.
- Threads with a best answer (goal: above 60%).
- Time to approval (goal: under 24 hours).

## Open decisions

1. Who is named on the Impressum: PSA or a person (#18)?
2. Budget option A or B?
3. Who pays the domain: PSA board or StuVe?
4. Launch dates for the friends-and-family round and the public launch.
