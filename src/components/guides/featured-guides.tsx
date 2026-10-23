import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { stagger } from "@/components/ui/motion";

import { fetchGuideSummaries } from "./data";
import { GuideCard } from "./guide-card";

const FEATURED_LIMIT = 3;

/** Renders nothing until moderators feature a guide. Reads cookies, so render inside <Suspense>. */
export async function FeaturedGuides() {
  const { guides } = await fetchGuideSummaries({ featuredOnly: true, limit: FEATURED_LIMIT });
  if (guides.length === 0) return null;

  return (
    <section aria-labelledby="guides-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="guides-heading" className="text-sm font-medium text-muted">
          Guides for newcomers
        </h2>
        <Link
          href="/guides"
          className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-meta font-medium text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-foreground pointer-coarse:min-h-11"
        >
          All guides
          <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide, index) => (
          <li key={guide.id} className="animate-fade-up" style={stagger(index)}>
            <GuideCard guide={guide} showFeatured={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
