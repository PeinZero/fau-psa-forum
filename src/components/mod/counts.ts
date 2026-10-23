import { connection } from "next/server";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { recentEditsCutoff } from "./recent";

export type ModCounts = { threads: number; reports: number; edits: number; applications: number; updates: number };

// Shared by the layout shell and the overview within one request.
export const getModCounts = cache(async (): Promise<ModCounts> => {
  // The 7-day cutoff reads the clock, so this must not be prerendered.
  await connection();
  const supabase = await createClient();
  const head = { count: "exact", head: true } as const;
  const [threads, reports, edits, applications, updates] = await Promise.all([
    supabase.from("threads").select("id", head).eq("status", "pending"),
    supabase.from("reports").select("id", head).eq("status", "open"),
    supabase.from("thread_revisions").select("id", head).gte("created_at", recentEditsCutoff()),
    supabase.from("moderator_applications").select("id", head).eq("status", "pending"),
    supabase.from("update_requests").select("id", head).eq("status", "open"),
  ]);
  return {
    threads: threads.count ?? 0,
    reports: reports.count ?? 0,
    edits: edits.count ?? 0,
    applications: applications.count ?? 0,
    updates: updates.count ?? 0,
  };
});
