export type PgError = { code?: string; message?: string };

export const SIGN_IN_REQUIRED = "Please sign in again to continue.";

export const RESTRICTED = "Your account is restricted, so you can read but not post, report or vote. Please contact a moderator.";

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

// Raw database errors never reach the UI.
export function friendlyError(error: PgError, { messages = [], codes = {} }: Options = {}): string {
  const raw = error.message ?? "";
  if (raw.includes("your account is restricted")) return RESTRICTED;
  const hit = messages.find(([needle]) => raw.includes(needle));
  if (hit) return hit[1];
  const code = error.code ?? "";
  return codes[code] ?? CODE_MESSAGES[code] ?? GENERIC;
}

export function firstIssue(result: { error: { issues: ReadonlyArray<{ message: string }> } }): string {
  return result.error.issues[0]?.message ?? "Invalid request.";
}
