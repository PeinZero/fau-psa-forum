import { affiliationLabels } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";

type AuthorProfile = Pick<Tables<"profiles">, "display_name" | "affiliation" | "role">;

export function Author({ profile }: { profile: AuthorProfile | null }) {
  if (!profile) return <span className="text-muted">Deleted user</span>;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="break-words font-medium">{profile.display_name}</span>
      {profile.role !== "member" && (
        <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">Moderator</span>
      )}
      {profile.affiliation && (
        <span className="rounded border border-border px-1.5 py-0.5 text-xs text-muted">
          {affiliationLabels[profile.affiliation]}
        </span>
      )}
    </span>
  );
}
