import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function UserMenu() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return (
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        Sign in
      </Link>
    );
  }

  const fullName = claims.user_metadata?.full_name;
  const name =
    typeof fullName === "string" && fullName ? fullName : (claims.email?.split("@")[0] ?? "Account");

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="max-w-40 truncate font-medium">{name}</span>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
