# Deployment

- Vercel Hobby hosts the Next.js app. Pushes to `main` deploy; PRs get preview URLs.
- Supabase (Postgres + Auth), project ref `zjhrjhwqybzlahwbcxwh`, region eu-west (EU, GDPR-compliant).
- Env vars: see `.env.example`. Never commit `.env*.local` or service-role keys.
- Set `NEXT_PUBLIC_SITE_URL` for the Production environment only, so preview deployments
  fall back to their own origin for the auth callback.
- Supabase Auth → URL Configuration: Site URL = production domain. Redirect URLs:
  `http://localhost:3000/**`, `https://<prod-domain>/**`, and previews scoped to the team
  (`https://*-<team>.vercel.app/**`), never a bare `*.vercel.app`.
- Google sign-in: OAuth client (Web) in Google Cloud, redirect URI
  `https://<project-ref>.supabase.co/auth/v1/callback`; paste ID/secret into Supabase.
- Custom SMTP for auth emails: see [Auth email (SMTP)](#auth-email-smtp). Supabase's built-in mailer is heavily rate-limited.
- Domain: bought later via the Cloudflare registrar, pointed at Vercel.
- Voice notes (later): Cloudflare R2, EU jurisdiction.

## Auth email (SMTP)

The app signs users in with Google or an emailed magic link, so the magic link is the only auth
email today. There is no password sign-up or reset. Credentials live only in the Supabase dashboard
(Authentication → Emails → SMTP Settings), never in the repo or `supabase/config.toml`.

Testing (maintainers only): a dedicated Gmail account with 2-step verification and an app password.

| Field | Value |
|---|---|
| Host / port | `smtp.gmail.com` / `465` (SSL) |
| Username | the Gmail address |
| Password | the 16-character app password |
| Sender email / name | the same Gmail address / `FAU PSA Forum` |

Gmail caps sending at roughly 500 messages a day and rewrites the sender, so use it for testing only.

Launch: Resend with a verified domain (needs the custom domain). Add the DNS records Resend shows
(SPF, DKIM, DMARC) in Cloudflare, wait until the domain is verified, then:

| Field | Value |
|---|---|
| Host / port | `smtp.resend.com` / `465` |
| Username | `resend` |
| Password | a Resend API key limited to sending |
| Sender email / name | `noreply@<prod-domain>` / `FAU PSA Forum` |

After switching provider:

1. Raise Authentication → Rate Limits → emails per hour above the default; the dashboard only lets
   you once custom SMTP is on.
2. Request a magic link for a non-team address and confirm it arrives in the inbox, not spam, from
   the new sender.
3. Check the link opens `/auth/callback` on the right origin (see `NEXT_PUBLIC_SITE_URL`).

## Before public launch

Not needed while only the maintainers are testing; do these before sharing the link widely.

- Impressum and privacy policy pages (German law for public sites; operator = PSA or a named maintainer), linked from the footer.
- Custom SMTP for auth emails.
- Users can delete their account and their content.
- Custom domain.
