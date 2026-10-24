import { Pin } from "lucide-react";
import Link from "next/link";

import { cardClasses } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import type { BrowseCity } from "./params";

const PINNED_LIMIT = 5;

/** Moderator-pinned threads of a category, kept out of the ranking; renders nothing when none. */
export async function PinnedThreads({ categoryId, city }: { categoryId: number; city?: BrowseCity }) {
  const supabase = await createClient();
  let query = supabase
    .from("threads")
    .select("id, slug, title")
    .eq("status", "published")
    .eq("is_pinned", true)
    .eq("category_id", categoryId);
  if (city) query = query.or(`city.in.(${city},both),city.is.null`);
  const { data } = await query.order("last_activity_at", { ascending: false }).limit(PINNED_LIMIT);
  if (!data?.length) return null;

  return (
    <section aria-labelledby="pinned-heading" className="mb-6">
      <h2 id="pinned-heading" className="mb-2 flex items-center gap-1.5 text-meta font-medium text-muted">
        <Pin aria-hidden strokeWidth={1.75} className="size-3.5 text-accent" />
        Pinned
      </h2>
      <ul className={cardClasses({ padding: "none", className: "overflow-hidden divide-y divide-border bg-accent-soft/40" })}>
        {data.map((thread) => (
          <li key={thread.id}>
            <Link
              href={`/t/${thread.slug}`}
              className="flex min-h-11 items-center px-4 py-2.5 text-body font-medium text-foreground transition-colors duration-150 hover:bg-surface-hover focus-visible:-outline-offset-2 sm:px-5"
            >
              <span className="min-w-0 break-words">{thread.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
