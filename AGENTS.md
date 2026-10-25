# PSA FAU Community Forum

Moderator-curated Q&A threads for the Pakistan Student Association at FAU Erlangen-Nürnberg.
Next.js 16 App Router + TypeScript + Tailwind v4, Supabase via `@supabase/ssr`, Vercel.

- Next.js 16 differs from training data: check `node_modules/next/dist/docs/` before writing Next code.
- `cacheComponents: true`: dynamic data such as `cookies()` must sit inside `<Suspense>`.
- Verify with `npx tsc --noEmit`, `npm run lint`, `npm run build`. Never start a second dev server.
- Write thorough Vitest unit tests for new or changed logic; keep `npm test` and `npm run test:db` green. E2E is paused (docs/testing.md).
- No rabbit holes: if an approach fails twice or a step takes far longer than expected, stop, note what you found and move on or report back.
- `main` is protected: work on a branch and open a PR. Commit or push only when asked. Git identity and credentials are repo-local (PeinZero); don't change them.
- Comments: domain reasons only, no mechanical explanations or ticket numbers.
- Never read `.env.local` or other real env files; use `.env.example` for names.

## Read when needed

- [docs/features.md](docs/features.md): what the product does. Read to learn what already exists.
- [docs/launch.md](docs/launch.md): missing pieces, launch steps, costs, legal. Read before launch, infra or budget work.
- [docs/product.md](docs/product.md): naming, roles, posting rules. Read before any user-facing feature.
- [docs/schema.md](docs/schema.md): tables, RLS matrix, search. Read before migrations, queries or policies.
- [docs/design.md](docs/design.md): tokens, components, motion. Read before any UI work.
- [docs/security.md](docs/security.md): auth, redirects, headers. Read before auth, user content or policy work.
- [docs/testing.md](docs/testing.md): unit, db and e2e tests, CI. Read before adding tests or changing CI.
- [docs/tickets.md](docs/tickets.md): ticket format and board. Read before opening an issue.
- [docs/deployment.md](docs/deployment.md): hosting, env, migration push. Read before deploying or applying migrations.
- [docs/delegation.md](docs/delegation.md): subagent split and review lenses. Read before multi-step work or reviews.
- [docs/content/README.md](docs/content/README.md): starter threads and guides. Read before editing content.
