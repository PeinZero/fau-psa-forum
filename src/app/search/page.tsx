import { PenLine, Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";

import {
  fetchThreadsByIds,
  ThreadList,
  ThreadListSkeleton,
} from "@/components/thread/thread-list";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldClasses } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/components/ui/cn";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <PageHeader title="Search" description="Search thread titles, questions and answers." />
      <Suspense
        fallback={
          <>
            <SearchForm query="" />
            <ThreadListSkeleton />
          </>
        }
      >
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function SearchForm({ query }: { query: string }) {
  return (
    <Form action="/search" role="search" aria-label="Search threads" className="mb-8 flex gap-2">
      <label htmlFor="search-q" className="sr-only">
        Search threads
      </label>
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-subtle"
        />
        <input
          id="search-q"
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Anmeldung, blocked account, halal food…"
          autoComplete="off"
          enterKeyHint="search"
          className={cn(fieldClasses, "min-h-12 rounded-lg pl-11 text-base sm:text-base")}
        />
      </div>
      <Button type="submit" variant="secondary" className="min-h-12 rounded-lg pointer-coarse:min-h-12">
        Search
      </Button>
    </Form>
  );
}

const tips = (
  <ul className="mt-1 flex flex-col gap-1">
    <li>Use one or two keywords, e.g. “Anmeldung” or “WG”.</li>
    <li>Try the German term as well as the English one.</li>
  </ul>
);

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  if (!query) {
    return (
      <>
        <SearchForm query="" />
        <EmptyState icon={<Search />} title="Search the forum">
          {tips}
        </EmptyState>
      </>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("search_threads", { q: query });
  const threads = await fetchThreadsByIds((data ?? []).map((row) => row.id));

  return (
    <>
      <SearchForm query={query} />
      <section aria-labelledby="results-heading" className="flex flex-col gap-3">
        <h2 id="results-heading" className="break-words text-meta text-muted">
          {threads.length} {threads.length === 1 ? "result" : "results"} for{" "}
          <span className="font-medium text-foreground">“{query}”</span>
        </h2>
        {threads.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title="No threads match your search"
            action={
              <Link href="/new" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                <PenLine strokeWidth={1.75} />
                Ask a question
              </Link>
            }
          >
            {tips}
          </EmptyState>
        ) : (
          <ThreadList threads={threads} emptyText="No threads match your search" />
        )}
      </section>
    </>
  );
}
