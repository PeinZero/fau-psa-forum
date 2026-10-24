import { PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BrowseControls } from "@/components/browse/browse-controls";
import { BrowseResults } from "@/components/browse/browse-results";
import { BrowseSkeleton } from "@/components/browse/browse-skeleton";
import { browseHref, browseTitle, parseBrowseParams } from "@/components/browse/params";
import { fetchCategories } from "@/components/thread/thread-list";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const description = "Every published thread from the PSA community, by hot, new, top or recent activity.";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const state = parseBrowseParams(await searchParams);
  const title = browseTitle(state);
  return {
    title,
    description,
    alternates: { canonical: browseHref("/browse", { sort: state.sort, period: state.period, q: "" }) },
    // Searches and deep pages are endless variations of the same list.
    robots: state.q || state.page > 1 ? { index: false } : undefined,
    openGraph: { siteName: "FAU PSA Forum", title, description, url: "/browse" },
  };
}

export default function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col">
      <PageHeader
        className="mb-6"
        title="Browse"
        description={description}
        actions={
          <Link href="/new" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <PenLine strokeWidth={1.75} />
            Ask a question
          </Link>
        }
      />
      <Suspense fallback={<BrowseSkeleton />}>
        <BrowseContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function BrowseContent({ searchParams }: { searchParams: SearchParams }) {
  const [raw, categories] = await Promise.all([searchParams, fetchCategories()]);
  const parsed = parseBrowseParams(raw);
  const category = categories.find((row) => row.slug === parsed.category);
  const state = { ...parsed, category: category?.slug };

  return (
    <>
      <BrowseControls path="/browse" state={state} categories={categories} searchPlaceholder="Search these threads…" />
      <BrowseResults
        path="/browse"
        state={state}
        categoryId={category?.id}
        emptyText="No threads here yet"
        emptyDescription="Try another city or category, or ask the first question."
      />
    </>
  );
}
