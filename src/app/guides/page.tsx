import { ListChecks, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { fetchGuideSummaries } from "@/components/guides/data";
import { GuideCard } from "@/components/guides/guide-card";
import { buttonClasses } from "@/components/ui/button";
import { cardClasses } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getEffectiveViewer, isModerator } from "@/lib/auth/viewer";

const description = "Step-by-step checklists for arriving in Erlangen and Nuremberg, curated by the PSA moderators.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Guides",
    description,
    openGraph: { siteName: "PSA FAU Community Forum", title: "Guides", description, url: "/guides" },
  };
}

const grid = "grid gap-3 sm:grid-cols-2";

async function GuideList() {
  const { guides, error } = await fetchGuideSummaries();

  if (error) {
    return (
      <p role="alert" className="text-body text-danger">
        Could not load the guides. Please try again later.
      </p>
    );
  }

  if (guides.length === 0) {
    const viewer = await getEffectiveViewer();
    return (
      <EmptyState
        icon={<ListChecks />}
        title="No guides yet"
        action={
          viewer && isModerator(viewer.role) ? (
            <Link href="/mod/guides/new" className={buttonClasses({ variant: "primary" })}>
              <Plus aria-hidden strokeWidth={1.75} />
              Create the first guide
            </Link>
          ) : undefined
        }
      >
        Step-by-step guides from the moderators show up here.
      </EmptyState>
    );
  }

  return (
    <ul className={grid}>
      {guides.map((guide, index) => (
        <li key={guide.id} className="animate-fade-up" style={stagger(index)}>
          <GuideCard guide={guide} />
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div role="status" aria-busy="true" className={grid}>
      <span className="sr-only">Loading guides…</span>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={cardClasses({ className: "flex gap-3" })}>
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3.5 w-full" />
            <Skeleton className="mt-5 h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function ManageLink() {
  const viewer = await getEffectiveViewer();
  if (!viewer || !isModerator(viewer.role)) return null;
  return (
    <div className="flex gap-2">
      <Link href="/mod/guides" className={buttonClasses({ variant: "ghost" })}>
        Manage
      </Link>
      <Link href="/mod/guides/new" className={buttonClasses({ variant: "primary" })}>
        <Plus aria-hidden strokeWidth={1.75} />
        New guide
      </Link>
    </div>
  );
}

export default function GuidesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Guides"
        description={description}
        actions={
          <Suspense fallback={null}>
            <ManageLink />
          </Suspense>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <GuideList />
      </Suspense>
    </div>
  );
}
