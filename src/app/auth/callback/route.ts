import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

// Long enough for a magic link opened a few minutes after sign-up; returning members skip it.
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", data.user.id)
        .maybeSingle();
      const isNew = profile ? Date.now() - new Date(profile.created_at).getTime() < NEW_ACCOUNT_WINDOW_MS : false;
      if (isNew) {
        const welcomeUrl = new URL("/welcome", origin);
        if (next !== "/") welcomeUrl.searchParams.set("next", next);
        return NextResponse.redirect(welcomeUrl);
      }
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const errorUrl = new URL("/login", origin);
  errorUrl.searchParams.set("error", "auth_failed");
  if (next !== "/") errorUrl.searchParams.set("next", next);
  return NextResponse.redirect(errorUrl);
}
