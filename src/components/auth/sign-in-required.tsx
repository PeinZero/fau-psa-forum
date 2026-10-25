import { LogIn } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** Signed-out view of a members-only page: says what the page offers and where to sign in. */
export function SignInRequired({ next, title, children }: { next: string; title: string; children?: ReactNode }) {
  return (
    <EmptyState
      icon={<LogIn />}
      title={title}
      action={
        <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonClasses({ size: "md" })}>
          Sign in
        </Link>
      }
    >
      {children}
    </EmptyState>
  );
}
