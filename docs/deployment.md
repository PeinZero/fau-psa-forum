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
- Configure custom SMTP before launch; Supabase's built-in mailer is heavily rate-limited.
- Domain: bought later via the Cloudflare registrar, pointed at Vercel.
- Voice notes (later): Cloudflare R2, EU jurisdiction.
