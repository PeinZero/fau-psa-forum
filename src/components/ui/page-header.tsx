import type { ReactNode } from "react";
import { cn } from "./cn";

export type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons or links aligned right on wide screens, below the title on narrow ones. */
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-display font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-body text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
