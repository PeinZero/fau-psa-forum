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

export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div
          aria-hidden
          className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-surface text-muted [&_svg]:size-5 [&_svg]:stroke-[1.75]"
        >
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {children ? <div className="mt-1 max-w-sm text-meta text-muted">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
