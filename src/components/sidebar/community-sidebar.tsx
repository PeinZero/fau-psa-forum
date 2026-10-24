import { type ReactNode, Suspense } from "react";

import {
  AboutCard,
  AnnouncementsCard,
  CategoriesCard,
  GuidesCard,
  SidebarCardSkeleton,
  SidebarLinks,
} from "./cards";
import { SidebarSticky } from "./feed-layout";

/** The sidebar of /browse and the category pages; a category page passes its own about card. */
export function CommunitySidebar({ about, currentCategory }: { about?: ReactNode; currentCategory?: string }) {
  return (
    <>
      {about ?? <AboutCard />}
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
      <SidebarCardSkeleton rows={2} />
      <SidebarCardSkeleton rows={3} tall />
      <SidebarCardSkeleton rows={4} tall />
    </>
  );
}
