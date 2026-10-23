"use client";

import { Flag, Link2, Pencil } from "lucide-react";
import { useState } from "react";

import { type ModThread, threadModItems } from "@/components/mod/thread-mod-panel";
import { ReportDialog } from "@/components/report/report-dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

import { MenuFeedback, useMenuAction } from "./menu-action";

export function ThreadMenu({
  thread,
  slug,
  canEdit = false,
  canReport = false,
  isMod = false,
}: {
  thread: ModThread;
  slug: string;
  canEdit?: boolean;
  canReport?: boolean;
  isMod?: boolean;
}) {
  const { pending, feedback, run, copyLink } = useMenuAction();
  const [reporting, setReporting] = useState(false);

  return (
    <div className="-my-1.5 -mr-2 flex items-center gap-1 pointer-coarse:-my-3">
      <MenuFeedback feedback={feedback} />
      <DropdownMenu
        label="Thread actions"
        busy={pending}
        items={[
          canEdit && { label: "Edit", icon: Pencil, href: `/t/${slug}/edit` },
          { label: "Copy link", icon: Link2, onSelect: () => copyLink(`/t/${slug}`) },
          canReport && { label: "Report", icon: Flag, onSelect: () => setReporting(true) },
          "separator",
          ...(isMod ? threadModItems(thread, run) : []),
        ]}
      />
      {canReport && (
        <ReportDialog target={{ threadId: thread.id }} subject="thread" open={reporting} onClose={() => setReporting(false)} />
      )}
    </div>
  );
}
