import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";

type Refresh = { cookies: Parameters<SetAllCookies>[0]; headers: Record<string, string> };

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let refresh = null as Refresh | null;
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        refresh = { cookies: cookiesToSet, headers };
      },
    },
  });

  // Validates the JWT and refreshes expired tokens; reading stays public, so never redirect here.
  await supabase.auth.getClaims();

  const response = (await isMissingDetailPage(supabase, request))
    ? NextResponse.rewrite(new URL("/_not-found", request.url), { request })
    : NextResponse.next({ request });

  if (refresh) {
    refresh.cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    // Cache headers keep a CDN from serving one user's session cookie to another.
    Object.entries(refresh.headers).forEach(([name, value]) => response.headers.set(name, value));
  }
  return response;
}

const detailPage = /^\/([tc])\/([^/]+)$/;

/**
 * Thread and category pages stream their content, so a notFound() there can no longer change the
 * 200 status. Checking here gives unknown slugs a real 404. The visitor's own session decides
 * through RLS, so authors still reach their pending or rejected threads. Errors fail open.
 */
async function isMissingDetailPage(
  supabase: ReturnType<typeof createServerClient<Database>>,
  request: NextRequest,
): Promise<boolean> {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const match = detailPage.exec(request.nextUrl.pathname);
  if (!match) return false;

  let slug: string;
  try {
    slug = decodeURIComponent(match[2]);
  } catch {
    return false;
  }

  const table = match[1] === "t" ? "threads" : "categories";
  const { data, error } = await supabase.from(table).select("id").eq("slug", slug).limit(1);
  return !error && data.length === 0;
}
