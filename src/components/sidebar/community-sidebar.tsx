import { type ReactNode, Suspense } from "react";

import {
  AnnouncementsCard,
  CategoriesCard,
  GuidesCard,
  SidebarCardSkeleton,
  SidebarLinks,
} from "./cards";
import { SidebarSticky } from "./feed-layout";
import { WelcomeCard, WelcomeCardSkeleton } from "./welcome-card";

/** The sidebar of /browse and the category pages; `about` replaces the welcome card. */
export function CommunitySidebar({ about, currentCategory }: { about?: ReactNode; currentCategory?: string }) {
  return (
    <>
      {about ?? (
        <Suspense fallback={<WelcomeCardSkeleton />}>
          <WelcomeCard />
        </Suspense>
      )}
      <Suspense fallback={<SidebarCardSkeleton rows={3} tall />}>
        <AnnouncementsCard />
      </Suspense>
      <Suspense fallback={<SidebarCardSkeleton rows={4} tall />}>
        <GuidesCard />
      </Suspense>
      <SidebarSticky>
        <Suspense fallback={<SidebarCardSkeleton rows={6} />}>
          <CategoriesCard currentSlug={currentCategory} />
        </Suspense>
        <SidebarLinks />
      </SidebarSticky>
    </>
  );
}

export function CommunitySidebarSkeleton() {
  return (
    <>
      <WelcomeCardSkeleton />
      <SidebarCardSkeleton rows={3} tall />
      <SidebarCardSkeleton rows={4} tall />
    </>
  );
}
