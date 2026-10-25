import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";

import { Author } from "@/components/author";
import { ActionButton } from "@/components/mod/action-button";
import { reviewApplication } from "@/components/mod/actions";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
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

  if (error) return <p role="alert" className="text-danger">Could not load applications. Please reload.</p>;
  if (!applications.length) {
    return <EmptyState icon={<CheckCircle2 />} title="All caught up">No applications are waiting for a decision.</EmptyState>;
  }

  return (
    <ul className="grid gap-3">
      {applications.map((application, index) => (
        <li key={application.id} style={stagger(index)} className="animate-fade-up">
          <Card className="grid gap-4">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
              <Author profile={application.applicant} />
              <span>{formatDate(application.created_at)}</span>
            </p>
            <p className="whitespace-pre-wrap break-words text-body">{application.motivation}</p>
            <div className="flex flex-wrap items-start gap-2 border-t border-border pt-4">
              <ActionButton
                action={reviewApplication}
                fields={{ applicationId: application.id, decision: "approved" }}
                label="Approve"
                variant="primary"
                confirm="Approving makes this person a moderator."
              />
              <ActionButton
                action={reviewApplication}
                fields={{ applicationId: application.id, decision: "rejected" }}
                label="Reject"
                variant="danger"
                confirm="Reject this application?"
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
