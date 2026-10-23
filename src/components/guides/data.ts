import "server-only";

import { cache } from "react";

import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export type GuideSummary = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  isFeatured: boolean;
  stepCount: number;
  /** Null for signed-out visitors, whose progress lives in their browser. */
  doneCount: number | null;
};

/** The viewer's own finished steps among `stepIds`; RLS never returns anyone else's. */
export async function fetchDoneStepIds(userId: string, stepIds: number[]): Promise<Set<number>> {
  if (stepIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase
    .from("guide_progress")
    .select("step_id")
    .eq("user_id", userId)
    .in("step_id", stepIds);
  return new Set((data ?? []).map((row) => row.step_id));
}

/** Featured first, then the moderators' order. Reads cookies, so render inside <Suspense>. */
export async function fetchGuideSummaries({ featuredOnly = false, limit }: { featuredOnly?: boolean; limit?: number } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("guides")
    .select("id, slug, title, summary, is_featured, guide_steps(id)")
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (featuredOnly) query = query.eq("is_featured", true);
  if (limit) query = query.limit(limit);

  const [{ data, error }, viewer] = await Promise.all([query, getViewer()]);
  const rows = data ?? [];
  const done = viewer
    ? await fetchDoneStepIds(
        viewer.userId,
        rows.flatMap((row) => row.guide_steps.map((step) => step.id)),
      )
    : null;

  const guides: GuideSummary[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    isFeatured: row.is_featured,
    stepCount: row.guide_steps.length,
    doneCount: done ? row.guide_steps.filter((step) => done.has(step.id)).length : null,
  }));
  return { guides, error };
}

/** One guide with its steps in order; linked threads the visitor may not see come back as null. */
export const getGuide = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guides")
    .select(
      `id, slug, title, summary, is_featured, created_at, updated_at,
       guide_steps(id, position, title, body, thread:threads(slug, title, best_comment_id))`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const { guide_steps, ...guide } = data;
  return { ...guide, steps: [...guide_steps].sort((a, b) => a.position - b.position) };
});

export type GuideDetail = NonNullable<Awaited<ReturnType<typeof getGuide>>>;
export type GuideStep = GuideDetail["steps"][number];

/** A guide as the moderators' editor needs it, by id so a renamed slug keeps the edit link. */
export async function getGuideForEdit(id: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("guides")
    .select("id, slug, title, summary, is_featured, sort_order, guide_steps(id, position, title, body, thread:threads(slug, title))")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { guide_steps, ...guide } = data;
  return { ...guide, steps: [...guide_steps].sort((a, b) => a.position - b.position) };
}

export type EditableGuide = NonNullable<Awaited<ReturnType<typeof getGuideForEdit>>>;
