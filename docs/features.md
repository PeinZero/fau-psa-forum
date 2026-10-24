# FAU PSA Forum: features, launch plan, costs and funding

Last updated: 24 October 2026 (late)

- Live site: https://fau-psa-forum.vercel.app
- Code: https://github.com/PeinZero/fau-psa-forum (open source, MIT licence)
- Status: a side project, heading into a friends-and-family feedback round
- Task board: https://github.com/users/PeinZero/projects/1
- Team: Mahad (superadmin, product) and Abdul Moeez (developer, project admin)

---

## 1. What this is

A question-and-answer forum for Pakistani students, graduates and residents around FAU
Erlangen-Nürnberg. People ask the questions that keep coming up in the WhatsApp groups
(residence permit, Anmeldung, courses, housing, jobs, first steps), and the answers stay
findable instead of disappearing in chat history.

Anyone can read without an account. You sign in to post. Moderators approve every new
thread from members (their own threads publish immediately), so the content stays clean.

---

## 2. What is built and live today

### Reading and finding things
- Home page is the front door: announcements, "Hot this week", "New", compact category
  cards and a link to the guides.
- Browse page (/browse) lists all threads with tabs: Hot, New, Top (week, month, year, all
  time) and Active. Filter by category and city, search inside the results, and page through.
- "Hot" ranks threads by votes, comments, a best answer and how recent the activity is. The
  formula: hot = (score + 2 × comments + 3 × answered + 1) / (hours since activity + 2)^1.5.
- Category pages with a city filter (Erlangen, Nuremberg, or both; threads that are not about
  one city show in both), search inside the category, sort tabs and a block of pinned
  threads. RP & Visa shows a "not legal advice" note.
- Thread pages: formatted text, the best answer pinned on top, comments and replies, and
  ▲/▼ votes on the thread itself.
- Banners on threads: "Waiting for review", "Rejected" (with the reason), "Marked as
  outdated", "Archived". A "Verified Oct 2026" badge when a moderator confirmed the thread
  is still correct.
- Search: press Enter in the search box to get a full results page (sort by Relevance, Hot,
  Top or New; filters for category, city, has a best answer, verified; pagination). Small
  typos still find results ("hallal" finds "halal").
- Quick search with ⌘K (Ctrl K on Windows): results appear while you type. Enter opens an
  item only when you selected one; otherwise it goes to the full results page.
- Guides: step-by-step checklists, for example "Arriving in Erlangen". You tick steps off
  and your progress is saved.
- Announcements: a list with search, excerpts and pagination, a detail page for each
  announcement, a banner on the home page for the latest pinned one, and an unread count on
  the announcements icon.
- About page and Contributors page (code contributors from GitHub, the moderator team, and
  "top helpers this month").
- Real error pages with the forum's look instead of a plain browser error. A mobile menu
  (hamburger) on phones.

### Writing and discussing
- "Ask a question" form with title, category, city and formatted text (with preview). While
  you type the title, similar existing threads are shown so people find answers instead of
  asking again.
- Threads from members wait for a moderator. Threads from moderators and superadmins are
  published immediately.
- Each member can have at most 3 threads waiting for approval.
- Comments and one level of replies. Replying to a reply mentions that person.
- Tag people with @username. Typing @ shows a list of people to pick from.
- Upvotes and downvotes on threads and comments. Sort comments by Top or Newest.
- Edit your own threads and comments. Every edit of a thread is saved in a history.
- Report a thread or comment (spam, offensive, wrong information, personal data, other).
- "Request an update" on a thread whose information looks old.
- Bookmark threads and follow threads. Both are listed on the Saved page.
- Share button on threads (on phones it opens the normal share menu, so WhatsApp is one
  tap away).
- Send feedback from the account menu. Moderators read it in a feedback inbox (/mod/feedback).

### Notifications
- Bell with an unread count that updates live, without reloading the page.
- You get notified for: replies, mentions, comments on your thread, activity on threads you
  follow, your thread approved or rejected, your answer chosen as best answer, your
  moderator application decided, and new announcements.
