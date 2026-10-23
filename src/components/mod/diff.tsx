import { cn } from "@/components/ui/cn";

type Op = { kind: "same" | "removed" | "added"; text: string };

// Line-level longest-common-subsequence; threads are short, so O(n*m) is fine.
function diffLines(before: string, after: string): Op[] {
  const a = before.split("\n");
  const b = after.split("\n");
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ kind: "same", text: a[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push({ kind: "removed", text: a[i++] });
    } else {
      ops.push({ kind: "added", text: b[j++] });
    }
  }
  while (i < a.length) ops.push({ kind: "removed", text: a[i++] });
  while (j < b.length) ops.push({ kind: "added", text: b[j++] });
  return ops;
}

function Column({ label, ops, side }: { label: string; ops: Op[]; side: "removed" | "added" }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-background">
      <p className="border-b border-border bg-surface px-3 py-1.5 text-meta font-medium text-muted">{label}</p>
      <div className="py-1 font-mono text-[13px] leading-6">
        {ops
          .filter((op) => op.kind === "same" || op.kind === side)
          .map((op, index) => (
            <p
              key={index}
              className={cn(
                "min-h-6 whitespace-pre-wrap break-words px-3",
                op.kind === "removed" && "bg-danger/10 text-danger",
                op.kind === "added" && "bg-accent-soft text-accent",
              )}
            >
              {op.text || " "}
            </p>
          ))}
      </div>
    </div>
  );
}

export function Diff({ before, after }: { before: string; after: string }) {
  const ops = diffLines(before, after);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Column label="Before" ops={ops} side="removed" />
      <Column label="After" ops={ops} side="added" />
    </div>
  );
}
