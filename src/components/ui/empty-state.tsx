import type { ReactNode } from "react";
import { cn } from "./cn";

export type EmptyStateProps = {
  /** A lucide icon element, e.g. `<Inbox />`. */
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** A calm, centred note on a soft surface: what is missing, why, and the next step. */
export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center rounded-xl bg-surface px-6 py-12 text-center", className)}>
      {icon ? (
        <div
          aria-hidden
          className="mb-4 flex size-10 items-center justify-center rounded-full bg-raised text-subtle shadow-[0_1px_2px_var(--shadow-color)] [&_svg]:size-5 [&_svg]:stroke-[1.75]"
        >
          {icon}
        </div>
      ) : null}
      <p className="text-body font-semibold text-foreground">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-meta text-pretty text-muted">{children}</div> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
