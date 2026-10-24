import { FileText, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";

import { SignInPrompt } from "@/components/sign-in-prompt";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, cardClasses } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { PAGE_SIZE, Pagination, parsePage } from "@/components/ui/pagination";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserId } from "@/lib/auth/viewer";
import { formatDate, statusLabels } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "My threads", robots: { index: false } };

type Status = Enums<"thread_status">;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PATH = "/me/threads";
const QUERY_MAX = 100;

const statuses: readonly Status[] = ["published", "pending", "rejected", "archived"];

const statusVariant: Record<Status, BadgeVariant> = {
  pending: "warning",
  published: "accent",
  rejected: "danger",
  archived: "neutral",
};

type Filters = { q: string; status: Status | null; page: number };

function readFilters(params: Awaited<SearchParams>): Filters {
  const q = typeof params.q === "string" ? params.q.trim().slice(0, QUERY_MAX) : "";
  const status = statuses.find((s) => s === params.status) ?? null;
  return { q, status, page: parsePage(params.page) };
}

function hrefFor(q: string, status: Status | null): string {
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status) query.set("status", status);
  const qs = query.toString();
  return qs ? `${PATH}?${qs}` : PATH;
}

function StatusTabs({ q, current }: { q: string; current: Status | null | undefined }) {
  return (
    <SegmentedLinks
      label="Filter by status"
      // Five labels don't fit at 360px, so the bar scrolls sideways instead of wrapping.
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [&>ul]:max-w-none"
      items={[null, ...statuses].map((status) => ({
        href: hrefFor(q, status),
        label: status ? statusLabels[status] : "All",
        current: current !== undefined && status === current,
      }))}
    />
  );
}

function SearchBox({ q, status }: { q: string; status: Status | null }) {
  return (
    <Form action={PATH} role="search" className="flex gap-2">
      <label htmlFor="my-threads-search" className="sr-only">
        Search your threads by title
      </label>
      <Input
        id="my-threads-search"
        name="q"
        type="search"
        defaultValue={q}
        maxLength={QUERY_MAX}
        placeholder="Search by title…"
        className="min-w-0 flex-1"
      />
      {status && <input type="hidden" name="status" value={status} />}
      <Button type="submit" variant="secondary">
        <Search aria-hidden strokeWidth={1.75} />
        <span className="max-[399px]:sr-only">Search</span>
      </Button>
    </Form>
  );
}

async function Controls({ searchParams }: { searchParams: SearchParams }) {
  const { q, status } = readFilters(await searchParams);
  return (
    <>
      <SearchBox q={q} status={status} />
      <StatusTabs q={q} current={status} />
    </>
  );
}

async function ThreadRows({ searchParams }: { searchParams: SearchParams }) {
  const [params, userId] = await Promise.all([searchParams, getUserId()]);
  if (!userId) {
    return (
      <Card className="text-sm">
        <SignInPrompt next={PATH} purpose="to see the threads you posted." />
      </Card>
    );
  }

  const { q, status, page } = readFilters(params);
  const supabase = await createClient();
  let query = supabase
    .from("threads")
    .select("id, slug, title, status, rejection_reason, created_at", { count: "exact" })
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  // Escape LIKE wildcards so the search is a plain substring match.
  if (q) query = query.ilike("title", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  const { data: threads, count, error } = await query;

  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Could not load your threads. Please try again later.
      </p>
    );
  }

  const total = count ?? 0;
  if (total === 0) {
    const filtered = Boolean(q || status);
    return (
      <EmptyState
        icon={filtered ? <Search /> : <FileText />}
        title={filtered ? "No threads match" : "You have not posted any threads yet"}
        action={
          filtered ? (
            <Link href={PATH} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Clear filters
            </Link>
          ) : (
            <Link href="/new" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <Plus aria-hidden strokeWidth={1.75} />
              New thread
            </Link>
          )
        }
      >
        {filtered ? "Try a different title or status." : "Questions you ask show up here with their review status."}
      </EmptyState>
    );
  }

  return (
    <>
      <ul className={cardClasses({ padding: "none", className: "divide-y divide-border overflow-hidden" })}>
        {threads.map((t, index) => (
          <li key={t.id} className="animate-fade-up" style={stagger(index)}>
            <Link
              href={`/t/${t.slug}`}
              className="block px-4 py-3 transition-colors duration-150 hover:bg-surface-hover focus-visible:-outline-offset-2 sm:px-5"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0 break-words text-sm font-medium text-foreground">{t.title}</span>
                <Badge variant={statusVariant[t.status]} className="mt-0.5 shrink-0">
                  {statusLabels[t.status]}
                </Badge>
              </span>
              <time dateTime={t.created_at} className="mt-0.5 block text-meta text-muted">
                {formatDate(t.created_at)}
              </time>
              {t.status === "rejected" && t.rejection_reason && (
                <span className="mt-1 block break-words text-meta text-danger">Reason: {t.rejection_reason}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <Pagination path={PATH} params={{ q: q || undefined, status: status ?? undefined }} page={page} total={total} />
    </>
  );
}

function RowsSkeleton() {
  return (
    <div role="status" aria-busy="true" className={cardClasses({ padding: "none", className: "divide-y divide-border" })}>
      <span className="sr-only">Loading your threads…</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="px-4 py-3 sm:px-5">
          <Skeleton className={i % 2 ? "h-4 w-2/3" : "h-4 w-4/5"} />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function MyThreadsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="My threads"
        description="Everything you posted, including threads waiting for review."
        actions={
          <Link href="/new" className={buttonClasses({ variant: "primary" })}>
            <Plus aria-hidden strokeWidth={1.75} />
            New thread
          </Link>
        }
      />
      <div className="flex flex-col gap-4">
        <Suspense
          fallback={
            <>
              <SearchBox q="" status={null} />
              <StatusTabs q="" current={undefined} />
            </>
          }
        >
          <Controls searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<RowsSkeleton />}>
          <ThreadRows searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
