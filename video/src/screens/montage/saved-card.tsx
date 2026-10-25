import { roomThread, starterThreads } from "../demo-data";
import { ThreadRow, ThreadRows } from "../thread-row";
import { SegmentedControl } from "../../ui/segmented-control";

/*
 * The member's Saved page (src/app/saved/page.tsx): page header, the Bookmarked / Following tabs and
 * the bookmarked threads, newest bookmark first; cropped inside the first thread.
 */

export const SAVED_CARD = { width: 544, height: 336 };

const tabs = [
  { value: "bookmarks", label: "Bookmarked" },
  { value: "following", label: "Following" },
] as const;

export function SavedCard() {
  return (
    <div className="absolute inset-0 bg-background px-8 pt-8">
      <h1 className="text-display font-semibold tracking-tight text-foreground">Saved</h1>
      <p className="mt-2 max-w-2xl text-body text-muted">Threads you bookmarked and conversations you follow.</p>
      <div className="mt-8 flex flex-col gap-6">
        <div>
          <SegmentedControl value="bookmarks" options={tabs} />
        </div>
        <ThreadRows>
          <ThreadRow thread={roomThread} />
          <ThreadRow thread={starterThreads[1]} />
        </ThreadRows>
      </div>
    </div>
  );
}
