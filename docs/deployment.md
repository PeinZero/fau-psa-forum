# Deployment

- Vercel Hobby hosts the Next.js app. Pushes to `main` deploy; PRs get preview URLs.
- Supabase (Postgres + Auth), project ref `zjhrjhwqybzlahwbcxwh`, region eu-west-2 (London); Vercel functions pinned to lhr1 next to it.
- Env vars: see `.env.example`. Never commit `.env*.local` or service-role keys.
- Set `NEXT_PUBLIC_SITE_URL` for the Production environment only, so preview deployments
  fall back to their own origin for the auth callback.
- Supabase Auth → URL Configuration: Site URL = production domain. Redirect URLs:
  `http://localhost:3000/**`, `https://<prod-domain>/**`, and previews scoped to the team
  (`https://*-<team>.vercel.app/**`), never a bare `*.vercel.app`.
- Google sign-in: OAuth client (Web) in Google Cloud, redirect URI
  `https://<project-ref>.supabase.co/auth/v1/callback`; paste ID/secret into Supabase.
- Configure custom SMTP before launch; Supabase's built-in mailer is heavily rate-limited.
- Domain: bought later via the Cloudflare registrar, pointed at Vercel.
- Voice notes (later): Cloudflare R2, EU jurisdiction.

## Before public launch

Not needed while only the maintainers are testing; do these before sharing the link widely.

- Impressum and privacy policy: `/impressum` and `/privacy`, linked from the footer. Operator
  (decided 2026-10-24): a named maintainer as private person, contact psa.community.forum@gmail.com.
  Fill in their name and postal address in `src/lib/legal.ts`; until then both pages show a
  "details are being finalised" notice. Update `/privacy` when a processor changes (custom SMTP,
  R2, domain registrar).
- Custom SMTP for auth emails.
- Users can delete their account and their content.
- Custom domain.
