import { VolumeX } from "lucide-react";

import type { RunAction } from "@/components/thread/menu-action";
import type { MenuItem } from "@/components/ui/dropdown-menu";
import { RESTRICTION_DURATIONS, RESTRICTION_REASON_MAX } from "@/lib/restrictions";

import { restrictUser } from "./actions";

/** An author the viewer may mute: a member who is not the viewer. */
export type MutableAuthor = { id: string; name: string };

export function muteAuthorItem(author: MutableAuthor, run: RunAction): MenuItem {
  return {
    label: "Mute author…",
    icon: VolumeX,
    danger: true,
    confirm: {
      message: `${author.name} can still read, but not post, comment, vote or report. They see the reason.`,
      action: "Mute",
      choice: { label: "For", options: RESTRICTION_DURATIONS },
      reason: { label: "Reason", max: RESTRICTION_REASON_MAX },
    },
    onSelect: ({ reason, choice }) =>
      run(restrictUser, { target: author.id, kind: "mute", duration: choice, reason }),
  };
}
