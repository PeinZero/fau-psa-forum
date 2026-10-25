import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { fetchAnnouncement } from "@/components/announcements/data";
import { announcementExcerpt } from "@/components/announcements/excerpt";
import { MarkAnnouncementsSeen } from "@/components/announcements/unseen-mark-seen";
import { buttonClasses } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer, isModerator } from "@/lib/auth/viewer";

type Params = Promise<{ id: string }>;

function parseId(raw: string): number | null {
  return /^\d{1,15}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id: raw } = await params;
  const id = parseId(raw);
  const announcement = id === null ? null : await fetchAnnouncement(id);
  if (!announcement) return { title: "Announcement not found" };

  const description = announcementExcerpt(announcement.body, 160);
  return {
    title: announcement.title,
    description,
    openGraph: {
      type: "article",
      siteName: "PSA FAU Community Forum",
      title: announcement.title,
      description,
      publishedTime: announcement.created_at,
      url: `/announcements/${announcement.id}`,
    },
  };
}

export default function AnnouncementPage({ params }: { params: Params }) {
  return (
    <div className="mx-auto w-full max-w-[45rem]">
      <Link
        href="/announcements"
        className="mb-6 inline-flex min-h-9 items-center gap-1.5 rounded-md text-meta text-muted transition-colors hover:text-foreground pointer-coarse:min-h-11"
      >
        <ArrowLeft aria-hidden strokeWidth={1.75} className="size-4" />
        Announcements
      </Link>
      <MarkAnnouncementsSeen />
      <Suspense fallback={<DetailSkeleton />}>
        <AnnouncementContent params={params} />
      </Suspense>
    </div>
  );
}

async function AnnouncementContent({ params }: { params: Params }) {
  const { id: raw } = await params;
  const id = parseId(raw);
  const announcement = id === null ? null : await fetchAnnouncement(id);
  if (!announcement) notFound();

  return (
    <div className="flex flex-col gap-8">
      <AnnouncementCard announcement={announcement} variant="full" />
      <Suspense fallback={null}>
        <ModeratorActions id={announcement.id} />
      </Suspense>
    </div>
  );
}

async function ModeratorActions({ id }: { id: number }) {
  const viewer = await getViewer();
  if (!viewer || !isModerator(viewer.role)) return null;
  const href = `/mod/announcements#announcement-${id}`;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-6">
      <Link href={href} className={buttonClasses({ variant: "secondary", size: "sm" })}>
        <Pencil aria-hidden strokeWidth={1.75} />
        Edit or delete
      </Link>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading announcement…</span>
      <Skeleton className="h-8 w-2/3" />
      <div className="mt-4 flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      </div>
      <div className="mt-6 border-t border-border pt-6 sm:pt-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-3 h-4 w-11/12" />
        <Skeleton className="mt-3 h-4 w-4/5" />
      </div>
    </div>
  );
}
