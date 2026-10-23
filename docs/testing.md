# Testing

Read before adding tests or touching CI.

| Command | What | Needs |
|---|---|---|
| `npm test` | Vitest unit and component tests (`src/**/*.test.{ts,tsx}`), jsdom, no network | nothing |
| `npm run test:db` | RLS and trigger tests on PGlite | nothing |
| `npm run test:e2e` | Playwright, desktop and 390px mobile | a Supabase test project |

## Unit tests

Colocate `name.test.ts(x)` next to the code. Mock server actions and `next/navigation`; keep logic
that needs server-only modules in a pure file so it can be imported (see `comment-groups.ts`).

## End-to-end

Password sign-in exists only for tests: `tests/e2e/global-setup.ts` creates a seeded member and
moderator through the Supabase admin API and stores a signed-in browser state per role. Without
the variables below the signed-in specs skip and only the public specs run.

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
E2E_SUPABASE_SERVICE_ROLE_KEY=...   # test project only, never a production key
```

Run against a local stack (`supabase start` applies `supabase/migrations`) or a dedicated test
project. Never point it at production: the setup creates users and the specs insert data.

Locally, `npm run test:e2e` reuses the dev server you already have running.

## CI

`.github/workflows/ci.yml` runs on every PR: lint, typecheck, `npm test`, `npm run test:db`, build,
then a small desktop-only e2e run (sign-in, comment, vote, public pages) against a throwaway `supabase start` stack. Failures upload the Playwright report, traces,
screenshots and videos.

## Not done yet

The live @mention bell and moderator pages (dropped to keep CI fast), thread posting and approval, reply scoping, reporting and resolving, account deletion, and a
Lighthouse CI budget for the home and thread pages.
