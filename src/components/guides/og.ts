import { createClient } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";

import type { Database } from "@/lib/supabase/database.types";

// Link previews are public: an anonymous client sees exactly what a signed-out visitor would.
function anonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function getGuideOg(slug: string): Promise<{ title: string; footer: string } | null> {
  "use cache";
  cacheLife("hours");
  const { data } = await anonClient()
    .from("guides")
    .select("title, guide_steps(count)")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const steps = data.guide_steps[0]?.count ?? 0;
  return { title: data.title, footer: `Guide · ${steps} ${steps === 1 ? "step" : "steps"}` };
}
