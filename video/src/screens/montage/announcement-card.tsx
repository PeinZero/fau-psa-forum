import { announcement } from "../demo-data";
import { StatusPill } from "../../ui/badge";

/*
 * The head of the pinned announcement's own page (src/components/announcements/announcement-card.tsx,
 * `full`): the Pinned pill and the title, cropped above the byline so the title can be framed big.
 */

export const ANNOUNCEMENT_CARD = { width: 440, height: 164 };

export function AnnouncementCard() {
  return (
    <div className="absolute inset-0 bg-background px-8 pt-7">
      <StatusPill kind="pinned" className="mb-3" />
      <h1 className="text-display font-semibold tracking-[-0.02em] text-pretty break-words text-foreground">
        {announcement.title}
      </h1>
    </div>
  );
}
