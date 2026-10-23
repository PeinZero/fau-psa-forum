import { Archive, ArchiveRestore, CircleCheck, CircleX, Pin, PinOff, ShieldCheck, TriangleAlert } from "lucide-react";

import type { RunAction } from "@/components/thread/menu-action";
import type { MenuEntry } from "@/components/ui/dropdown-menu";

import { markThreadVerified, moderateThread } from "./actions";

export type ModThread = {
  id: number;
  status: "pending" | "published" | "rejected" | "archived";
  is_outdated: boolean;
  is_pinned: boolean;
};

/** Moderator entries of the thread menu. */
export function threadModItems({ id, status, is_outdated, is_pinned }: ModThread, run: RunAction): MenuEntry[] {
  const isLive = status === "published" || status === "archived";
  const op = (name: string, reason?: string) => run(moderateThread, { threadId: id, op: name, reason });

  return [
    (status === "pending" || status === "rejected") && {
      label: "Approve",
      icon: CircleCheck,
      onSelect: () => op("approve"),
    },
    status === "pending" && {
      label: "Reject",
      icon: CircleX,
      danger: true,
      confirm: {
        message: "The author sees this reason.",
        action: "Reject thread",
        reason: { label: "Reason for rejection", max: 1000 },
      },
      onSelect: ({ reason }) => op("reject", reason),
    },
    isLive && {
      label: is_pinned ? "Unpin" : "Pin",
      icon: is_pinned ? PinOff : Pin,
      onSelect: () => op(is_pinned ? "unpin" : "pin"),
    },
    isLive && {
      label: is_outdated ? "Not outdated" : "Mark outdated",
      icon: TriangleAlert,
      onSelect: () => op(is_outdated ? "current" : "outdated"),
    },
    status === "published" && {
      label: "Mark as still accurate",
      icon: ShieldCheck,
      onSelect: () => run(markThreadVerified, { threadId: id }),
    },
    status === "published" && {
      label: "Archive",
      icon: Archive,
      confirm: { message: "Archived threads become read-only and disappear from lists.", action: "Archive" },
      onSelect: () => op("archive"),
    },
    status === "archived" && {
      label: "Unarchive",
      icon: ArchiveRestore,
      onSelect: () => op("unarchive"),
    },
  ];
}
