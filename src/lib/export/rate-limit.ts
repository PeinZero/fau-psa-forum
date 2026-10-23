import { createHmac, timingSafeEqual } from "node:crypto";

export const EXPORT_COOKIE = "export_at";
export const EXPORT_INTERVAL_MS = 10 * 60 * 1000;

// Falls back to the public key: the cookie only stops accidental repeats, not a determined user.
function secret(): string {
  return process.env.EXPORT_COOKIE_SECRET ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "export";
}

function sign(userId: string, at: number): string {
  return createHmac("sha256", secret()).update(`${userId}.${at}`).digest("base64url");
}

export function signExportCookie(userId: string, at: number): string {
  return `${at}.${sign(userId, at)}`;
}

/** Milliseconds until the next export is allowed; 0 when allowed or the cookie is missing, forged or another user's. */
export function exportWaitMs(cookie: string | undefined, userId: string, now: number): number {
  if (!cookie) return 0;
  const [atRaw, mac] = cookie.split(".");
  const at = Number(atRaw);
  if (!mac || !Number.isSafeInteger(at)) return 0;
  const expected = Buffer.from(sign(userId, at));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 0;
  return Math.max(0, at + EXPORT_INTERVAL_MS - now);
}
