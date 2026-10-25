import { UserPlus } from "lucide-react";
import type { Metadata } from "next";

import { Author } from "@/components/author";
import { RestrictControls } from "@/components/mod/restrict-controls";
import { canRestrict, getActiveRestrictions } from "@/components/restrictions/data";
import { cardClasses } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { getViewer } from "@/lib/auth/viewer";
import { formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Recent sign-ups" };

export default async function SignupsPage() {
  const viewer = await getViewer();
  if (!viewer) return null;

  const supabase = await createClient();
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, display_name, affiliation, role, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return <p role="alert" className="text-body text-danger">Could not load sign-ups. Please reload.</p>;
  if (!users.length) return <EmptyState icon={<UserPlus />} title="No sign-ups yet">New accounts appear here.</EmptyState>;

  const restrictions = await getActiveRestrictions(users.map((user) => user.id));

  return (
    <div className="grid gap-4">
      <p className="text-meta text-muted">
        The 50 newest accounts. A muted member can still read but cannot post, comment, report or vote.
      </p>
      <div className={cardClasses({ padding: "none", className: "overflow-hidden" })}>
        <ul className="divide-y divide-border">
          {users.map((user, index) => (
            <li
              key={user.id}
              style={stagger(index)}
              className="flex animate-fade-up flex-wrap items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 pt-1.5 text-small">
                <Author profile={user} />
                <p className="mt-1 text-meta text-muted">Joined {formatDate(user.created_at)}</p>
              </div>
              <div className="w-full sm:w-auto sm:max-w-80">
                <RestrictControls
                  target={user.id}
                  name={user.display_name}
                  active={restrictions.get(user.id) ?? []}
                  canRestrict={canRestrict(viewer, user)}
                  canBan={viewer.role === "superadmin"}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
