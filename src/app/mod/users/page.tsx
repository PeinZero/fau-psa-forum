import { Lock, Search } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";

import { Author } from "@/components/author";
import { RoleForm } from "@/components/mod/role-form";
import { Button } from "@/components/ui/button";
import { cardClasses } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label } from "@/components/ui/field";
import { stagger } from "@/components/ui/motion";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Users" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function UsersPage({ searchParams }: Props) {
  const viewer = await getViewer();
  if (viewer?.role !== "superadmin") {
    return (
      <EmptyState icon={<Lock />} title="Superadmin only">
        <span role="alert">Only the superadmin can manage roles.</span>
      </EmptyState>
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
    <div className="grid gap-5">
      <Form action="/mod/users" role="search" className="grid gap-1.5">
        <Label htmlFor="user-search">Search by display name</Label>
        <div className="flex gap-2">
          <Input id="user-search" name="q" type="search" defaultValue={q} maxLength={40} className="min-w-0 flex-1" />
          <Button type="submit" variant="primary">
            <Search aria-hidden strokeWidth={1.75} />
            Search
          </Button>
        </div>
        <p className="text-meta text-subtle">The last superadmin can&apos;t be demoted.</p>
      </Form>

      {error ? (
        <p role="alert" className="text-danger">Could not load users. Please reload.</p>
      ) : !users.length ? (
        <EmptyState icon={<Search />} title="No users found">Try a different name.</EmptyState>
      ) : (
        <div className={cardClasses({ padding: "none", className: "overflow-hidden" })}>
          <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_16rem] gap-4 border-b border-border px-4 py-2 text-meta font-medium text-muted sm:grid">
            <span>User</span>
            <span>Role</span>
          </div>
          <ul className="divide-y divide-border">
            {users.map((user, index) => (
              <li
                key={user.id}
                style={stagger(index)}
                className="grid animate-fade-up gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_16rem] sm:items-start sm:gap-4"
              >
                <div className="min-w-0 pt-1.5 text-sm">
                  <Author profile={user} />
                </div>
                <RoleForm target={user.id} name={user.display_name} role={user.role} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
