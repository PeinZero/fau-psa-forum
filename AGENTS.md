# FAU PSA Forum

Moderator-curated Q&A threads (text, later voice notes) for the Pakistani Students Association
at FAU Erlangen-Nürnberg. Next.js 16 App Router + TypeScript + Tailwind v4, Supabase via
`@supabase/ssr`, hosted on Vercel.

- Next.js 16 differs from model training data: check `node_modules/next/dist/docs/` before writing Next code.
- `cacheComponents: true`: dynamic data such as `cookies()` must sit inside `<Suspense>`.
- Verify with `npx tsc --noEmit`, `npm run lint`, `npm run build`. Never start a second dev server.
- Until UAT: no new or updated unit/e2e tests (see docs/testing.md); keep `npm run test:db` green.
- `main` is protected: work on a branch and open a PR. Commit or push only when asked. Git identity and credentials are repo-local (PeinZero); don't change them.
- Comments: domain reasons only, no mechanical explanations or ticket numbers.
- Never read `.env.local` or other real env files; the owner fills them in. Use `.env.example` for names.

## Read when needed

- [docs/product.md](docs/product.md): product rules and roles. Read before any user-facing feature or schema work.
- [docs/schema.md](docs/schema.md): tables, RLS matrix, search. Read before migrations, queries or policies.
- [docs/design.md](docs/design.md): design system, tokens, UI components, motion. Read before any UI work.
- [docs/security.md](docs/security.md): auth, redirect, header and RLS rules. Read before auth, UGC or policy work.
- [docs/testing.md](docs/testing.md): unit, db and e2e tests, CI. Read before adding tests or changing CI.
- [docs/delegation.md](docs/delegation.md): subagent split and review lenses. Read before multi-step work or reviews.
- [docs/deployment.md](docs/deployment.md): hosting, env vars, regions.