- Notification settings: switch off any type you don't want. The notifications list has
  pagination.
- Email notifications are NOT sent yet (see section 4).

### Accounts and profiles
- Sign in with Google or with a link sent to your email. Any email address works. The
  sign-in link screen explains clearly what to do next.
- A short welcome step the first time you sign in (choose your name and username).
- Profile: display name, unique @username, optional badge (Student, Graduate, Postgrad,
  Resident).
- Public profile page with reputation points and a "Top helper" badge (10+ best answers).
- "My threads" (/me/threads) with search, a status filter, rejection reasons and pagination.
- Account menu with grouped entries (profile, my threads, saved, settings, feedback, sign out).
- Apply to become a moderator.
- Download all your data as one file (what the forum stores about you).
- Delete your account. Your posts stay visible as "Deleted user".

### Moderation
- Moderation area with counts for everything waiting.
- Pending threads (approve, or reject with a reason; possible duplicates are shown).
- Reports (resolve, dismiss, hide the comment, archive the thread).
- Update requests (resolve, dismiss, mark the thread as still accurate).
- Recent edits as a review queue (mark reviewed, mark all reviewed).
- Feedback inbox for what members send through the feedback button.
- Moderator applications, categories, announcements, guides, and user roles (superadmin
  only).
- On threads: approve, pin, mark outdated, archive, choose the best answer, hide comments.
- "View as member" to see a page the way normal members see it.
- Moderation log: every moderator action is recorded and can be filtered.
- Ready-made rejection reasons that moderators can pick and edit.
- Mute a user (1, 7 or 30 days, or permanently) or ban them (superadmin only). A muted
  user can read but cannot post, comment, vote or report, and sees the reason and end date.
- Recent sign-ups list to spot spam accounts early.

### Design and quality
- Clean, modern design in light and dark mode (follows your phone or laptop setting, with
  a toggle).
- Works on phones (tested at 360–390 pixels wide) and with the keyboard; press ? to see all
  keyboard shortcuts.
- Smooth, subtle animations that switch off for people who turn on "reduce motion".
- Link previews with an image when a thread is shared on WhatsApp.
- The website runs in London, next to the database, so pages respond fast.
- The name is spelled "Nuremberg" everywhere; the umlaut stays only in "FAU Erlangen-Nürnberg".

### Safety and privacy
- All permissions are enforced inside the database, not only in the website. 324 automated
  database tests check them.
- On every pull request, GitHub Actions runs lint, the type check, the database tests and
  the build.
- Unit tests (Vitest) and browser tests (Playwright) are paused until the user acceptance
  test (UAT), to keep changes fast. They come back for UAT.
- Anti-spam: rate limits on posting, and link limits for new accounts.
- The free database is kept awake by a scheduled check every few days.
- Safe formatting (no scripts or raw HTML in posts), protection against redirect tricks,
  security headers.
- Data stays in the EU (database in London, website server in London).
- Minimal personal data: email and display name.

### Content and project
- 8 verified starter threads and 2 guides are written and ready to load (docs/content and
  supabase/seed), plus a script that removes the test content first.
- README and contributor guide (CONTRIBUTING) for people who want to help with the code.

---

## 3. What is not built yet

| Missing | Why it matters | Ticket | Owner |
|---|---|---|---|
| Impressum and privacy policy | Required by German law before the public launch. Pages are being added now; operator name and address are still placeholders. Contact: psa.community.forum@gmail.com | #18 | Abdul |
| Real 404 pages for unknown threads and categories | Wrong links should say "not found". Being fixed now | - | Abdul |
| Own email sending (SMTP) | Supabase's built-in email allows only about 2 sign-in emails per hour. Being set up now with a Gmail account | #17 | Abdul |
| Own domain | Looks trustworthy | #19 | postponed until public launch |
| Backups | The free database plan has no backups | no ticket yet | postponed until public launch |
| Error monitoring (Sentry) | Without it we don't know when something breaks | #47 | postponed until public launch |
| Google search (sitemap) | Threads should appear in Google | #46 | Abdul |
| Email notifications | People miss replies if they don't open the site | #35 (email part), #21 | - |
| Communities and sub-communities | So other groups (e.g. MSc AI, other universities) can use it | #4–#14 | Mahad, on hold |

