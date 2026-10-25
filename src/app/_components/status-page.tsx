import { BookOpen, LayoutList, MessageCirclePlus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const PLACES = [
  { href: "/browse", label: "Browse threads", icon: LayoutList },
  { href: "/guides", label: "Read the guides", icon: BookOpen },
  { href: "/new", label: "Ask a question", icon: MessageCirclePlus },
] as const;

/** Shared frame for 404 and error pages: what happened, the next step, and a few ways back in. */
export function StatusPage({
  eyebrow,
  icon,
  title,
  children,
  actions,
}: {
  eyebrow: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="hero-glow mx-auto flex w-full max-w-lg animate-fade-up flex-col items-center pt-8 text-center sm:pt-16">
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-xl bg-surface text-muted ring-1 ring-border [&_svg]:size-5 [&_svg]:stroke-[1.75]"
      >
        {icon}
      </span>
      <p className="mt-5 text-meta font-medium text-subtle tabular-nums">{eyebrow}</p>
      <h1 className="mt-1 text-display font-semibold tracking-tight text-foreground">{title}</h1>
      <div className="mt-3 max-w-md text-body text-muted">{children}</div>
      <div className="mt-7 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">{actions}</div>

      <nav aria-label="Popular places" className="mt-12 w-full border-t border-border pt-6">
        <ul className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2">
          {PLACES.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-meta font-medium text-muted transition-colors duration-150 ease-out hover:bg-surface-hover hover:text-foreground pointer-coarse:min-h-11"
              >
                <Icon aria-hidden strokeWidth={1.75} className="size-4 text-subtle" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
