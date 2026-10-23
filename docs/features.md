# FAU PSA Forum: features, launch plan, costs and funding

Last updated: 24 October 2026

- Live site: https://fau-psa-forum.vercel.app
- Code: https://github.com/PeinZero/fau-psa-forum (open source, MIT licence)
- Task board: https://github.com/users/PeinZero/projects/1
- Team: Mahad (superadmin, product) and Abdul Moeez (developer, project admin)

---

## 1. What this is

A question-and-answer forum for Pakistani students, graduates and residents around FAU
Erlangen-Nürnberg. People ask the questions that keep coming up in the WhatsApp groups
(residence permit, Anmeldung, courses, housing, jobs, first steps), and the answers stay
findable instead of disappearing in chat history.

Anyone can read without an account. You sign in to post. Moderators approve every new
thread, so the content stays clean.

---

## 2. What is built and live today

### Reading and finding things
- Home page with category cards, latest threads (pinned ones first) and featured guides.
- Category pages with a city filter: Erlangen, Nuremberg, or both. Threads that are not
  about one city show in both.
- Thread pages: formatted text, the best answer pinned on top, comments and replies.
- Banners on threads: "Waiting for review", "Rejected" (with the reason), "Marked as
  outdated", "Archived". A "Verified Oct 2026" badge when a moderator confirmed the thread
  is still correct.
- Search page with filters (category, city, has a best answer, verified) and sorting
  (most relevant, newest, top). Small typos still find results ("hallal" finds "halal").
- Quick search with ⌘K (Ctrl K on Windows): results appear while you type.
- Guides: step-by-step checklists, for example "Arriving in Erlangen". You tick steps off
  and your progress is saved.
- Announcements page, a banner on the home page for the latest pinned announcement, and an
  unread count on the announcements icon.
- About page and Contributors page (code contributors from GitHub, the moderator team, and
  "top helpers this month").

### Writing and discussing
- Submit a thread with title, category, city and formatted text (with preview). While you
  type the title, similar existing threads are shown so people find answers instead of
  asking again.
- Each member can have at most 3 threads waiting for approval.
- Comments and one level of replies. Replying to a reply mentions that person.
- Tag people with @username. Typing @ shows a list of people to pick from.
- Upvotes and downvotes on comments. Sort comments by Top or Newest.
- Edit your own threads and comments. Every edit of a thread is saved in a history.
- Report a thread or comment (spam, offensive, wrong information, personal data, other).
- "Request an update" on a thread whose information looks old.
- Bookmark threads and follow threads. Both are listed on the Saved page.
- Share button on threads (on phones it opens the normal share menu, so WhatsApp is one
  tap away).

### Notifications
- Bell with an unread count that updates live, without reloading the page.
- You get notified for: replies, mentions, comments on your thread, activity on threads you
  follow, your thread approved or rejected, your answer chosen as best answer, your
  moderator application decided, and new announcements.
- Notification settings: switch off any type you don't want.
- Email notifications are NOT sent yet (see section 4).

### Accounts and profiles
- Sign in with Google or with a link sent to your email. Any email address works.
- Profile: display name, unique @username, optional badge (Student, Graduate, Postgrad,
  Resident).
- Public profile page with reputation points and a "Top helper" badge (10+ best answers).
- "My threads" with status and rejection reasons.
- Apply to become a moderator.
- Delete your account. Your posts stay visible as "Deleted user".

### Moderation
- Moderation area with counts for everything waiting.
- Pending threads (approve, or reject with a reason; possible duplicates are shown).
- Reports (resolve, dismiss, hide the comment, archive the thread).
- Update requests (resolve, dismiss, mark the thread as still accurate).
- Recent edits as a review queue (mark reviewed, mark all reviewed).
- Moderator applications, categories, announcements, guides, and user roles (superadmin
  only).
- On threads: approve, pin, mark outdated, archive, choose the best answer, hide comments.
- "View as member" to see a page the way normal members see it.

### Design and quality
- Clean, modern design in light and dark mode (follows your phone or laptop setting, with
  a toggle).
- Works on phones (tested at 360–390 pixels wide) and with the keyboard; press ? to see all
  keyboard shortcuts.
- Smooth, subtle animations that switch off for people who turn on "reduce motion".
- Link previews with an image when a thread is shared on WhatsApp.
- The website runs in London, next to the database, so pages respond fast.

### Safety and privacy
- All permissions are enforced inside the database, not only in the website. 236 automated
  database tests check them.
- 62 automated unit tests plus browser tests (Playwright) run on every pull request in GitHub Actions.
- Safe formatting (no scripts or raw HTML in posts), protection against redirect tricks,
  security headers.
- Data stays in the EU (database in London, website server in London).
- Minimal personal data: email and display name.

---

## 3. What is not built yet

