import type { NextRequest } from "next/server";

import { MENTION_LIMIT, MENTION_QUERY_MAX, type MentionUser } from "@/components/mentions/types";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 1 || q.length > MENTION_QUERY_MAX || !/^[a-z0-9_ ]+$/.test(q)) {
    return Response.json({ error: "Invalid query." }, { status: 400, headers });
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return Response.json({ error: "Sign in required." }, { status: 401, headers });

  // The query check above rules out PostgREST's reserved `,` `.` `:` `(` `)`, so the pattern can
  // sit unquoted in the or-filter; only LIKE wildcards need escaping.
  const pattern = escapeLike(q);
  // Spaces only occur in display names; they cannot appear in a handle.
  const filter = q.includes(" ")
    ? `display_name.ilike.%${pattern}%`
    : `username.ilike.${pattern}%,display_name.ilike.%${pattern}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("username, display_name, affiliation, role")
    .or(filter)
    .order("username")
    .limit(MENTION_LIMIT);
  if (error) {
    console.error("mention lookup failed", error);
    return Response.json([] satisfies MentionUser[], { headers });
  }
  return Response.json(data satisfies MentionUser[], { headers });
}
