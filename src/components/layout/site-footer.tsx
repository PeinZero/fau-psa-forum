import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border text-sm text-muted">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p>
          A community project by and for Pakistani students at FAU
          Erlangen-Nürnberg.
        </p>
        <nav aria-label="Legal" className="flex gap-4">
          <Link href="/impressum" className="inline-flex min-h-11 items-center underline">
            Impressum
          </Link>
          <Link href="/datenschutz" className="inline-flex min-h-11 items-center underline">
            Datenschutz
          </Link>
        </nav>
      </div>
    </footer>
  );
}
