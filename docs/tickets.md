# Writing tickets

How we write and run tickets for the PSA FAU Community Forum. Read before opening an issue.
Board: https://github.com/users/PeinZero/projects/1

## When to open a ticket

- **Open one** for work that won't be done today, needs a decision, or someone else will pick up.
- **Don't** for a fix you are about to make yourself: just open the PR and describe it there.
- Search open and closed issues first; comment on an existing one instead of duplicating it.

## Title

One line that names the outcome, not the activity. Start with a verb, sentence case, no period.

| Good | Not like this |
|---|---|
| Move the forum to its own domain | Domain stuff |
| Show unread feedback count to moderators | Feedback bug?? |
| Make threads findable on Google | SEO |

Bugs describe what is wrong: "Notification bell only updates after a page refresh".

## Body

Use the issue templates (New issue → Feature, Bug or Chore). Every ticket answers:

1. **Why** — who is affected and what gets better. One or two sentences.
2. **Scope** — what will be done, concretely (pages, files, settings). Numbered steps when order matters.
3. **Out of scope** — what this ticket deliberately does not do, so it stays small.
4. **Acceptance criteria** — checkboxes anyone can verify on the live site or in the code.
5. **Dependencies** — other tickets that block or are blocked by this one (`#19`).
6. **Definition of done** — usually: merged, deployed, checked live, board moved to Done.

Bugs add **Steps to reproduce**, **Expected**, **Actual**, device/browser, and a screenshot if visual.

Keep it plain English. Link files with their path (`src/lib/legal.ts`). Never paste passwords, keys,
`.env` contents or real people's personal data into a ticket; use placeholders.

## Size it right

- A ticket should fit in one PR and take at most a few days. If not, make an **epic** (label `epic`)
  with sub-issues.
- Too small for a ticket ("fix a typo")? Just do it in a PR.

## Board fields

| Field | Values | Meaning |
|---|---|---|
| Status | Backlog, Todo, In progress, In review, Done | Backlog = maybe later; Todo = agreed and next |
| Priority | P0, P1, P2 | P0 blocks users or launch, P1 needed soon, P2 nice to have |
| Size | S, M, L | S < half a day, M ≈ 1–2 days, L > 2 days (consider splitting) |
| Item type | Epic, Feature, Bug, Chore, Docs | |
| Sprint | 2-week iterations | Only for Todo / In progress items |

Labels describe the area: `launch`, `infra`, `design`, `moderation`, `search`, `notifications`,
`quality`, `docs`, `communities`, `good first issue` (small, well described, no deep context needed).

## Lifecycle

1. New tickets land in **Backlog**. Moving to **Todo** means we agreed to do it.
2. Assign yourself and move it to **In progress** when you start. One person per ticket.
3. Open a PR that says `Closes #<number>` (or `Part of #<number>` for partial work).
4. **Done means merged.** The ticket moves to Done when its PR is merged and deployed, not when the
   code is written. If a database migration is involved, run `npx supabase db push` right after
   merging (see CONTRIBUTING.md).
5. Not needed anymore? Close it with one sentence explaining why, or delete it if it was noise.
