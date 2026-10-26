"use client";

import { Bell, Bookmark, FileClock, Flag, FolderInput, Link2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { BookmarkButton, FollowingIndicator } from "@/components/bookmarks/bookmark-button";
import type { SavedState } from "@/components/bookmarks/data";
import { useSavedState } from "@/components/bookmarks/use-saved-state";
import type { MutableAuthor } from "@/components/mod/mute-author";
import { type ModThread, threadModItems } from "@/components/mod/thread-mod-panel";
import { ReportDialog } from "@/components/report/report-dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import type { ReasonPreset } from "@/components/ui/reason-field";
import { RequestUpdateDialog } from "@/components/update-requests/request-update-dialog";
import { deleteOwnThread } from "@/components/write/delete-own-thread";

import { MenuFeedback, useMenuAction } from "./menu-action";

const DELETE_LABEL = "Delete thread";
const SIGNED_OUT: SavedState = { bookmarked: false, following: false };

export function ThreadMenu({
  thread,
  slug,
  saved,
  canEdit = false,
  canMove = false,
  canDelete = false,
  canReport = false,
  canRequestUpdate = false,
  isMod = false,
  presets,
  author,
}: {
  thread: ModThread;
  slug: string;
  /** The viewer's bookmark and follow state; absent for visitors who are not signed in. */
  saved?: SavedState;
  canEdit?: boolean;
  /** Moderators can only move someone else's thread; the author edits it. */
  canMove?: boolean;
  /** The author may withdraw a thread until a moderator has approved it. */
  canDelete?: boolean;
  canReport?: boolean;
  canRequestUpdate?: boolean;
  isMod?: boolean;
  /** Canned rejection reasons, for moderators reviewing a pending thread. */
  presets?: readonly ReasonPreset[];
  /** The author, when the moderating viewer may mute them. */
  author?: MutableAuthor | null;
}) {
  const { pending, feedback, setFeedback, run, copyLink } = useMenuAction();
  const savedState = useSavedState(thread.id, saved ?? SIGNED_OUT, setFeedback);
  const [reporting, setReporting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { bookmarked, following } = savedState.state;
  const deletable = canDelete && (thread.status === "pending" || thread.status === "rejected");
  // A moderator who is also the author deletes without a reason, so the moderator entry steps aside.
  const modItems = isMod ? threadModItems(thread, run, { presets, author, ownDelete: deletable }) : [];

  return (
    <div className="-my-1.5 -mr-2 flex items-center gap-1 pointer-coarse:-my-3">
      <MenuFeedback feedback={feedback} />
      {saved && following && <FollowingIndicator />}
      {saved && <BookmarkButton bookmarked={bookmarked} onToggle={() => savedState.toggle("bookmarked")} />}
      <DropdownMenu
        label="Thread actions"
        busy={pending}
        items={[
          canEdit && { label: "Edit", icon: Pencil, href: `/t/${slug}/edit` },
          !canEdit && canMove && { label: "Move", icon: FolderInput, href: `/t/${slug}/edit` },
          { label: "Copy link", icon: Link2, onSelect: () => copyLink(`/t/${slug}`) },
          saved && { label: "Bookmark", icon: Bookmark, checked: bookmarked, onSelect: () => savedState.toggle("bookmarked") },
          saved && { label: "Follow thread", icon: Bell, checked: following, onSelect: () => savedState.toggle("following") },
          "separator",
          canRequestUpdate && { label: "Request an update", icon: FileClock, onSelect: () => setRequesting(true) },
          canReport && { label: "Report", icon: Flag, onSelect: () => setReporting(true) },
          "separator",
          ...modItems,
          deletable && "separator",
          deletable && {
            label: DELETE_LABEL,
            icon: Trash2,
            danger: true,
            confirm: { message: "Your thread and its images are deleted for good.", action: DELETE_LABEL },
            onSelect: () => run(deleteOwnThread, { threadId: thread.id }),
          },
        ]}
      />
      {canReport && (
        <ReportDialog target={{ threadId: thread.id }} subject="thread" open={reporting} onClose={() => setReporting(false)} />
      )}
      {canRequestUpdate && (
        <RequestUpdateDialog threadId={thread.id} open={requesting} onClose={() => setRequesting(false)} />
      )}
    </div>
  );
}
