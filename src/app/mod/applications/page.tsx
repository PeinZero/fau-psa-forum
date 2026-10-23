import type { Metadata } from "next";

import { Author } from "@/components/author";
import { ActionButton } from "@/components/mod/action-button";
import { reviewApplication } from "@/components/mod/actions";
import { formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Moderator applications" };

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const { data: applications, error } = await supabase
    .from("moderator_applications")
    .select(
      "id, motivation, created_at, applicant:profiles!moderator_applications_user_id_fkey(display_name, affiliation, role)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return <p role="alert">Could not load applications. Please reload.</p>;
  if (!applications.length) return <p className="text-muted">No open applications.</p>;

  return (
    <ul className="grid gap-4">
      {applications.map((application) => (
        <li key={application.id} className="grid gap-3 rounded-md border border-border p-4">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <Author profile={application.applicant} />
            <span>{formatDate(application.created_at)}</span>
          </p>
          <p className="whitespace-pre-wrap break-words">{application.motivation}</p>
          <div className="flex flex-wrap items-start gap-2">
            <ActionButton
              action={reviewApplication}
              fields={{ applicationId: application.id, decision: "approved" }}
              label="Approve"
              confirm="Approving makes this person a moderator."
            />
            <ActionButton
              action={reviewApplication}
              fields={{ applicationId: application.id, decision: "rejected" }}
              label="Reject"
              tone="danger"
              confirm="Reject this application?"
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
