import type { Enums } from "@/lib/supabase/database.types";

export type MentionUser = {
  username: string;
  display_name: string;
  affiliation: Enums<"affiliation"> | null;
  role: Enums<"user_role">;
};

export const MENTION_QUERY_MAX = 20;
export const MENTION_LIMIT = 6;

export type MentionToken = { start: number; end: number; query: string };

/**
 * The `@token` ending at the caret. Mirrors the database rule: the `@` must not follow a letter,
 * digit or underscore (so `bilal@example.com` is no mention) and handles are at most 20 characters.
 */
export function findMentionToken(text: string, caret: number): MentionToken | null {
  let start = caret;
  while (start > 0 && caret - start <= MENTION_QUERY_MAX && /[A-Za-z0-9_]/.test(text[start - 1])) start--;
  if (start === 0 || text[start - 1] !== "@" || caret - start > MENTION_QUERY_MAX) return null;
  if (start - 1 > 0 && /[A-Za-z0-9_]/.test(text[start - 2])) return null;
  const query = text.slice(start, caret);
  if (!query) return null;
  let end = caret;
  while (end < text.length && /[A-Za-z0-9_]/.test(text[end])) end++;
  return { start: start - 1, end, query };
}
