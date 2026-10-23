import type { Metadata } from "next";
import Form from "next/form";

import { Author } from "@/components/author";
import { RoleForm } from "@/components/mod/role-form";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Users" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function UsersPage({ searchParams }: Props) {
  const viewer = await getViewer();
  if (viewer?.role !== "superadmin") {
    return (
      <div role="alert" className="rounded-md border border-border p-4">
        <p className="font-medium">Superadmin only</p>
        <p className="mt-1 text-sm text-muted">Only the superadmin can manage roles.</p>
      </div>
    );
  }

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 40) : "";

  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, display_name, affiliation, role")
    .order("display_name")
    .limit(50);
  if (q) {
    // Escape LIKE wildcards so the search is a plain substring match.
    query = query.ilike("display_name", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  }
  const { data: users, error } = await query;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">The last superadmin can&apos;t be demoted.</p>
      <Form action="/mod/users" role="search" className="grid gap-1">
        <label htmlFor="user-search" className="text-sm font-medium">
          Search by display name
        </label>
        <div className="flex gap-2">
          <input
            id="user-search"
            name="q"
            type="search"
            defaultValue={q}
            maxLength={40}
            className="min-h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
          />
          <button type="submit" className="min-h-11 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground">
            Search
          </button>
        </div>
      </Form>

      {error ? (
        <p role="alert">Could not load users. Please reload.</p>
      ) : !users.length ? (
        <p className="text-muted">No users found.</p>
      ) : (
        <ul className="grid gap-3">
          {users.map((user) => (
            <li key={user.id} className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2 sm:items-start">
              <Author profile={user} />
              <RoleForm target={user.id} name={user.display_name} role={user.role} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
