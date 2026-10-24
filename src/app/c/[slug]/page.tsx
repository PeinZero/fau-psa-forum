import { Info, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BrowseControls } from "@/components/browse/browse-controls";
import { BrowseResults } from "@/components/browse/browse-results";
import { BrowseControlsSkeleton } from "@/components/browse/browse-skeleton";
import { parseBrowseParams } from "@/components/browse/params";
import { PinnedThreads } from "@/components/browse/pinned-threads";
import { CategoryIcon } from "@/components/thread/category-icon";
import { fetchCategories, ThreadListSkeleton } from "@/components/thread/thread-list";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type Props = { params: Params; searchParams: SearchParams };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await fetchCategories()).find((c) => c.slug === slug);
  if (!category) return { title: "Category not found", robots: { index: false } };
  const description = category.description ?? undefined;
  return {
    title: category.name,
    description,
    openGraph: {
      siteName: "FAU PSA Forum",
      title: category.name,
      description,
      url: `/c/${category.slug}`,
    },
  };
}

export default function CategoryPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<CategorySkeleton />}>
      <CategoryContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** Residence and visa answers come from members' own cases; rules and offices change. */
const legalNoteSlugs = new Set(["rp-visa"]);

async function CategoryContent({ params, searchParams }: Props) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const category = (await fetchCategories()).find((c) => c.slug === slug);
  if (!category) notFound();

  const path = `/c/${category.slug}`;
  const state = { ...parseBrowseParams(raw), category: undefined };

  return (
    <div className="flex flex-col">
      <PageHeader
        className="mb-6"
        title={
          <span className="flex items-center gap-3">
            <CategoryIcon slug={category.slug} className="size-10 bg-surface text-accent" />
            <span className="min-w-0 break-words">{category.name}</span>
          </span>
        }
        description={category.description}
        actions={
          <Link href="/new" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <PenLine strokeWidth={1.75} />
            Ask a question
          </Link>
        }
      />

      {legalNoteSlugs.has(category.slug) && (
        <p className="-mt-2 mb-6 flex items-start gap-2 text-meta text-muted">
          <Info aria-hidden strokeWidth={1.75} className="mt-px size-3.5 shrink-0" />
          Community advice, not legal advice — always confirm with the Ausländerbehörde or the official office.
        </p>
      )}

      <BrowseControls path={path} state={state} searchPlaceholder={`Search in ${category.name}…`} />

      {state.page === 1 && !state.q && (
        <Suspense fallback={null}>
          <PinnedThreads categoryId={category.id} city={state.city} />
        </Suspense>
      )}

      <Suspense fallback={<ThreadListSkeleton rows={8} />}>
        <BrowseResults
          path={path}
          state={state}
          categoryId={category.id}
          hideCategory
          emptyText={state.city ? "No threads for this city yet" : "No threads in this category yet"}
          emptyDescription={
            state.city
              ? "Try all cities, or ask the first question for this city."
              : "Be the first to ask, a moderator reviews every new thread."
          }
        />
      </Suspense>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="flex flex-col">
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="mb-8 h-4 w-72 max-w-full" />
      <BrowseControlsSkeleton />
      <ThreadListSkeleton rows={8} />
    </div>
  );
}
