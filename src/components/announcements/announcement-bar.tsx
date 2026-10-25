import { fetchLatestAnnouncements } from "@/components/sidebar/data";

import { AnnouncementBarClient } from "./announcement-bar-client";
import { dismissedScript } from "./announcement-bar-storage";
import { announcementHref } from "./data";

/** Pinned first, else newest. Reads cookies, so mount inside `<Suspense fallback={null}>`. */
export async function AnnouncementBar() {
  const { items } = await fetchLatestAnnouncements();
  const lead = items[0];
  if (!lead) return null;
  return (
    <>
      <AnnouncementBarClient id={lead.id} href={announcementHref(lead.id)} title={lead.title} isPinned={lead.is_pinned} />
      <script dangerouslySetInnerHTML={{ __html: dismissedScript(lead.id) }} />
    </>
  );
}
