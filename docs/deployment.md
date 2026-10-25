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

## Backups
`.github/workflows/backup.yml` runs every night at 02:30 UTC (or by hand: Actions → Nightly backup → Run workflow). It dumps the data of `public`, `auth.users`, `auth.identities` and `supabase_migrations.schema_migrations` with `pg_dump` 17 through the session pooler, gzips it, encrypts it with `age` to a public key and uploads it to a private Backblaze B2 bucket: every night to `daily/`, on Sundays also to `weekly/`. Dumps never become workflow artifacts (the repo is public). A missing secret, a dump without users or threads, or a failed upload fails the run, and GitHub emails the watchers. The nightly connection also counts as activity for the free project.

Data only, because the schema is `supabase/migrations` and a local stack already has Supabase's auth and storage schemas and roles. `schema_migrations` records which migrations production had, with their SQL. Sessions and tokens are left out: after a restore people simply sign in again.

One-time setup (owner):
1. Sign up at Backblaze with the project Gmail and choose region **EU Central** (data in Amsterdam; it can't be changed later). Don't add a payment method: without one the account can never bill, and the 10 GB free storage is permanent. Turning on B2 asks for a phone number by SMS. Save the login in Bitwarden.
2. B2 → Buckets → Create a Bucket, e.g. `psa-forum-backups`, **Private**. Keep it separate from the image buckets (#71).
3. Bucket → Lifecycle Settings → custom rules: prefix `daily/` hidden after 6 days, prefix `weekly/` hidden after 27 days, both deleted 1 day after hiding (7 daily and 4 weekly copies; hidden files count as storage until deleted).
4. B2 → Application Keys → Add a New Application Key: this bucket only, **Read and Write**. Note the keyID, the applicationKey (shown once) and the region from the bucket's S3 endpoint `s3.<region>.backblazeb2.com` (e.g. `eu-central-003`).
5. Locally: `age-keygen -o psa-backup.key`. Save the whole file in the shared Bitwarden vault, then delete it locally. Its `# public key: age1…` line is the recipient; only that goes to GitHub.
6. Supabase dashboard → Connect → Session pooler: copy the URI (`postgresql://postgres.zjhrjhwqybzlahwbcxwh:<password>@<pooler-host>:5432/postgres`) with the database password filled in.
7. GitHub → Settings → Environments → `psa-forum-nightly-backup`, limited to the `main` branch (Deployment branches → Selected branches), with the secrets `SUPABASE_DB_URL`, `AGE_RECIPIENT` (the public key), `B2_REGION`, `B2_BUCKET`, `B2_KEY_ID`, `B2_APPLICATION_KEY`.
8. Run the workflow once by hand, check that `daily/` holds a file, then do a test restore.

Restore, into the local Supabase only (needs Docker, `age` and `psql` 17.6 or newer: `brew install age libpq`, then add `$(brew --prefix libpq)/bin` to `PATH`):

```sh
# Download a file from the bucket (Backblaze → Browse Files), and the key from Bitwarden.
age -d -i psa-backup.key psa-forum-<date>.sql.gz.age | gunzip \
  | awk '/^COPY supabase_migrations/ { f = 1; next } /^\\.$/ { f = 0 } f { print $1 }' | sort | tail -n 1
git checkout <a commit whose newest migration is that version>
npx supabase start && npx supabase db reset
scripts/restore-backup.sh psa-forum-<date>.sql.gz.age psa-backup.key
```

The script refuses any database that is not on this machine, replaces exactly the tables in the dump in one transaction (a failure changes nothing) and prints the restored users, threads and comments. Loading a backup into production is a deliberate manual step: check it locally first.

## Legal pages
`/impressum` and `/privacy` are linked from the footer. Operator name and postal address still have to be filled in `src/lib/legal.ts`; until then both pages show a notice ([launch.md](launch.md)).
