import { ListChecks, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { fetchGuideSummaries } from "@/components/guides/data";
import { GuideCard, GuideRow } from "@/components/guides/guide-card";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getEffectiveViewer, isModerator } from "@/lib/auth/viewer";

const description = "Step-by-step checklists for arriving in Erlangen and Nuremberg, curated by the PSA moderators.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Guides",
    description,
    openGraph: { siteName: "PSA FAU Community Forum", title: "Guides", description, url: "/guides" },
  };
}

const cardGrid = "grid gap-4 sm:grid-cols-2";
const rowList = "-mx-3 flex flex-col divide-y divide-border sm:-mx-4";

async function GuideList() {
  const { guides, error } = await fetchGuideSummaries();

  if (error) {
    return (
      <p role="alert" className="text-body text-danger">
        Could not load the guides. Please try again later.
      </p>
    );
  }

  if (guides.length === 0) {
    const viewer = await getEffectiveViewer();
    return (
      <EmptyState
        icon={<ListChecks />}
        title="No guides yet"
        action={
          viewer && isModerator(viewer.role) ? (
            <Link href="/mod/guides/new" className={buttonClasses({ variant: "primary", size: "sm" })}>
              <Plus aria-hidden strokeWidth={1.75} />
              Create the first guide
            </Link>
          ) : undefined
        }
      >
        Step-by-step checklists from the moderators show up here.
      </EmptyState>
    );
  }

  const featured = guides.filter((guide) => guide.isFeatured);
  const others = guides.filter((guide) => !guide.isFeatured);
  // Section headings only help when both groups are on the page.
  const grouped = featured.length > 0 && others.length > 0;

  return (
    <div className="flex flex-col gap-10">
      {featured.length > 0 && (
        <section aria-labelledby={grouped ? "featured-guides" : undefined} className="flex flex-col gap-4">
          {grouped && (
            <h2 id="featured-guides" className="text-heading font-semibold text-foreground">
              Start here
            </h2>
          )}
          <ul className={cardGrid}>
            {featured.map((guide, index) => (
              <li key={guide.id} className="animate-fade-up" style={stagger(index)}>
                <GuideCard guide={guide} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {others.length > 0 && (
        <section aria-labelledby={grouped ? "more-guides" : undefined} className="flex flex-col gap-2">
          {grouped && (
            <h2 id="more-guides" className="text-heading font-semibold text-foreground">
              More guides
            </h2>
          )}
          <ul className={rowList}>
            {others.map((guide, index) => (
              <li key={guide.id} className="animate-fade-up" style={stagger(featured.length + index)}>
                <GuideRow guide={guide} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-busy="true" className={cardGrid}>
      <span className="sr-only">Loading guides…</span>
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl bg-surface px-4 py-4 sm:px-5">
          <div className="flex gap-3">
            <Skeleton className="size-9 rounded-md" />
            <div className="flex-1">
              <Skeleton className="mt-1 h-4 w-2/3" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </div>
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

async function ManageLink() {
  const viewer = await getEffectiveViewer();
  if (!viewer || !isModerator(viewer.role)) return null;
  return (
    <div className="flex gap-2">
      <Link href="/mod/guides" className={buttonClasses({ variant: "ghost", size: "sm" })}>
        Manage
      </Link>
      <Link href="/mod/guides/new" className={buttonClasses({ variant: "primary", size: "sm" })}>
        <Plus aria-hidden strokeWidth={1.75} />
        New guide
      </Link>
    </div>
  );
}

export default function GuidesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Guides"
        description={description}
        actions={
          <Suspense fallback={null}>
            <ManageLink />
          </Suspense>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <GuideList />
      </Suspense>
    </div>
  );
}
