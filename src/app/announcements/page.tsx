import { Megaphone } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { fetchAnnouncements } from "@/components/announcements/data";
import { cardClasses } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

const description = "News from the PSA moderators: events, deadlines and changes to the forum.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Announcements",
    description,
    openGraph: { siteName: "FAU PSA Forum", title: "Announcements", description, url: "/announcements" },
  };
}

async function AnnouncementList() {
  const { announcements, error } = await fetchAnnouncements();

  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Could not load the announcements. Please try again later.
      </p>
    );
  }

  if (announcements.length === 0) {
    return (
      <EmptyState icon={<Megaphone />} title="No announcements yet">
        News from the moderators shows up here.
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-4">
      {announcements.map((announcement, index) => (
        <li key={announcement.id} className="animate-fade-up" style={stagger(index)}>
          <AnnouncementCard announcement={announcement} />
        </li>
      ))}
    </ul>
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

export default function AnnouncementsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader title="Announcements" description={description} />
      <Suspense fallback={<ListSkeleton />}>
        <AnnouncementList />
      </Suspense>
    </div>
  );
}
