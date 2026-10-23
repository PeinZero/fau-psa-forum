import Link from "next/link";
import { Suspense } from "react";

import {
  fetchCategories,
  fetchThreadList,
  ThreadList,
  ThreadListSkeleton,
} from "@/components/thread/thread-list";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to the FAU PSA Forum
        </h1>
        <p className="text-muted">
          Moderator-curated threads for Pakistani students, graduates, postgrads
          and residents around FAU Erlangen-Nürnberg: residence permit and visa
          questions, course reviews, and first steps in Erlangen and Nuremberg.
        </p>
        <Link
          href="/new"
          className="inline-flex min-h-11 w-fit items-center rounded-lg bg-accent px-4 font-medium text-accent-foreground"
        >
          Ask a question
        </Link>
      </section>

      <section aria-labelledby="categories-heading" className="flex flex-col gap-3">
        <h2 id="categories-heading" className="text-xl font-semibold">
          Categories
        </h2>
        <Suspense fallback={<p className="text-muted">Loading categories...</p>}>
          <Categories />
        </Suspense>
      </section>

      <section aria-labelledby="threads-heading" className="flex flex-col gap-3">
        <h2 id="threads-heading" className="text-xl font-semibold">
          Latest threads
        </h2>
        <Suspense fallback={<ThreadListSkeleton />}>
          <LatestThreads />
        </Suspense>
      </section>
    </div>
  );
}

async function Categories() {
  const categories = await fetchCategories();
  return (
    <ul className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <li key={category.id}>
          <Link
            href={`/c/${category.slug}`}
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 hover:bg-border/40"
          >
            {category.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function LatestThreads() {
  const threads = await fetchThreadList({});
  return <ThreadList threads={threads} emptyText="No threads yet." />;
}
