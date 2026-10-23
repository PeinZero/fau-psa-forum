# Contributing

Thanks for helping. You do not need to know Next.js or Supabase well; small fixes are welcome. Set the project up first with the [README](README.md).

## Picking work

- Board: https://github.com/users/PeinZero/projects/1
- Columns: Backlog (ideas, not ready), Todo (ready to take), In progress, In review (PR open), Done.
- Done means merged. An issue with an open PR is not done.
- Start with issues labelled [good first issue](https://github.com/PeinZero/fau-psa-forum/labels/good%20first%20issue).
- Assign yourself to the issue before you start, so two people do not do the same work. If you have an idea that is not on the board, open an issue first and wait for a reply.

## Branches and pull requests

`main` is protected: you cannot push to it, and force pushes are blocked. Every change goes through a pull request.

Branch from an up-to-date `main` and use a prefix:

| Prefix | For | Example |
|---|---|---|
| `feat/` | new features | `feat/modlog-export` |
| `fix/` | bug fixes | `fix/perf-state` |
| `docs/` | documentation | `docs/project-plan` |
| `ci/` | workflows | `ci/pause-e2e` |
| `test/` | tests only | `test/e2e-full` |
| `infra/` | hosting, email, database operations | `infra/45-keep-db-awake` |

Adding the issue number helps (`feat/42-recent-signups`). Write "Closes #<number>" in the PR description.

### Checks every PR runs

The `checks` job in `.github/workflows/ci.yml` runs, in this order: lint, typecheck (`tsc`), unit tests (Vitest), database tests, build. Run the same before you push:

```sh
npm run lint
npm run typecheck
npm test
npm run test:db
npm run build
```

`npm run build` needs the three env names from `.env.example`; your `.env.local` is enough.

The end-to-end suite is paused on PRs because it slows down merging. A maintainer runs it manually from GitHub: Actions → CI → Run workflow. You can run it locally with Docker (README, Path B), then follow [docs/testing.md](docs/testing.md).

### PR checklist

- One focused change per PR. Small PRs get reviewed faster.
- UI changes: add screenshots at 390px (phone) and desktop width, in light and dark theme.
- New logic has tests (Vitest next to the code; database rules in `supabase/tests`).
- Docs are updated if behaviour, env names or commands changed.
- All checks above pass locally.

## Database rules

- Every database change is a new file in `supabase/migrations/`, named `<timestamp>_<name>.sql` like the existing ones.
- Never edit a migration that is already merged. Write a new one that fixes it.
- Every table has RLS enabled and policies. Add tests in `supabase/tests` (see `rls.test.ts`) and update the matrix in [docs/schema.md](docs/schema.md).
- Whoever merges a PR with a migration must run `npx supabase db push` against the live project right after merging. If nobody does, the live site breaks because the code expects tables or columns that do not exist yet. Mention the migration in the PR description so the merger knows.

## Code style

- Comments only for domain reasons (why a rule exists). No comments that repeat what the code does, and no ticket numbers.
- Match the surrounding code: naming, file layout, formatting.
- Next.js 16 differs from older versions and from most online tutorials. Read `node_modules/next/dist/docs/` before writing Next.js code. `cacheComponents` is on, so dynamic data such as `cookies()` must sit inside `<Suspense>`.
- Authorization lives in Postgres RLS, not in client code.
- Do not start a second dev server if one is already running.

## Design system

Use the shared tokens and components instead of new one-off styles. Rules and tokens: [docs/design.md](docs/design.md). Reusable primitives (button, card, badge, field and others) are in `src/components/ui`. Check light and dark theme and a 390px screen.

## Privacy

- Never commit `.env` files, keys or secrets. Only `.env.example` is committed. New env names go into `.env.example`.
- Never expose a Supabase service-role key or give it a `NEXT_PUBLIC_` prefix.
- Never paste real user data (names, emails, thread content from the live site) into issues, PRs, screenshots or tests. Use made-up data.
- Test against your own Supabase project or the local Docker stack, never the live one.

## Reporting bugs

Open a GitHub issue with: what you did, what you expected, what happened, device and browser, and a screenshot if it helps. Check that the bug is not already reported.

## Reporting security problems

Do not open a public issue. Use the "Report a vulnerability" button on the repository's Security tab if it is shown; otherwise contact the maintainers privately (Mahad or Abdul Moeez). Include steps to reproduce. See [docs/security.md](docs/security.md) for the controls already in place.

## Code of conduct

Be kind and respectful. No harassment, discrimination or personal attacks. Assume good intent, give specific and friendly review feedback, and accept feedback the same way. Maintainers may remove comments or contributions that break this.

## Credit

The Contributors page on the site lists GitHub contributors automatically. Once your PR is merged, you appear there.
