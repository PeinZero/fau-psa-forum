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
    <section aria-label="Moderation" className="rounded-md border border-border p-3">
      <h2 className="mb-2 text-sm font-semibold">Moderation</h2>
      <div className="flex flex-wrap items-start gap-2">
        {(status === "pending" || status === "rejected") && (
          <ActionButton action={moderateThread} fields={{ ...field, op: "approve" }} label="Approve" pendingLabel="Approving..." />
        )}
        {status === "pending" && (
          <ActionButton
            action={moderateThread}
            fields={{ ...field, op: "reject" }}
            label="Reject"
            tone="danger"
            confirm="The author sees this reason."
            reason={{ label: "Reason for rejection", max: 1000 }}
          />
        )}
        {status === "published" && (
          <ActionButton
            action={moderateThread}
            fields={{ ...field, op: "archive" }}
            label="Archive"
            confirm="Archived threads become read-only and disappear from lists."
          />
        )}
        {status === "archived" && (
          <ActionButton action={moderateThread} fields={{ ...field, op: "unarchive" }} label="Unarchive" />
        )}
        {isLive && (
          <>
            <ActionButton
              action={moderateThread}
              fields={{ ...field, op: is_outdated ? "current" : "outdated" }}
              label={is_outdated ? "Not outdated" : "Mark outdated"}
            />
            <ActionButton
              action={moderateThread}
              fields={{ ...field, op: is_pinned ? "unpin" : "pin" }}
              label={is_pinned ? "Unpin" : "Pin"}
            />
          </>
        )}
      </div>
    </section>
  );
}
