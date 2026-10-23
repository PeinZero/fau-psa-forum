import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PenLine } from "lucide-react";
import { Suspense } from "react";

import { CategoryIcon } from "@/components/thread/category-icon";
import {
  fetchCategories,
  fetchThreadList,
  ThreadList,
  ThreadListSkeleton,
} from "@/components/thread/thread-list";
import { buttonClasses } from "@/components/ui/button";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cityLabels } from "@/lib/labels";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
type Props = { params: Params; searchParams: SearchParams };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await fetchCategories()).find((c) => c.slug === slug);
  if (!category) return {};
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

const cityFilters = [
  { value: undefined, label: "All" },
  { value: "erlangen", label: cityLabels.erlangen },
  { value: "nuremberg", label: cityLabels.nuremberg },
] as const;

async function CategoryContent({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = (await fetchCategories()).find((c) => c.slug === slug);
  if (!category) notFound();

  const city = query.city === "erlangen" || query.city === "nuremberg" ? query.city : undefined;
  const threads = await fetchThreadList({ categoryId: category.id, city });

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

      <SegmentedLinks
        label="Filter by city"
        className="mb-4"
        items={cityFilters.map((filter) => ({
          href: filter.value ? `/c/${slug}?city=${filter.value}` : `/c/${slug}`,
          label: filter.label,
          current: filter.value === city,
        }))}
      />

      <section aria-labelledby="threads-heading">
        <h2 id="threads-heading" className="sr-only">
          Threads
        </h2>
        <ThreadList
          threads={threads}
          emptyText={city ? `No threads for ${cityLabels[city]} yet` : "No threads in this category yet"}
          emptyDescription={
            city
              ? "Try all cities, or ask the first question for this city."
              : "Be the first to ask, a moderator reviews every new thread."
          }
        />
      </section>
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
      <Skeleton className="mb-4 h-9 w-56 rounded-lg" />
      <ThreadListSkeleton />
    </div>
  );
}
