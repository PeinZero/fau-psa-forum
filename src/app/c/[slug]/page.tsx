import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  fetchCategories,
  fetchThreadList,
  ThreadList,
  ThreadListSkeleton,
} from "@/components/thread/thread-list";

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
    <Suspense fallback={<ThreadListSkeleton />}>
      <CategoryContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const cityFilters = [
  { value: undefined, label: "All cities" },
  { value: "erlangen", label: "Erlangen" },
  { value: "nuremberg", label: "Nuremberg" },
] as const;

async function CategoryContent({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = (await fetchCategories()).find((c) => c.slug === slug);
  if (!category) notFound();

  const city = query.city === "erlangen" || query.city === "nuremberg" ? query.city : undefined;
  const threads = await fetchThreadList({ categoryId: category.id, city });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{category.name}</h1>
        {category.description && <p className="text-muted">{category.description}</p>}
      </header>

      <nav aria-label="Filter by city">
        <ul className="flex flex-wrap gap-2">
          {cityFilters.map((filter) => {
            const active = filter.value === city;
            return (
              <li key={filter.label}>
                <Link
                  href={filter.value ? `/c/${slug}?city=${filter.value}` : `/c/${slug}`}
                  aria-current={active ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full border px-4 ${
                    active
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border hover:bg-border/40"
                  }`}
                >
                  {filter.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-labelledby="threads-heading" className="flex flex-col gap-3">
        <h2 id="threads-heading" className="sr-only">
          Threads
        </h2>
        <ThreadList threads={threads} emptyText="No threads in this category yet." />
      </section>
    </div>
  );
}
