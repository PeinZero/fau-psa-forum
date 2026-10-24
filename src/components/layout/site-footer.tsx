import Link from "next/link";
import { LogoMark } from "@/components/layout/logo-mark";
import { ShortcutsLink } from "@/components/shortcuts/shortcuts-link";
import { cn } from "@/components/ui/cn";

const linkClass =
  "inline-flex min-h-8 items-center gap-2 text-muted transition-colors duration-150 hover:text-foreground pointer-coarse:min-h-11";

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
  {
    title: "Legal",
    links: [
      { href: "/impressum", label: "Impressum" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border text-meta">
      <div className="mx-auto w-full max-w-5xl px-4 pt-10 pb-6 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16">
          <div className="max-w-xs space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 font-medium text-foreground">
              <LogoMark className="size-5" />
              PSA FAU Community Forum
            </Link>
            <p className="text-muted">By and for Pakistani students at FAU Erlangen-Nürnberg.</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-3 gap-6 sm:gap-12">
            {columns.map((column) => (
              <div key={column.title}>
                <p className="mb-2 font-medium text-foreground">{column.title}</p>
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

        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-5 text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>Independent student project. Not affiliated with or endorsed by FAU.</p>
          {/* Shortcuts need a keyboard, so phones don't get the link. */}
          <ShortcutsLink className={cn(linkClass, "text-subtle max-md:hidden")} />
        </div>
      </div>
    </footer>
  );
}
