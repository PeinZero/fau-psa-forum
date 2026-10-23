import { cn } from "@/components/ui/cn";

/** `label` names the bar for screen readers; the visible count sits next to it. */
export function ProgressBar({
  done,
  total,
  label,
  className,
}: {
  done: number;
  total: number;
  label: string;
  className?: string;
}) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${done} of ${total} done`}
      className={cn("block h-1.5 w-full overflow-hidden rounded-full bg-border", className)}
    >
      <span
        className="block h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
        style={{ width: `${percent}%` }}
      />
    </span>
  );
}
