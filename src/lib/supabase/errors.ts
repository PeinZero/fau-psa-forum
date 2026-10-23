export type PgError = { code?: string; message?: string };

export const SIGN_IN_REQUIRED = "Please sign in again to continue.";

const RATE_LIMIT_PREFIX = "rate limit: ";

const GENERIC = "Something went wrong. Please try again.";

const CODE_MESSAGES: Record<string, string> = {
  "42501": "You don't have permission to do that.",
  "23505": "That value is already taken.",
  "23514": "Some of your input is not valid. Please check the length limits and allowed values.",
  "22001": "Some of your input is not valid. Please check the length limits and allowed values.",
  "23503": "A related item no longer exists.",
  P0002: "That item no longer exists.",
};

type Options = {
  // Substrings of the database's own RAISE messages or constraint names, checked before the error code.
  messages?: ReadonlyArray<readonly [needle: string, text: string]>;
  // Module-specific wording for a code (e.g. 23503 means something different per table).
  codes?: Partial<Record<string, string>>;
};

const RESTRICTION_PREFIX = /^your account is (muted|banned)\b/;

/**
 * The mute and ban triggers word their messages for the member ("your account is muted until
 * 31 Oct 2026, 14:00: Spam links"), so they are shown with the reason, whatever was attempted.
 */
export function restrictionError(raw: string): string | null {
  if (!RESTRICTION_PREFIX.test(raw)) return null;
  const sentence = `Y${raw.slice(1)}`.replace(/: /, ". Reason: ");
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

// Raw database errors never reach the UI.
export function friendlyError(error: PgError, { messages = [], codes = {} }: Options = {}): string {
  const raw = error.message ?? "";
  const restricted = restrictionError(raw);
  if (restricted) return restricted;
  // The rate-limit triggers write their messages for members, so they are shown as they are.
  if (raw.startsWith(RATE_LIMIT_PREFIX)) return raw.slice(RATE_LIMIT_PREFIX.length);
  const hit = messages.find(([needle]) => raw.includes(needle));
  if (hit) return hit[1];
  const code = error.code ?? "";
  return codes[code] ?? CODE_MESSAGES[code] ?? GENERIC;
}

export function firstIssue(result: { error: { issues: ReadonlyArray<{ message: string }> } }): string {
  return result.error.issues[0]?.message ?? "Invalid request.";
}
