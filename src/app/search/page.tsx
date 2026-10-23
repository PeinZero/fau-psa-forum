import { MapPin, MessageSquare, PenLine, Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";

import { Highlight } from "@/components/command/highlight";
import { SEARCH_QUERY_MAX } from "@/components/command/types";
import { fetchThreadsByIds, ThreadListSkeleton } from "@/components/thread/thread-list";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { cardClasses } from "@/components/ui/card";
import { stagger } from "@/components/ui/motion";
import { cityLabels, formatDate } from "@/lib/labels";
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
            <ThreadListSkeleton />
          </>
        }
      >
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

import { bodySnippet } from "./snippet";
import {
  SearchFilters,
  searchHref,
  type SearchCity,
  type SearchFilterState,
  type SearchSort,
} from "./search-filters";

function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function SearchForm({ state }: { state: SearchFilterState }) {
  return (
    <Form action="/search" role="search" aria-label="Search threads" className="mb-4 flex gap-2">
      {state.category && <input type="hidden" name="category" value={state.category} />}
      {state.city !== "all" && <input type="hidden" name="city" value={state.city} />}
      {state.bestAnswer && <input type="hidden" name="best" value="1" />}
      {state.verified && <input type="hidden" name="verified" value="1" />}
      {state.sort !== "relevance" && <input type="hidden" name="sort" value={state.sort} />}
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
          defaultValue={state.q}
          maxLength={SEARCH_QUERY_MAX}
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
  const raw = await searchParams;
  const supabase = await createClient();
  const { data: categoryRows } = await supabase.from("categories").select("id, slug, name").order("sort_order");
  const categories = categoryRows ?? [];

  const categorySlug = param(raw.category);
  const category = categories.find((row) => row.slug === categorySlug);
  const cityParam = param(raw.city);
  const sortParam = param(raw.sort);
  const state: SearchFilterState = {
    q: param(raw.q).slice(0, SEARCH_QUERY_MAX).trim(),
    category: category?.slug ?? "",
    city: cityParam === "erlangen" || cityParam === "nuremberg" ? (cityParam as SearchCity) : "all",
    bestAnswer: param(raw.best) === "1",
    verified: param(raw.verified) === "1",
    sort: sortParam === "newest" || sortParam === "top" ? (sortParam as SearchSort) : "relevance",
  };
  const filtered = Boolean(state.category) || state.city !== "all" || state.bestAnswer || state.verified;

  const form = (
    <>
      <SearchForm state={state} />
      <SearchFilters state={state} categories={categories} />
    </>
  );

  if (!state.q) {
    return (
      <>
        {form}
        <EmptyState icon={<Search />} title="Search the forum">
          {tips}
        </EmptyState>
      </>
    );
  }

  const { data } = await supabase.rpc("search_threads_v2", {
    q: state.q,
    p_category_id: category?.id,
    p_city: state.city === "all" ? undefined : state.city,
    p_has_best_answer: state.bestAnswer || undefined,
    p_verified: state.verified || undefined,
    p_sort: state.sort,
  });
  const rows = data ?? [];
  const bodies = new Map(rows.map((row) => [row.id, row.body]));
  const threads = await fetchThreadsByIds(rows.map((row) => row.id));

  return (
    <>
      {form}
      <section aria-labelledby="results-heading" className="flex flex-col gap-3">
        <h2 id="results-heading" aria-live="polite" className="break-words text-meta text-muted">
          {threads.length} {threads.length === 1 ? "result" : "results"} for{" "}
          <span className="font-medium text-foreground">“{state.q}”</span>
        </h2>
        {threads.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title="No threads match your search"
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {filtered && (
                  <Link
                    href={searchHref({ ...state, category: "", city: "all", bestAnswer: false, verified: false })}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    Remove filters
                  </Link>
                )}
                <Link href="/new" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                  <PenLine strokeWidth={1.75} />
                  Ask a question
                </Link>
              </div>
            }
          >
            <ul className="mt-1 flex flex-col gap-1">
              <li>Try fewer words, e.g. “Anmeldung” or “WG”.</li>
              {filtered && <li>Remove filters to widen the search.</li>}
              <li>Try the German term as well as the English one.</li>
            </ul>
          </EmptyState>
        ) : (
          <ul className={cardClasses({ padding: "none", className: "overflow-hidden divide-y divide-border" })}>
            {threads.map((thread, i) => (
              <ResultRow key={thread.id} thread={thread} body={bodies.get(thread.id) ?? ""} query={state.q} index={i} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ResultRow({
  thread,
  body,
  query,
  index,
}: {
  thread: Awaited<ReturnType<typeof fetchThreadsByIds>>[number];
  body: string;
  query: string;
  index: number;
}) {
  const commentCount = thread.comments[0]?.count ?? 0;
  const snippet = bodySnippet(body, query);
  return (
    <li className="animate-fade-up" style={stagger(index)}>
      <Link
        href={`/t/${thread.slug}`}
        className="group flex items-start gap-3 px-4 py-3.5 transition-colors duration-150 ease-out hover:bg-surface-hover focus-visible:-outline-offset-2 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-[15px] font-medium leading-snug text-foreground">
            <Highlight text={thread.title} query={query} />
          </h3>
          {snippet && (
            <p className="mt-1 line-clamp-2 break-words text-meta text-muted">
              <Highlight text={snippet.text} query={query} />
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-meta text-muted">
            {thread.category && <Badge>{thread.category.name}</Badge>}
            {thread.city && (
              <Badge>
                <MapPin aria-hidden strokeWidth={1.75} />
                {cityLabels[thread.city]}
              </Badge>
            )}
            <span className="truncate">{thread.author?.display_name ?? "Deleted user"}</span>
            <span aria-hidden className="text-subtle">·</span>
            <time dateTime={thread.created_at} className="whitespace-nowrap">
              {formatDate(thread.created_at)}
            </time>
          </div>
        </div>
        <span
          className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-meta tabular-nums text-subtle transition-colors group-hover:text-muted"
          aria-label={`${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
        >
          <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5" />
          {commentCount}
        </span>
      </Link>
    </li>
  );
}
