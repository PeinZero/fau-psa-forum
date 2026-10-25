import Link from "next/link";
import { LogoMark } from "@/components/layout/logo-mark";
import { ShortcutsLink } from "@/components/shortcuts/shortcuts-link";
import { cn } from "@/components/ui/cn";

const linkClass =
  "inline-flex min-h-7 items-center gap-1.5 rounded-sm text-muted transition-colors duration-150 ease-out hover:text-foreground active:text-foreground pointer-coarse:min-h-11";

function GitHubMark() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

const columns = [
  {
    title: "Forum",
    links: [
      { href: "/browse", label: "Browse" },
      { href: "/guides", label: "Guides" },
      { href: "/announcements", label: "Announcements" },
    ],
  },
  {
    title: "Community",
    links: [
      { href: "/about", label: "About" },
      { href: "/contributors", label: "Contributors" },
    ],
  },
];

const legalLinks = [
  { href: "/impressum", label: "Impressum" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border text-meta">
      <div className="mx-auto w-full max-w-6xl px-4 pt-12 pb-8 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
          <div className="max-w-xs">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-md font-semibold tracking-tight text-foreground transition-opacity duration-150 ease-out hover:opacity-80"
            >
              <LogoMark className="size-5" />
              PSA FAU Community Forum
            </Link>
            <p className="mt-2 text-muted">By and for Pakistani students at FAU Erlangen-Nürnberg.</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 sm:gap-x-16">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="mb-1.5 text-meta font-medium text-foreground">{column.title}</h2>
                <ul>
                  {column.links.map(({ href, label }) => (
                    <li key={href}>
                      <Link href={href} className={linkClass}>
                        {label}
                      </Link>
                    </li>
                  ))}
                  {column.title === "Community" && (
                    <li>
                      <a href="https://github.com/PeinZero/fau-psa-forum" className={linkClass}>
                        <GitHubMark />
                        GitHub
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-subtle sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p>Independent student project. Not affiliated with or endorsed by FAU.</p>
          <ul className="flex flex-wrap items-center gap-x-5">
            {legalLinks.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className={cn(linkClass, "text-subtle")}>
                  {label}
                </Link>
              </li>
            ))}
            {/* Shortcuts need a keyboard, so phones don't get the link. */}
            <li className="max-md:hidden">
              <ShortcutsLink className={cn(linkClass, "text-subtle")} />
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
