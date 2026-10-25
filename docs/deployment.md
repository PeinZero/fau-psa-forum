# Deployment

Read before deploying, changing env vars or applying migrations.

## Hosting
- Vercel Hobby hosts the Next.js app. Pushes to `main` deploy; PRs get preview URLs.
- Supabase (Postgres + Auth), project ref `zjhrjhwqybzlahwbcxwh`, region eu-west-2 (London). `vercel.json` pins functions to `lhr1` (London) next to it.
- Domain: not yet; planned via the Cloudflare registrar pointed at Vercel ([launch.md](launch.md)).

## Environment
- Names are in `.env.example`. Never commit `.env*.local` or service-role keys.
- Set `NEXT_PUBLIC_SITE_URL` for the Production environment only, so previews fall back to their own origin for the auth callback.

## Supabase Auth
- URL Configuration: Site URL = production domain. Redirect URLs: `http://localhost:3000/**`, `https://<prod-domain>/**`, and previews scoped to the team (`https://*-<team>.vercel.app/**`), never a bare `*.vercel.app`.
- Google sign-in: OAuth client (Web) in Google Cloud, redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`; ID and secret go into Supabase.
- Cloudflare Turnstile: widget for the production domain and localhost. Production gets the real `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; Preview and Development use Cloudflare's test key `1x00000000000000000000AA`. The secret key goes only into Supabase (Authentication → Bot and Abuse Protection) and Bitwarden. Deploy the code first, then enable captcha in Supabase. Any Supabase project that previews talk to needs the matching test secret `1x0000000000000000000000000000000AA`, or preview tokens are rejected.
- Email: custom SMTP through a Gmail account is configured (the built-in mailer allows only a few emails per hour). Update `/privacy` when the sender changes.

## Migrations
- Push right after merging a PR that adds one, from a machine linked to the project:

  ```sh
  npx supabase login
  npx supabase link --project-ref zjhrjhwqybzlahwbcxwh
  npx supabase db push
  ```

- If a migration file is older than ones already applied (merged out of order), use `npx supabase db push --include-all`.
- Rules for writing migrations: [schema.md](schema.md).
- Seeds live in `supabase/seed/` (starter content and its cleanup script); the starter content is already loaded ([content/README.md](content/README.md)).
- The first superadmin is set once in the SQL editor (see README, Path A, step 7).

## Keep-awake
`.github/workflows/keep-supabase-awake.yml` reads one row through the REST API every 3 days so the free project never pauses. It needs the `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` secrets in the GitHub environment "wake up call for superbase". A failed run emails the watchers.

## Legal pages
`/impressum` and `/privacy` are linked from the footer. Operator name and postal address still have to be filled in `src/lib/legal.ts`; until then both pages show a notice ([launch.md](launch.md)).
