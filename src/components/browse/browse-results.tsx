import { SearchX } from "lucide-react";
import Link from "next/link";

import { fetchBrowseCount, fetchBrowseThreads, ThreadList } from "@/components/thread/thread-list";
import { buttonClasses } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

import { browseHref, browseParams, type BrowseState } from "./params";
import { requestNow } from "@/lib/request-time";

/** One page of the ranked list with its total; reads cookies, so render inside <Suspense>. */
export async function BrowseResults({
  path,
  state,
  categoryId,
  hideCategory,
  emptyText,
  emptyDescription,
}: {
  path: string;
  state: BrowseState;
  categoryId?: number;
  hideCategory?: boolean;
  emptyText: string;
  emptyDescription: string;
}) {
  const now = await requestNow();
  const filters = {
    period: state.sort === "top" ? state.period : undefined,
    categoryId,
    city: state.city,
    q: state.q,
  };
  const [threads, total] = await Promise.all([
    fetchBrowseThreads({ ...filters, sort: state.sort, page: state.page }),
    fetchBrowseCount(filters),
  ]);
  const cleared = browseHref(path, { ...state, q: "" });

  return (
    <section aria-labelledby="results-heading" className="flex flex-col gap-3">
      <h2 id="results-heading" aria-live="polite" className="break-words text-meta text-muted">
        {total} {total === 1 ? "thread" : "threads"}
        {state.q && (
          <>
            {" "}
            matching <span className="font-medium text-foreground">“{state.q}”</span>
            <span aria-hidden className="mx-1.5 text-subtle">
              ·
            </span>
            <Link href={cleared} className="rounded-sm font-medium text-accent hover:underline">
              Clear search
            </Link>
          </>
        )}
      </h2>
      {state.q && threads.length === 0 ? (
        <ThreadList now={now}
          threads={threads}
          emptyText={`No threads match “${state.q}”`}
          emptyDescription="Try fewer words, or the German term as well as the English one."
          emptyAction={
            <Link href={cleared} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <SearchX strokeWidth={1.75} />
              Clear search
            </Link>
          }
        />
      ) : total > 0 && threads.length === 0 ? (
        <ThreadList now={now}
          threads={threads}
          emptyText="This page is empty"
          emptyDescription="The list is shorter than this page number."
          emptyAction={
            <Link href={browseHref(path, state)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Go to the first page
            </Link>
          }
        />
      ) : (
        <ThreadList now={now}
          threads={threads}
          hideCategory={hideCategory}
          emptyText={emptyText}
          emptyDescription={emptyDescription}
        />
      )}
      <Pagination path={path} params={browseParams(state)} page={state.page} total={total} className="mt-3" />
    </section>
  );
}
