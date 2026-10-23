import { CircleCheck, CircleX, Eye, EyeOff } from "lucide-react";

import type { RunAction } from "@/components/thread/menu-action";
import type { MenuEntry } from "@/components/ui/dropdown-menu";

import { moderateComment } from "./actions";

/** Moderator entries of a comment's menu. */
export function commentModItems(
  { threadId, commentId, isBest, isHidden }: { threadId: number; commentId: number; isBest: boolean; isHidden: boolean },
  run: RunAction,
): MenuEntry[] {
  const op = (name: string) => run(moderateComment, { threadId, commentId, op: name });

  return [
    !isHidden && {
      label: isBest ? "Unmark best answer" : "Mark best answer",
      icon: isBest ? CircleX : CircleCheck,
      onSelect: () => op(isBest ? "unbest" : "best"),
    },
    isHidden
      ? { label: "Unhide comment", icon: Eye, onSelect: () => op("unhide") }
      : {
          label: "Hide comment",
          icon: EyeOff,
          danger: true,
          confirm: { message: "Hide this comment from the public?", action: "Hide comment" },
          onSelect: () => op("hide"),
        },
  ];
}
