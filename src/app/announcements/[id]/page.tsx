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
import { cardClasses } from "@/components/ui/card";
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
    <div className="mx-auto w-full max-w-3xl">
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
    <div className="grid gap-4">
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
    <div className="flex flex-wrap gap-2">
      <Link href={href} className={buttonClasses({ variant: "secondary" })}>
        <Pencil aria-hidden strokeWidth={1.75} />
        Edit
      </Link>
      <Link href={href} className={buttonClasses({ variant: "danger" })}>
        Delete
      </Link>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" className={cardClasses()}>
      <span className="sr-only">Loading announcement…</span>
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="mt-3 h-3 w-40" />
      <Skeleton className="mt-5 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-4/5" />
    </div>
  );
}
