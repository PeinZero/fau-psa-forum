"use client";

import { Home, RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Server errors arrive with a digest only; it matches the server log without exposing details.
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <div className="hero-glow mx-auto w-full max-w-xl pt-6 sm:pt-12">
      <h1 className="sr-only">Something went wrong</h1>
      <EmptyState
        icon={<TriangleAlert />}
        title="Something went wrong on our side"
        className="animate-fade-up bg-background/60 py-16 backdrop-blur"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="sm" onClick={() => retry()}>
              <RotateCw strokeWidth={1.75} />
              Try again
            </Button>
            <Link href="/" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <Home strokeWidth={1.75} />
              Back to home
            </Link>
          </div>
        }
      >
        <p>This page didn&apos;t load. It&apos;s usually temporary, so please try again in a moment.</p>
        {digest ? <p className="mt-2 font-mono text-subtle">Reference: {digest}</p> : null}
      </EmptyState>
    </div>
  );
}
