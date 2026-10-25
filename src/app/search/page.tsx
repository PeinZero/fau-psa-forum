import { CircleCheck, MessageSquare, PenLine, Search, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Highlight } from "@/components/command/highlight";
import { SEARCH_QUERY_MAX } from "@/components/command/types";
import { CategoryGlyph } from "@/components/thread/category-icon";
import { ThreadListSkeleton } from "@/components/thread/thread-list";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { fieldClasses } from "@/components/ui/field";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { PAGE_SIZE, Pagination, parsePage } from "@/components/ui/pagination";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import type { Enums } from "@/lib/supabase/database.types";
import { cityLabels, countLabel, formatDate } from "@/lib/labels";
import { relativeTime } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";

import { SearchFilters } from "./search-filters";
import { parseSearchState, searchHref, searchParamsOf, sortTabs, type SearchFilterState } from "./search-state";
import { bodySnippet } from "./snippet";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <PageHeader title="Search" description="Search thread titles, questions and answers." />
      <Suspense fallback={<ThreadListSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function SearchForm({ state }: { state: SearchFilterState }) {
  return (
    <Form action="/search" role="search" aria-label="Search threads" className="mb-3 flex gap-2">
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
          className={cn(fieldClasses, "min-h-11 rounded-lg pl-11 text-base sm:text-base")}
        />
      </div>
      <Button type="submit" variant="secondary" className="min-h-11 rounded-lg">
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

// The database keeps the older name for date order.
const dbSort = { relevance: "relevance", hot: "hot", top: "top", new: "newest" } as const;

const resultSelect = `id, slug, title, body, city, created_at, score, comment_count, best_comment_id,
  category:categories!threads_category_id_fkey(slug, name),
  author:profiles!threads_author_id_fkey(display_name)`;

type ResultThread = {
  id: number;
  slug: string;
  title: string;
  body: string;
  city: Enums<"city"> | null;
  created_at: string;
  score: number;
  comment_count: number;
  best_comment_id: number | null;
  category: { slug: string; name: string } | null;
  author: { display_name: string } | null;
};

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const supabase = await createClient();
  const { data: categoryRows } = await supabase.from("categories").select("id, slug, name").order("sort_order");
  const categories = categoryRows ?? [];

  const state = parseSearchState(
    raw,
    categories.map((row) => row.slug),
  );
  const category = categories.find((row) => row.slug === state.category);
  const page = parsePage(raw.page);
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

  // PostgREST pages over the function's ordered rows and counts the full match set in the same
  // statement, so only one page of bodies leaves the database.
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await supabase
    .rpc(
      "search_threads_v2",
      {
        q: state.q,
        p_category_id: category?.id,
        p_city: state.city === "all" ? undefined : state.city,
        p_has_best_answer: state.bestAnswer || undefined,
        p_verified: state.verified || undefined,
        p_sort: dbSort[state.sort],
      },
      { count: "exact" },
    )
    .select(resultSelect)
    .range(from, from + PAGE_SIZE - 1)
    .overrideTypes<ResultThread[], { merge: false }>();
  // A page past the end (an old link after threads were archived) starts over at page 1.
  if (error?.code === "PGRST103") redirect(searchHref(state));
  if (error) throw error;
  const threads = data ?? [];
  const total = count ?? threads.length;

  return (
    <>
      {form}
      <section aria-labelledby="results-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h2 id="results-heading" aria-live="polite" className="min-w-0 break-words text-body text-muted">
            {total} {total === 1 ? "result" : "results"} for{" "}
            <span className="font-medium text-foreground">“{state.q}”</span>
          </h2>
          <SegmentedLinks
            label="Sort results"
            className="max-w-full overflow-x-auto"
            items={sortTabs.map((tab) => ({
              href: searchHref({ ...state, sort: tab.value }),
              label: tab.label,
              current: tab.value === state.sort,
            }))}
          />
        </div>
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
              <li>Check the spelling; close matches in titles count too.</li>
            </ul>
          </EmptyState>
        ) : (
          <ul className="-mx-3 flex flex-col divide-y divide-border sm:-mx-4">
            {threads.map((thread, i) => (
              <ResultRow key={thread.id} thread={thread} query={state.q} index={i} />
            ))}
          </ul>
        )}
        <Pagination path="/search" params={searchParamsOf(state)} page={page} total={total} className="mt-3" />
      </section>
    </>
  );
}

/** Server components render once per request, so reading the clock here cannot drift between renders. */
function sinceNow(iso: string): string {
  return relativeTime(iso, Date.now());
}

function Dot() {
  return (
    <span aria-hidden className="shrink-0 text-subtle">
      ·
    </span>
  );
}

function ResultRow({ thread, query, index }: { thread: ResultThread; query: string; index: number }) {
  const snippet = bodySnippet(thread.body, query);
  const author = thread.author?.display_name ?? "Deleted user";
  return (
    <li
      className={cn(
        "animate-fade-up group relative flex gap-4 rounded-lg px-3 py-4 transition-colors duration-150 ease-out hover:bg-surface-hover sm:px-4",
        "has-[.row-link:focus-visible]:outline-2 has-[.row-link:focus-visible]:-outline-offset-2 has-[.row-link:focus-visible]:outline-ring",
      )}
      style={stagger(index)}
    >
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 overflow-hidden text-meta text-muted">
          {thread.category && (
            <>
              <Link
                href={`/c/${thread.category.slug}`}
                className="relative z-10 inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-sm font-medium text-foreground/85 transition-colors hover:text-accent"
              >
                <CategoryGlyph slug={thread.category.slug} className="size-3.5" />
                {thread.category.name}
              </Link>
              <Dot />
            </>
          )}
          {thread.city && (
            <span className="flex min-w-0 shrink items-center gap-1.5 max-[399px]:hidden">
              <span className="truncate">{cityLabels[thread.city]}</span>
              <Dot />
            </span>
          )}
          <span className="min-w-0 truncate" title={author}>
            {author}
          </span>
          <Dot />
          <time dateTime={thread.created_at} title={formatDate(thread.created_at)} className="shrink-0 whitespace-nowrap">
            {sinceNow(thread.created_at)}
          </time>
        </p>
        <h3 className="mt-1 line-clamp-3 text-title font-semibold text-pretty break-words text-foreground sm:line-clamp-2">
          <Link
            href={`/t/${thread.slug}`}
            className="row-link rounded-sm after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
          >
            <Highlight text={thread.title} query={query} />
          </Link>
        </h3>
        {snippet && (
          <p className="mt-1 line-clamp-2 text-body break-words text-muted">
            <Highlight text={snippet.text} query={query} />
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-meta text-muted">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <MessageSquare aria-hidden strokeWidth={1.75} className="size-4 text-subtle" />
            {countLabel(thread.comment_count, "comment")}
          </span>
          {thread.best_comment_id !== null && (
            <Badge variant="accent">
              <CircleCheck aria-hidden strokeWidth={1.75} />
              Answered
            </Badge>
          )}
        </div>
      </div>
    </li>
  );
}
