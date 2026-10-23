import type { Metadata } from "next";
import { Suspense } from "react";

import {
  fetchThreadsByIds,
  ThreadList,
  ThreadListSkeleton,
} from "@/components/thread/thread-list";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
      <Suspense fallback={<ThreadListSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim() ?? "";

  if (!query) {
    return <p className="text-muted">Type a question or keyword in the search box to find threads.</p>;
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("search_threads", { q: query });
  const threads = await fetchThreadsByIds((data ?? []).map((row) => row.id));

  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-3">
      <h2 id="results-heading" className="break-words text-muted">
        {threads.length} {threads.length === 1 ? "result" : "results"} for “{query}”
      </h2>
      <ThreadList threads={threads} emptyText="No threads match your search." />
    </section>
  );
}
