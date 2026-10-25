# Testing

Read before adding tests or touching CI.

**Policy:** write thorough Vitest unit tests for new and changed logic and components (pure
helpers, formatting, ranking/sorting, validation, error mapping, client component behaviour); CI
runs them with `npm run test:db`, so keep both green. End-to-end (Playwright) is paused: don't add
or update e2e specs. The `e2e` CI job runs only from a manual `workflow_dispatch` (Actions → CI →
Run workflow), for example once before launch.

| Command | What | Needs |
|---|---|---|
| `npm test` | Vitest unit and component tests (`src/**/*.test.{ts,tsx}`), jsdom, no network | nothing |
| `npm run test:db` | RLS and trigger tests on PGlite | nothing |
| `npm run test:e2e` | Playwright, desktop and 390px mobile | a Supabase test project |

## Unit tests

Colocate `name.test.ts(x)` next to the code. Mock server actions and `next/navigation`; keep logic
that needs server-only modules in a pure file so it can be imported (see `comment-groups.ts`).

## End-to-end

Password sign-in exists only for tests: `tests/e2e/global-setup.ts` creates a seeded member,
moderator and superadmin through the Supabase admin API and stores a signed-in browser state per
role. Without the variables below the signed-in specs skip and only the public specs run.

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
E2E_SUPABASE_SERVICE_ROLE_KEY=...   # test project only, never a production key
```

Run against a local stack (`supabase start` applies `supabase/migrations`) or a dedicated test
project. Never point it at production: the setup creates users and the specs insert data.

Locally, `npm run test:e2e` reuses the dev server you already have running.

One spec per area (`account`, `posting`, `moderation`, `discussion`, `saved`, `reports`,
`announcements`, `guides`, `edits`, `account-deletion`, `share`, `public`, `mobile`).
`tests/e2e/fixtures.ts` provides:

- `newUser(role)` + `pageAs(browser, user)`: a fresh signed-in user in its own context, so
  notification counts and per-user limits never leak between tests; contexts close after each test.
- `seedThread`, `seedComment`, `seedReport`, `seedAnnouncement`, `seedGuide`: arrange data through
  the service role; `unreadNotifications(userId, type)` asserts what was delivered.
- Titles carry `uid()` so the shared database never confuses one test's rows with another's.

Things that bite: clicks and keystrokes before hydration are lost (wait for something only the
hydrated page renders, or retry the action inside `expect(...).toPass()`); visited routes stay
mounted but hidden, so match text with `.filter({ visible: true })` after client navigation;
fuzzy search matches similar `uid()`s, so assert on your own title.

`mobile.spec.ts` checks for horizontal overflow at 390px under the desktop project (`npm run test:e2e` itself also has a 390px mobile project).

## CI

`.github/workflows/ci.yml`, job `checks` on every PR and push to `main`: lint, typecheck, `npm test`,
`npm run test:db`, build.

Job `e2e` (manual only): builds against a throwaway `supabase start` stack, runs the desktop
Playwright project (about 3 minutes) and uploads the report, traces and screenshots on failure.
