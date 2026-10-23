import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import UserMenu from "@/components/auth/user-menu";

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:font-medium focus:text-accent-foreground"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-accent">
          FAU PSA Forum
        </Link>
        <Form
          action="/search"
          role="search"
          aria-label="Site search"
          className="order-last flex w-full gap-2 sm:order-none sm:w-auto sm:flex-1"
        >
          <label htmlFor="header-search" className="sr-only">
            Search threads
          </label>
          <input
            id="header-search"
            type="search"
            name="q"
            placeholder="Search threads"
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 min-h-11 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-1.5 min-h-11 text-sm font-medium text-accent-foreground"
          >
            Search
          </button>
        </Form>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/new"
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
          >
            New thread
          </Link>
          <Suspense
            fallback={
              <div
                aria-hidden
                className="h-11 w-20 animate-pulse rounded-md bg-border"
              />
            }
          >
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
