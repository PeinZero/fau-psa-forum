# Security

Read before touching auth, redirects, headers, user-generated content or RLS. Last full review: 2026-10-23, auth and proxy code, no findings.

## Controls in place

- **Sessions:** `src/lib/supabase/proxy.ts` calls `getClaims()` (validates the JWT) on every request
  and forwards Supabase's cache headers so a CDN never serves one user's cookie to another. It never
  redirects; reading is public.
- **Sign-in:** Google OAuth and magic link, PKCE code exchange in `/auth/callback`.
- **Bot protection:** the email form renders a Cloudflare Turnstile widget (`src/components/auth/turnstile.tsx`)
  and passes its token as `captchaToken`. Supabase verifies it, so a direct call to its endpoint without
  a token is rejected once captcha is on. The CSP has no `script-src` or `frame-src`, so
  `challenges.cloudflare.com` needs no allowance; add it if those directives are ever introduced.
  Deploy the widget before enabling captcha in Supabase, otherwise email sign-in breaks for everyone.
- **Redirects:** every `next` value goes through `safeNextPath` (`src/lib/safe-next.ts`), which
  parses against a dummy origin and falls back to `/`. Never redirect to a raw query param.
- **Sign-out:** `POST /auth/signout` rejects a mismatched `Origin` with 403.
- **Headers (`next.config.ts`):** minimal CSP (`frame-ancestors`, `base-uri`, `object-src`,
  `form-action`), `nosniff`, referrer policy, permissions policy, HSTS. No `script-src` because a
  nonce CSP forces dynamic rendering and defeats `cacheComponents`.
- **Image uploads:** files go through a server action, never straight from the browser to storage.
  The server sniffs the real format from the bytes (WebP or JPEG only), checks size, dimensions and
  count, and stores each under a random `threads/<uuid>` key with the upload key that only it holds.
  The database enforces per-thread, daily and total-storage limits. The media Worker
  (`workers/media/`) reads with a separate read-only key, answers only GET/HEAD for that key pattern,
  sets the content type from the extension with `nosniff`, and caches for a day.
- **Secrets:** only `NEXT_PUBLIC_SUPABASE_URL` and the publishable key reach the browser. Never
  expose a service-role key or prefix it `NEXT_PUBLIC_`.
- **Authorization:** Postgres RLS, not client code. Matrix in [schema.md](schema.md).

## Rules for new code

- Render user content as React text. If Markdown is rendered, keep raw HTML disabled and restrict
  link and image URL schemes to `http`, `https` and `mailto`.
- Any new route handler that mutates state must be POST and check `Origin`, like sign-out.
- Any new table needs RLS enabled and policies before data is written; add a case to
  `supabase/tests/rls.test.ts`.
- Role changes go through `set_user_role()` only.
- Add new env vars to `.env.example`; never read real env files.

## Open items

- Review the Markdown renderer (`src/components/markdown.tsx`) and the thread write/edit flow once
  merged: they are the main XSS surface.
- Review RLS policies against the matrix in `schema.md` before launch.
- Enable GitHub private vulnerability reporting; until then CONTRIBUTING.md names the maintainers as the contact.
- Bot protection on email sign-in (Cloudflare Turnstile, #74).
