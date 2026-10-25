import { Megaphone, Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";

import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { MarkAnnouncementsSeen } from "@/components/announcements/unseen-mark-seen";
import { SEARCH_MAX, searchAnnouncements } from "@/components/announcements/data";
import { Button, buttonClasses } from "@/components/ui/button";
import { cardClasses } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/field";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination, parsePage } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer, isModerator } from "@/lib/auth/viewer";

const description = "News from the PSA moderators: events, deadlines and changes to the forum.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Announcements",
    description,
    openGraph: { siteName: "PSA FAU Community Forum", title: "Announcements", description, url: "/announcements" },
  };
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function AnnouncementList({ searchParams }: Props) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, SEARCH_MAX) : "";
  const page = parsePage(params.page);
  const { announcements, total, error } = await searchAnnouncements({ q, page });

  if (error) {
    return (
      <p role="alert" className="text-body text-danger">
        Could not load the announcements. Please try again later.
      </p>
    );
  }

  if (announcements.length === 0) {
    if (q) {
      return (
        <EmptyState icon={<Search />} title="No announcements match">
          Try a different word, or clear the search to see every announcement.
        </EmptyState>
      );
    }
    return (
      <EmptyState icon={<Megaphone />} title="No announcements yet">
        News from the moderators shows up here.
      </EmptyState>
    );
  }

  return (
    <>
      <ul className="grid gap-4 sm:gap-5">
        {announcements.map((announcement, index) => (
          <li key={announcement.id} className="animate-fade-up" style={stagger(index)}>
            <AnnouncementCard announcement={announcement} variant="excerpt" />
          </li>
        ))}
      </ul>
      <Pagination path="/announcements" params={{ q }} page={page} total={total} />
    </>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-busy="true" className="grid gap-4">
      <span className="sr-only">Loading announcements…</span>
      {[0, 1].map((i) => (
        <div key={i} className={cardClasses()}>
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="mt-3 h-3 w-40" />
          <Skeleton className="mt-5 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

async function NewAnnouncementLink() {
  const viewer = await getViewer();
  if (!viewer || !isModerator(viewer.role)) return null;
  return (
    <Link href="/mod/announcements" className={buttonClasses({ variant: "primary" })}>
      <Plus aria-hidden strokeWidth={1.75} />
      New announcement
    </Link>
  );
}

async function SearchForm({ searchParams }: Props) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, SEARCH_MAX) : "";
  return (
    <Form action="/announcements" role="search" className="mb-8 grid gap-1.5">
      <Label htmlFor="announcement-search" className="sr-only">
        Search announcements
      </Label>
      <div className="flex gap-2">
        <Input
          id="announcement-search"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={SEARCH_MAX}
          placeholder="Search announcements…"
          autoComplete="off"
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary">
          <Search aria-hidden strokeWidth={1.75} />
          Search
        </Button>
      </div>
    </Form>
  );
}

export default function AnnouncementsPage({ searchParams }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Announcements"
        description={description}
        actions={
          <Suspense fallback={null}>
            <NewAnnouncementLink />
          </Suspense>
        }
      />
      <MarkAnnouncementsSeen />
      <Suspense fallback={null}>
        <SearchForm searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <AnnouncementList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
