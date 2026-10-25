import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { ModGate } from "@/components/mod/mod-gate";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

export default function ModLayout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      <PageHeader title="Moderation" description="Review what members send in, and keep the forum tidy." className="mb-6 sm:mb-8" />
      <Suspense
        fallback={
          <div className="grid gap-3" aria-busy>
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        }
      >
        <ModGate>{children}</ModGate>
      </Suspense>
    </div>
  );
}
