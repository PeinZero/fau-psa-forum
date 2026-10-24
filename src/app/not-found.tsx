import { ArrowLeft, Compass, Search } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="hero-glow mx-auto w-full max-w-xl pt-6 sm:pt-12">
      <h1 className="sr-only">Page not found</h1>
      <EmptyState
        icon={<Compass />}
        title="This page doesn't exist"
        className="animate-fade-up bg-background/60 py-16 backdrop-blur"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/" className={buttonClasses({ size: "sm" })}>
              <ArrowLeft strokeWidth={1.75} />
              Back to home
            </Link>
            <Link href="/search" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <Search strokeWidth={1.75} />
              Search threads
            </Link>
          </div>
        }
      >
        The link may be broken, or the thread was removed or is still waiting for review. Try searching for it instead.
      </EmptyState>
    </div>
  );
}
