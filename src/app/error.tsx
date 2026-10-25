"use client";

import { Home, RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonClasses } from "@/components/ui/button";

import { StatusPage } from "./_components/status-page";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // Server errors arrive with a digest only; it matches the server log without exposing details.
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  return (
    <StatusPage
      eyebrow="Something went wrong"
      icon={<TriangleAlert />}
      title="This page didn't load"
      actions={
        <>
          <Button onClick={() => retry()}>
            <RotateCw strokeWidth={1.75} />
            Try again
          </Button>
          <Link href="/" className={buttonClasses({ variant: "secondary" })}>
            <Home strokeWidth={1.75} />
            Back to home
          </Link>
        </>
      }
    >
      <p>It&apos;s on our side and usually temporary, so please try again in a moment.</p>
      {digest ? <p className="mt-2 font-mono text-meta text-subtle">Reference: {digest}</p> : null}
    </StatusPage>
  );
}
