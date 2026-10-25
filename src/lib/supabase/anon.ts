import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * A client without a session that sees exactly what a signed-out visitor sees. It reads no cookies,
 * so it may run inside `"use cache"`, where one cached result is shared by every visitor.
 */
export function createAnonClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