| Missing | Why it matters | Ticket | Owner |
|---|---|---|---|
| Impressum and privacy policy | Required by German law before the public launch | #18 | Abdul |
| Own email sending (SMTP) | Supabase's built-in email allows only about 2 sign-in emails per hour | #17 | Abdul |
| Own domain | Looks trustworthy, needed for email | #19 | Abdul |
| Keep the database awake | The free database pauses after 7 days without visitors | #45 | Abdul |
| Backups | The free database plan has no backups | no ticket yet | — |
| Error monitoring (Sentry) | Without it we don't know when something breaks | #47 | Abdul |
| Google search (sitemap) | Threads should appear in Google | #46 | Abdul |
| "Download my data" | Required by GDPR on request | #48 | Abdul |
| README and contributor guide | So other students can help with the code | #22 | Abdul |
| Email notifications | People miss replies if they don't open the site | #35 (email part), #21 | — |
| Rate limits against spam | Someone could flood comments | #42 | backlog |
| Communities and sub-communities | So other groups (e.g. MSc AI, other universities) can use it | #4–#14 | Mahad, on hold |

---

## 4. Future improvements

### Must do before the public launch
1. Impressum and privacy policy (#18).
2. Own email sending (#17) and own domain (#19).
3. Keep the database awake (#45) and set up weekly backups (new ticket).
4. Error monitoring (#47).
5. Basic anti-spam limits (#42), at least for comments.
6. All browser tests green, including the signed-in flows (in progress).

### Soon after launch (first 2 months)
- Email notifications and a daily digest (#35, #21).
- "Download my data" (#48).
- Google search setup (#46).
- Moderation log, mute and ban (#39).
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

### Step 1: Finish the must-do list (section 4)
Nothing outside the team should use the site before the Impressum, privacy policy, email
sending and backups exist.

### Step 2: Write the first content (1–2 weeks)
An empty forum will not pull people away from WhatsApp. Before launch, the team and the first
moderators write about 20 good threads and 2 guides. Suggested list:

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

### Step 4: Soft launch (2 weeks)
Invite 20–30 friends. Ask them to post their real questions and to report anything
confusing. Collect feedback in one place (a GitHub issue or a short form). Fix the top 5
problems.

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
| Domain (.de or .com) | about €10 per year | Before launch |
| Email sending (Resend free plan) | €0 for 3,000 emails per month, max 100 per day | Before launch |
| Email sending (Resend Pro) | $20 per month for 50,000 emails | Only if we send more than 100 emails a day |
| Error monitoring (Sentry free plan) | €0 for 5,000 errors per month, 1 user | Before launch |
| Database backups (Supabase Pro) | $25 per month, includes daily backups kept 7 days | As soon as real people rely on the site |
| Website (Vercel Pro) | $20 per month per developer | Only if we accept money or the site counts as commercial |
| Voice notes (Cloudflare R2) | €0 up to 10 GB | When voice notes are built |

### Three budget options for the first year

| Option | What you get | Cost per year |
|---|---|---|
| A. Minimum | Free plans + domain. Backups done by our own weekly script (to build). | about €10 |
| B. Recommended | A + Supabase Pro (real daily backups, no pausing, more room) | about €290 (€10 + 12 × ~€23) |
| C. Full | B + Vercel Pro for 1 developer + Resend Pro | about €730 |

**Recommendation:** start with A for the soft launch. Move to B before the public launch, so
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
- **Copy of your data (GDPR):** to build (#48).
- **Illegal content:** we are not responsible for posts by users, but we must remove illegal
  content quickly once someone tells us. The report button and moderators cover this.
- **Money:** no ads or donations to private people (see section 7).

---

## 9. Risks and what we do about them

| Risk | What happens | What we do |
|---|---|---|
| Empty forum at launch | People stay on WhatsApp | Write 20 threads and 2 guides first (section 5) |
| Moderators lose interest | Queues fill up, spam stays | 4–6 moderators, a weekly routine, thank them on the Contributors page |
| Database pauses or data is lost | Site down or content gone | Keep-awake job (#45), backups (option B) |
| Sign-in emails stop | New people can't sign in | Own email sending (#17); Google sign-in as backup |
| Spam or abuse | Bad content, notification spam | Approval queue, reports, anti-spam limits (#42), mute and ban (#39) |
| Only one person knows the setup | Project stops if that person leaves | Both founders have access to GitHub, Vercel, Supabase and the domain; README (#22) |
| Wrong or outdated information | Someone follows bad advice | Verified badge, "Request an update", "Marked as outdated", the official office is always the final source |
| Legal complaint | Stress, possible fine | Impressum and privacy policy before launch, remove illegal content when reported |

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
5. **Launch date** for the soft launch and the public launch.

---

## Sources for prices

- Supabase plans: https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/ and https://makerkit.dev/blog/saas/supabase-pricing (official: https://supabase.com/pricing)
- Vercel plans: https://makerkit.dev/blog/saas/vercel-cost and https://agentdeals.dev/vendor/vercel (official: https://vercel.com/pricing)
- Resend: https://automationatlas.io/answers/resend-free-tier-explained-2026/ (official: https://resend.com/pricing)
- Sentry: https://last9.io/blog/sentry-pricing/ (official: https://sentry.io/pricing)
