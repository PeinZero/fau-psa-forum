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

## Thread images
Images live in private Backblaze B2 buckets (the account from Backups, region EU Central) and reach browsers through the Cloudflare Worker in `workers/media/`, which signs each read with a read-only key. Downloads from Backblaze to Cloudflare are free; the free Workers plan stops at 100,000 requests a day instead of billing, and the account has no payment method. The server uploads after checking the bytes; the database enforces 3 images per thread, 6 per member and 300 site-wide per day, and stops uploads at 8 GB of the free 10 GB, which backups share.

Without `NEXT_PUBLIC_MEDIA_URL` the picker is hidden, so CI and most local work need nothing.

One-time setup (owner):
1. Buckets, both **Private**, Object Lock off: the live one with Lifecycle Settings → "Keep only the last version of the file" (otherwise a deleted image stays as a hidden version), and the same name plus `-dev` for localhost and previews with a custom rule: empty prefix, hidden after 6 days, deleted 1 day after hiding.
2. Application keys, each limited to one bucket, straight into Bitwarden: an upload key (**Read and Write**) and a Worker key (**Read Only**) per bucket.
3. Worker: fill `B2_REGION` and `B2_BUCKET` in `workers/media/wrangler.jsonc` (top level = live, `env.dev` = dev), then in `workers/media/`:

   ```sh
   npm install
   npx wrangler login
   npx wrangler secret put B2_KEY_ID --env dev           # dev Worker key
   npx wrangler secret put B2_APPLICATION_KEY --env dev
   npm run deploy:dev
   npx wrangler secret put B2_KEY_ID --env=""          # live Worker key
   npx wrangler secret put B2_APPLICATION_KEY --env=""
   npm run deploy
   ```

   Each deploy prints the Worker's `workers.dev` address. Once the domain exists (#19), add the route `media.<domain>` to the live Worker with the request-limit failure mode set to fail closed.
4. Vercel env: `NEXT_PUBLIC_MEDIA_URL` (the Worker address) and `MEDIA_B2_REGION`, `MEDIA_B2_BUCKET`, `MEDIA_B2_KEY_ID`, `MEDIA_B2_APPLICATION_KEY` (the upload key). Production gets the live values; Preview and your `.env.local` get the dev values.
5. Push the `thread_images` migration ([Migrations](#migrations)), redeploy, post a thread with an image on a preview and check it loads from the Worker.

### Cleanup of deleted images
Deleting a `thread_images` row by any path (the app, a cascade, a member calling the API directly) makes a database trigger queue the file in `public.media_deletions`; clients can't touch that table. The app usually deletes the file at once, but not always. A queued file still counts toward the upload limits, so `.github/workflows/media-cleanup.yml` drains the queue every night at 03:30 UTC. Before that it runs `purge_rejected_threads()`, which deletes rejected threads 7 days after the rejection or the author's last edit (their images join the queue) (or by hand: Actions → Media cleanup → Run workflow). `scripts/media-cleanup.sh` takes up to 1000 keys uploaded more than a day ago (younger ones still count toward the member's daily limit), deletes only keys shaped like `threads/<uuid>.webp|jpg` from the live bucket, and removes the queue row after the file is gone. It keeps going after a failure and then fails the run, so GitHub emails the watchers.

One-time setup (owner): GitHub → Settings → Environments → `media-cleanup`, limited to the `main` branch, with the secrets `SUPABASE_DB_URL` (the session-pooler URI as for backups), `MEDIA_B2_REGION`, `MEDIA_B2_BUCKET`, `MEDIA_B2_KEY_ID`, `MEDIA_B2_APPLICATION_KEY` (the **live bucket's upload key**). Then run the workflow once by hand.

## Legal pages
`/impressum` and `/privacy` are linked from the footer. Operator name and postal address still have to be filled in `src/lib/legal.ts`; until then both pages show a notice ([launch.md](launch.md)).
