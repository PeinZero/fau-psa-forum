import { UserPlus } from "lucide-react";
import type { Metadata } from "next";

import { Author } from "@/components/author";
import { ActionButton } from "@/components/mod/action-button";
import { setRestricted } from "@/components/mod/actions";
import { Badge } from "@/components/ui/badge";
import { cardClasses } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Recent sign-ups" };

export default async function SignupsPage() {
  const supabase = await createClient();
  const [{ data: users, error }, { data: restrictions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, affiliation, role, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("user_restrictions").select("user_id, reason"),
  ]);
  const reasons = new Map((restrictions ?? []).map((r) => [r.user_id, r.reason]));

  if (error) return <p role="alert" className="text-danger">Could not load sign-ups. Please reload.</p>;
  if (!users.length) return <EmptyState icon={<UserPlus />} title="No sign-ups yet">New accounts appear here.</EmptyState>;

  return (
    <div className="grid gap-4">
      <p className="text-meta text-muted">
        The 50 newest accounts. A restricted member can still read but cannot post, report or vote.
      </p>
      <div className={cardClasses({ padding: "none", className: "overflow-hidden" })}>
        <ul className="divide-y divide-border">
          {users.map((user, index) => {
            const reason = reasons.get(user.id);
            return (
              <li
                key={user.id}
                style={stagger(index)}
                className="flex animate-fade-up flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 text-sm">
                  <Author profile={user} />
                  <p className="mt-1 text-meta text-subtle">
                    Joined {formatDate(user.created_at)}
                    {reason ? <span className="text-danger"> · Restricted: {reason}</span> : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {reason !== undefined && <Badge variant="danger">Restricted</Badge>}
                  {user.role === "member" &&
                    (reason !== undefined ? (
                      <ActionButton
                        action={setRestricted}
                        fields={{ target: user.id, restricted: "false" }}
                        label="Lift restriction"
                        pendingLabel="Lifting…"
                      />
                    ) : (
                      <ActionButton
                        action={setRestricted}
                        fields={{ target: user.id, restricted: "true" }}
                        label="Restrict"
                        pendingLabel="Restricting…"
                        tone="danger"
                        confirm={`Restrict ${user.display_name}? They can read but not post, report or vote.`}
                        reason={{ label: "Reason (shown to moderators only)", max: 500 }}
                      />
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
