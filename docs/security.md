# Security

Read before touching auth, redirects, headers, user-generated content or RLS. Last full review: 2026-10-23, auth and proxy code, no findings.

## Controls in place

- **Sessions:** `src/lib/supabase/proxy.ts` calls `getClaims()` (validates the JWT) on every request
  and forwards Supabase's cache headers so a CDN never serves one user's cookie to another. It never
  redirects; reading is public.
- **Sign-in:** Google OAuth and magic link, PKCE code exchange in `/auth/callback`.
- **Redirects:** every `next` value goes through `safeNextPath` (`src/lib/safe-next.ts`), which
  parses against a dummy origin and falls back to `/`. Never redirect to a raw query param.
- **Sign-out:** `POST /auth/signout` rejects a mismatched `Origin` with 403.
- **Headers (`next.config.ts`):** minimal CSP (`frame-ancestors`, `base-uri`, `object-src`,
  `form-action`), `nosniff`, referrer policy, permissions policy, HSTS. No `script-src` because a
  nonce CSP forces dynamic rendering and defeats `cacheComponents`.
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
- Enable GitHub private vulnerability reporting and decide where the reporting policy lives.
