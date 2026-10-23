import { cookies } from "next/headers";

import { assembleExport, exportFilename, SECTION_KEYS, type SectionKey } from "@/lib/export/assemble";
import { EXPORT_COOKIE, EXPORT_INTERVAL_MS, exportWaitMs, signExportCookie } from "@/lib/export/rate-limit";
import { createClient } from "@/lib/supabase/server";

const NOTIFICATION_LIMIT = 500;

function text(body: string, status: number, extra: Record<string, string> = {}) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "private, no-store", ...extra },
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) return text("Sign in to download your data.", 401);

  const cookieStore = await cookies();
  const wait = exportWaitMs(cookieStore.get(EXPORT_COOKIE)?.value, userId, Date.now());
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60_000);
    return text(
      `You downloaded your data a moment ago. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      429,
      { "Retry-After": String(Math.ceil(wait / 1000)) },
    );
  }

  const queries: Record<SectionKey, PromiseLike<{ data: unknown; error: unknown }>> = {
    threads: supabase.from("threads").select("*").eq("author_id", userId).order("created_at"),
    comments: supabase.from("comments").select("*").eq("author_id", userId).order("created_at"),
    votes: supabase.from("comment_votes").select("comment_id, value").eq("user_id", userId),
    bookmarks: supabase.from("bookmarks").select("*").eq("user_id", userId),
    follows: supabase.from("thread_follows").select("*").eq("user_id", userId),
    notification_preferences: supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle(),
    notifications: supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(NOTIFICATION_LIMIT),
    reports: supabase.from("reports").select("*").eq("reporter_id", userId).order("created_at"),
    update_requests: supabase.from("update_requests").select("*").eq("requester_id", userId).order("created_at"),
    moderator_applications: supabase.from("moderator_applications").select("*").eq("user_id", userId).order("created_at"),
    guide_progress: supabase.from("guide_progress").select("*").eq("user_id", userId),
  };

  const [profile, email, ...results] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.auth.getUser().then(({ data }) => data.user?.email ?? null),
    ...SECTION_KEYS.map((key) => queries[key]),
  ]);
  const sections = Object.fromEntries(SECTION_KEYS.map((key, i) => [key, results[i]])) as Parameters<
    typeof assembleExport
  >[0]["sections"];

  const now = new Date();
  const body = JSON.stringify(assembleExport({ now, email, profile, sections }), null, 2);

  const response = new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(now)}"`,
      "Cache-Control": "private, no-store",
    },
  });
  cookieStore.set(EXPORT_COOKIE, signExportCookie(userId, now.getTime()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/account/export",
    maxAge: EXPORT_INTERVAL_MS / 1000,
  });
  return response;
}
