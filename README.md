# PSA FAU Community Forum

A question-and-answer forum for Pakistani students, graduates and residents around FAU Erlangen-Nürnberg. People ask the questions that keep coming up in WhatsApp groups (residence permit, Anmeldung, courses, housing, jobs) and the answers stay easy to find. Anyone can read; you sign in to post; moderators approve every new thread.

Live site: https://fau-psa-forum.vercel.app

## Features

- Categories with an Erlangen / Nuremberg city filter
- Threads with formatted text, a pinned best answer, comments and replies
- Search with filters and typo tolerance, plus quick search with Ctrl/Cmd+K
- Step-by-step guides with saved progress
- Moderation: every new thread is approved, reports, "request an update", verified badges
- Live notifications and announcements
- Sign in with Google or an email magic link
- Light and dark theme, works at phone width (390px)

Full list: [docs/features.md](docs/features.md)

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) with TypeScript
- Supabase: Postgres and Auth, with Row Level Security (RLS) as the authorization layer
- Tailwind CSS v4
- Vercel for hosting (every push to `main` deploys)

## Local setup (about 10 minutes)

You need Node.js 22 and npm. Pick one path.

First, in both paths:

```sh
git clone https://github.com/PeinZero/fau-psa-forum.git
cd fau-psa-forum
cp .env.example .env.local
```

Never commit `.env.local` (it is git-ignored).

### Path A: your own free Supabase cloud project (no Docker)

1. Create a free project at https://supabase.com/dashboard. Note the project ref (the part before `.supabase.co` in the project URL).
2. In Project Settings → API, copy the Project URL and the publishable (anon) key into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. In Authentication → URL Configuration, add `http://localhost:3000/**` to Redirect URLs. Without this the magic link will not bring you back to your local site.
4. Create the database tables:

   ```sh
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

5. Install and start:

   ```sh
   npm install
   npm run dev
   ```

6. Open http://localhost:3000 and sign in once with your email (magic link). Supabase's built-in email sender allows only a few emails per hour, so if no mail arrives, wait and try again rather than clicking repeatedly.
7. Make yourself superadmin, so you can approve threads. Run this in the Supabase dashboard SQL editor:

   ```sql
   update public.profiles set role = 'superadmin'
   where id = (select id from auth.users where email = '<your email>');
   ```

Use a throwaway project for development, never the live one.

### Path B: local Supabase with Docker

You need Docker running.

1. Start the local stack. The first start downloads images and applies `supabase/migrations`:

   ```sh
   npx supabase start
   ```

2. Print the credentials:

   ```sh
   npx supabase status -o env
   ```

   Copy `API_URL` and `ANON_KEY` into `.env.local` (these are the same values CI exports):

   ```
   NEXT_PUBLIC_SUPABASE_URL=<API_URL>
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY>
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. Install and start, then open http://localhost:3000:

   ```sh
   npm install
   npm run dev
   ```

4. Sign in with your email. Local Supabase does not send real email; open the local inbox (Mailpit, http://127.0.0.1:54324) and click the link.
5. Make yourself superadmin with the SQL from Path A, run in Studio (http://127.0.0.1:54323) or with `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

Stop the stack with `npx supabase stop`.

## Scripts

| Command | What it does | Needs |
|---|---|---|
| `npm run dev` | Dev server on port 3000 | `.env.local` |
| `npm run build` | Production build | the three env names (any well-formed values work) |
| `npm run lint` | ESLint | nothing |
| `npm run typecheck` | `next typegen` and `tsc --noEmit` | nothing |
| `npm test` | Vitest unit and component tests | nothing |
| `npm run test:db` | RLS and trigger tests on PGlite (in-memory Postgres) | nothing |
| `npm run test:e2e` | Playwright browser tests, desktop and 390px mobile | local Supabase (Path B) plus `E2E_SUPABASE_SERVICE_ROLE_KEY`, see [docs/testing.md](docs/testing.md) |

## Project structure

- `src/app/`: pages and routes (App Router)
- `src/components/`: React components; `src/components/ui/` holds the shared UI primitives
- `src/lib/`: helpers, auth and Supabase clients
- `supabase/migrations/`: database schema and RLS policies
- `supabase/tests/`: PGlite tests for the database rules
- `tests/e2e/`: Playwright specs
- `docs/`: project documentation, see below
- `.github/workflows/`: CI

Docs index:

- [docs/features.md](docs/features.md): what is built, launch plan, costs
- [docs/product.md](docs/product.md): product rules and roles
- [docs/schema.md](docs/schema.md): tables, RLS matrix, migrations
- [docs/design.md](docs/design.md): design system and UI components
- [docs/security.md](docs/security.md): auth, redirects, headers, RLS rules
- [docs/testing.md](docs/testing.md): unit, db and e2e tests, CI
- [docs/deployment.md](docs/deployment.md): hosting and environment variables
- [docs/delegation.md](docs/delegation.md): how work and reviews are split

## Contributing

- Read [CONTRIBUTING.md](CONTRIBUTING.md)
- Project board: https://github.com/users/PeinZero/projects/1
- Good first issues: https://github.com/PeinZero/fau-psa-forum/labels/good%20first%20issue
- Security: see [docs/security.md](docs/security.md) and the reporting section in CONTRIBUTING.md

## Licence

[MIT](LICENSE)
