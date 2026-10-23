import { ShieldCheck } from "lucide-react";

import { ActionButton } from "./action-button";
import { moderateThread } from "./actions";

type ThreadModPanelProps = {
  thread: {
    id: number;
    slug: string;
    status: "pending" | "published" | "rejected" | "archived";
    is_outdated: boolean;
    is_pinned: boolean;
  };
};

export function ThreadModPanel({ thread }: ThreadModPanelProps) {
  const { id, status, is_outdated, is_pinned } = thread;
  const isLive = status === "published" || status === "archived";
  const field = { threadId: id };

  return (
    <section aria-label="Moderation" className="flex flex-wrap items-start gap-x-2 gap-y-1">
      <ShieldCheck aria-hidden strokeWidth={1.75} className="mt-2.5 size-4 shrink-0 text-subtle pointer-coarse:mt-3.5" />
      <div className="flex min-w-0 flex-1 flex-wrap items-start gap-1">
        {(status === "pending" || status === "rejected") && (
          <ActionButton action={moderateThread} fields={{ ...field, op: "approve" }} label="Approve" pendingLabel="Approving..." variant="primary" />
        )}
        {status === "pending" && (
          <ActionButton
            action={moderateThread}
            fields={{ ...field, op: "reject" }}
            label="Reject"
            variant="danger"
            confirm="The author sees this reason."
            reason={{ label: "Reason for rejection", max: 1000 }}
          />
        )}
        {status === "published" && (
          <ActionButton
            action={moderateThread}
            fields={{ ...field, op: "archive" }}
            label="Archive"
            variant="ghost"
            confirm="Archived threads become read-only and disappear from lists."
          />
        )}
        {status === "archived" && (
          <ActionButton action={moderateThread} fields={{ ...field, op: "unarchive" }} label="Unarchive" variant="ghost" />
        )}
        {isLive && (
          <>
            <ActionButton
              action={moderateThread}
              fields={{ ...field, op: is_outdated ? "current" : "outdated" }}
              label={is_outdated ? "Not outdated" : "Mark outdated"}
              variant="ghost"
            />
            <ActionButton
              action={moderateThread}
              fields={{ ...field, op: is_pinned ? "unpin" : "pin" }}
              label={is_pinned ? "Unpin" : "Pin"}
              variant="ghost"
            />
          </>
        )}
      </div>
    </section>
  );
}
