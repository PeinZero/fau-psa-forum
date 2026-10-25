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
        <title>Something went wrong · PSA FAU Community Forum</title>
        <main className="hero-glow flex w-full max-w-md animate-fade-up flex-col items-center text-center">
          <span
            aria-hidden
            className="flex size-11 items-center justify-center rounded-xl bg-surface text-muted ring-1 ring-border"
          >
            <TriangleAlert strokeWidth={1.75} className="size-5" />
          </span>
          <p className="mt-5 text-meta font-medium text-subtle">Something went wrong</p>
          <h1 className="mt-1 text-display font-semibold tracking-tight">The forum didn&apos;t load</h1>
          <p className="mt-3 text-body text-muted">
            It&apos;s on our side and usually temporary, so please try again in a moment.
          </p>
          <div className="mt-7 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
            <Button onClick={() => retry()}>
              <RotateCw strokeWidth={1.75} />
              Try again
            </Button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the app shell itself failed, so reload it fully. */}
            <a href="/" className={buttonClasses({ variant: "secondary" })}>
              <Home strokeWidth={1.75} />
              Back to home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