The project is a side project for now. The next goal is a friends-and-family feedback round on
the vercel.app address, so the domain, backups and Sentry wait until it goes properly live.

---

## 4. Future improvements

### Before the friends-and-family round
1. Impressum and privacy pages (#18, being added).
2. Own email sending through Gmail (#17, being set up), so everyone can sign in.
3. Real 404 pages (being fixed).
4. Load the 8 starter threads and 2 guides (section 5, Step 2).

### Before the public launch
- Own domain (#19).
- Backups. The database is already kept awake.
- Error monitoring (#47).
- Fix what the feedback round finds; run the browser tests by hand once for UAT.
- Write the remaining threads from the list in section 5, and find moderators.

### Soon after launch (first 2 months)
- Email notifications and a daily digest (#35, #21).
- Google search setup (#46).
- Privacy-friendly statistics: which searches find nothing, which threads are read most
  (#43). This tells moderators which threads to write next.

### Later
- Communities and sub-communities, e.g. "FAU → MSc AI", and other universities (#4–#14).
- Voice notes on comments (#20).
- Install as an app on the phone with push notifications (#40).
- German and Urdu interface (no ticket yet).
- Image upload in threads, e.g. a screenshot of a form, with a warning about personal data
  (no ticket yet).

---

## 5. How to launch

### Step 0: Friends-and-family feedback round
Invite a small group of friends on https://fau-psa-forum.vercel.app (no own domain yet). Ask
them to sign in, ask or answer a real question, and tell us what is confusing, using the
"Send feedback" button in the account menu. Moderators read it in /mod/feedback. Fix the
important problems before going further. Load the starter content first so the site is not
empty.

### Step 1: Finish the must-do list (section 4)
Nothing outside the team and the feedback group should use the site before the Impressum,
privacy policy and email sending exist. Before the public launch, add the domain, backups and
error monitoring.

### Step 2: Write the first content (1–2 weeks)
An empty forum will not pull people away from WhatsApp. 8 starter threads and 2 guides are
already written and checked (docs/content). Before the public launch, the team and the first
moderators grow this to about 20 good threads. Suggested list:

- Residence permit (RP) process in Erlangen
- Residence permit (RP) process in Nuremberg
- Anmeldung (address registration) step by step
- Blocked account (Sperrkonto): which provider, how to release money
- Health insurance: public vs private, which one students pick
- Finding a room: dorms (Studentenwerk), WG-Gesucht, scams to avoid
- Bank account for students
- Phone SIM and contracts
- Semester ticket / Deutschlandticket
- Enrolment and the first week at FAU
- Choosing subjects in the first semester (one thread per big programme)
- Course reviews: the 5 most asked courses
- Working student (Werkstudent) jobs and the hours you are allowed to work
- Rundfunkbeitrag (TV licence fee) and how to handle the letter
- Halal food and Pakistani shops in Erlangen and Nuremberg
- Mosques and prayer rooms
- Doctors and how to get an appointment
- Taxes for students with a job
- Extending the residence permit after graduation (job search permit)
- Guide 1: "Your first two weeks in Erlangen"
- Guide 2: "Your first two weeks in Nuremberg"

### Step 3: Find moderators
4–6 moderators, ideally a mix of students, graduates and residents. Each one approves new
threads a few times a week and answers what they know.

### Step 4: Wider soft launch (2 weeks)
After Step 0, invite 20–30 more people. Ask them to post their real questions and to report
anything confusing with the feedback button. Fix the top 5 problems.

### Step 5: Public launch
Post in the PSA WhatsApp groups and pin it. Example message:

> Salam everyone! We built a forum for all the questions that come up again and again:
> RP, Anmeldung, insurance, courses, housing. Answers stay searchable and moderators keep them
> up to date. You can read without an account. Have a question? Search first, and if it's
> not there, ask it: https://<our-domain>

### Step 6: After launch, every week
- Moderators clear the queues (pending threads, reports, update requests, recent edits).
- When someone asks a question in WhatsApp that already has a thread, reply with the link.
  This is the most important growth habit.
- Write 1–2 new threads for questions that came up more than once.

---

## 6. Running costs

Prices are in US dollars from the providers' public pricing (checked October 2026). They can
change, so check the providers' pricing pages before paying. 1 USD ≈ 0.92 EUR.

### What we pay today: €0

| Service | Plan today | What the free plan includes | Limit we will hit first |
|---|---|---|---|
| Vercel (website) | Hobby, free | About 100 GB traffic and 1M requests per month | Only allowed for personal, non-commercial use |
| Supabase (database, sign-in) | Free | 500 MB database, 50,000 active users per month, 5 GB traffic | Pauses after 7 days without activity; no backups |
| GitHub (code, tests, board) | Free | Unlimited public repositories and CI minutes for public repos | — |
| Domain | none yet | — | — |

500 MB of database holds tens of thousands of threads with comments. Text is small, so
storage is not the first problem.

### What we will need to pay for

| Item | Cost | When |
|---|---|---|
| Domain (.de or .com) | about €10 per year | Before public launch |
| Email sending (Resend free plan) | €0 for 3,000 emails per month, max 100 per day | Before public launch (until then a Gmail account sends the sign-in emails) |
| Email sending (Resend Pro) | $20 per month for 50,000 emails | Only if we send more than 100 emails a day |
| Error monitoring (Sentry free plan) | €0 for 5,000 errors per month, 1 user | Before public launch |
| Database backups (Supabase Pro) | $25 per month, includes daily backups kept 7 days | As soon as real people rely on the site |
| Website (Vercel Pro) | $20 per month per developer | Only if we accept money or the site counts as commercial |
| Voice notes (Cloudflare R2) | €0 up to 10 GB | When voice notes are built |

### Three budget options for the first year

| Option | What you get | Cost per year |
|---|---|---|
| A. Minimum | Free plans + domain. Backups done by our own weekly script (to build). | about €10 |
| B. Recommended | A + Supabase Pro (real daily backups, no pausing, more room) | about €290 (€10 + 12 × ~€23) |
| C. Full | B + Vercel Pro for 1 developer + Resend Pro | about €730 |

**Recommendation:** start with A for the friends-and-family round. Move to B before the public launch, so
a mistake or attack can never wipe the forum. C is only needed if we take donations or
sponsorship through the website, or send a lot of email.

Watch out: on Vercel Pro, new projects use expensive "Turbo" build machines by default. Switch
to the standard build machine in the project settings to avoid surprise costs.

---

## 7. Funding

### Rule number one: money never goes to a student personally
If a student collects money regularly for a project they run, it can count as
self-employment. That is not allowed on most student residence permits without approval, and
it can create tax obligations. So no personal "Buy me a coffee" or personal GitHub Sponsors.

### Ways to fund it (best first)
1. **PSA pays the small costs.** The domain is about €10 per year. Ask the PSA board to cover
   it from the association's budget.
2. **FAU student representation (StuVe).** Ask whether they fund student projects that help
   many students. Bring this document, the live link and the user numbers.
3. **Open Collective with a fiscal host (for example Open Collective Europe).** Donations go to
   the host, not to a person. Every euro in and out is public. We file our bills against it.
   A "Support us" page on the site shows "€X of €Y needed for 2027" (#26).
4. **Free credits for students and open source.** Check the GitHub Student Developer Pack
   (has offered free domains and developer credits in the past) and the open-source programmes
   of Vercel, Supabase and Sentry. Offers change, so check current terms.
5. **Sponsors (only through PSA).** A Pakistani restaurant or travel agency could sponsor a
   year of hosting in exchange for a thank-you on the About page. This makes the site partly
   commercial: then we need Vercel Pro and must handle it through PSA, not a person.

### How much to ask for
Ask for the exact yearly cost of the chosen option plus 20% buffer, for example option B:
€290 + 20% ≈ €350 per year. Publish what was spent.

---

## 8. Legal checklist (Germany)

This is general information, not legal advice.

- **Impressum:** name and postal address of whoever runs the site. Best if that is PSA as an
  association, not a private person. (#18)
- **Privacy policy (Datenschutzerklärung):** list what we store (email, display name, posts),
  where (Supabase London, Vercel), how long, and how people can delete their data. (#18)
- **Delete account:** done.
- **Copy of your data (GDPR):** done ("Download my data" on the account page).
- **Illegal content:** we are not responsible for posts by users, but we must remove illegal
  content quickly once someone tells us. The report button and moderators cover this.
- **Money:** no ads or donations to private people (see section 7).

---

## 9. Risks and what we do about them

| Risk | What happens | What we do |
|---|---|---|
| Empty forum at launch | People stay on WhatsApp | Load the 8 starter threads and 2 guides, write about 12 more (section 5) |
| Moderators lose interest | Queues fill up, spam stays | 4–6 moderators, a weekly routine, thank them on the Contributors page |
| Database pauses or data is lost | Site down or content gone | Keep-awake job (live); backups before the public launch (option B) |
| Sign-in emails stop | New people can't sign in | Own email sending through Gmail (#17, being set up); Google sign-in as backup |
| Spam or abuse | Bad content, notification spam | Approval queue, reports, mute and ban (live), anti-spam rate and link limits (live) |
| Only one person knows the setup | Project stops if that person leaves | Both founders have access to GitHub, Vercel, Supabase and the domain; README and CONTRIBUTING (live) |
| Wrong or outdated information | Someone follows bad advice | Verified badge, "Request an update", "Marked as outdated", the official office is always the final source |
| Legal complaint | Stress, possible fine | Impressum and privacy policy before anyone outside the team uses the site, remove illegal content when reported |
| No error monitoring or backups yet | A problem could go unnoticed or data could be lost | Accepted for the small friends round; both are done before the public launch |

---

## 10. Who does what

| Role | People | Tasks |
|---|---|---|
| Superadmin | Mahad | Roles, final decisions, accounts (Vercel, Supabase, domain) |
| Developer and project admin | Abdul | Tickets on the board, tests, launch tasks |
| Moderators | 4–6 volunteers | Approve threads, handle reports and update requests, write threads |
| Contributors | Any PSA member | Code (good first issues), writing threads, feedback |

Make sure at least two people can log in to every service (GitHub, Vercel, Supabase, domain,
email provider). Write down where each account lives.

---

## 11. How we measure success

Check these numbers once a month:

- Active members per week.
- New threads and comments per week.
- Share of threads that have a best answer (goal: more than 60%).
- Time from submitting a thread to approval (goal: under 24 hours).
- Searches that found nothing (each one is a thread we should write) (#43).
- Questions in WhatsApp answered with a forum link instead of a long chat answer.

---

## 12. Open decisions

1. **Who runs the site officially** (name on the Impressum): PSA or a named person?
2. **Budget option** for year one: A, B or C (section 6)?
3. **Funding route:** PSA budget, StuVe, Open Collective, or a mix (section 7)?
4. **Communities:** one shared site or a separate copy per group; how deep sub-communities go;
   who can create them; whether each community has its own moderators (#5).
5. **Launch date** for the friends-and-family round and the public launch.
6. **Operator details** for the Impressum (name and address are placeholders now), same as decision 1.

---

## Sources for prices

- Supabase plans: https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/ and https://makerkit.dev/blog/saas/supabase-pricing (official: https://supabase.com/pricing)
- Vercel plans: https://makerkit.dev/blog/saas/vercel-cost and https://agentdeals.dev/vendor/vercel (official: https://vercel.com/pricing)
- Resend: https://automationatlas.io/answers/resend-free-tier-explained-2026/ (official: https://resend.com/pricing)
- Sentry: https://last9.io/blog/sentry-pricing/ (official: https://sentry.io/pricing)
