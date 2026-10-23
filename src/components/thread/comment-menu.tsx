"use client";

import { Flag, Link2, Pencil } from "lucide-react";
import { useState } from "react";

import { commentModItems } from "@/components/mod/comment-mod-actions";
import { ReportDialog } from "@/components/report/report-dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useCommentEdit } from "@/components/write/comment-editor";

import { MenuFeedback, useMenuAction } from "./menu-action";

export function CommentMenu({
  threadId,
  slug,
  commentId,
  canReport,
  mod,
}: {
  threadId: number;
  slug: string;
  commentId: number;
  canReport: boolean;
  /** Present when the viewer moderates (and isn't viewing as a member). */
  mod: { isBest: boolean; isHidden: boolean } | null;
}) {
  const edit = useCommentEdit();
  const { pending, feedback, run, copyLink } = useMenuAction();
  const [reporting, setReporting] = useState(false);

  return (
    <div className="-my-1.5 -mr-2 ml-auto flex shrink-0 items-center gap-1 pointer-coarse:-my-3">
      <MenuFeedback feedback={feedback} />
      <DropdownMenu
        label="More actions"
        busy={pending}
        triggerClassName="inline-flex size-8 items-center justify-center rounded-md text-subtle transition-colors duration-150 hover:bg-surface-hover hover:text-foreground aria-expanded:bg-surface-hover aria-expanded:text-foreground pointer-coarse:size-11 [&_svg]:size-4"
        items={[
          edit && !edit.editing && { label: "Edit", icon: Pencil, onSelect: edit.start },
          { label: "Copy link", icon: Link2, onSelect: () => copyLink(`/t/${slug}#comment-${commentId}`) },
          canReport && { label: "Report", icon: Flag, onSelect: () => setReporting(true) },
          "separator",
          ...(mod ? commentModItems({ threadId, commentId, ...mod }, run) : []),
        ]}
      />
      {canReport && (
        <ReportDialog target={{ commentId }} subject="comment" open={reporting} onClose={() => setReporting(false)} />
      )}
    </div>
  );
}
