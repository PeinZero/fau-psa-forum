"use client";

import { Home, RotateCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import "./globals.css";

// Replaces the root layout, so next-themes is not running: apply the saved theme by hand.
function applySavedTheme() {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem("theme");
  } catch {}
  const dark =
    saved === "dark" || (saved !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    applySavedTheme();
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full items-center justify-center bg-background px-4 font-sans text-foreground antialiased">
        <title>Something went wrong · FAU PSA Forum</title>
        <main className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-background text-muted">
            <TriangleAlert aria-hidden strokeWidth={1.75} className="size-5" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold tracking-tight">Something went wrong</h1>
            <p className="text-sm text-muted">
              The forum couldn&apos;t load right now. It&apos;s usually temporary, so please try again in a moment.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="sm" onClick={() => retry()}>
              <RotateCw strokeWidth={1.75} />
              Try again
            </Button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the app shell itself failed, so reload it fully. */}
            <a href="/" className={buttonClasses({ variant: "secondary", size: "sm" })}>
              <Home strokeWidth={1.75} />
              Back to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
