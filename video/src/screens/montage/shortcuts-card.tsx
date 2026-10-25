import { X } from "lucide-react";
import { Fragment } from "react";

import { Button } from "../../ui/button";
import { Kbd } from "../../ui/kbd";

/*
 * The "?" dialog (src/components/shortcuts/shortcuts-dialog.tsx in the shell of
 * src/components/ui/dialog.tsx): title, one-line description, the three groups and Done.
 */

type Row = { label: string; combos: string[][] };

const MOD = "⌘";

const groups: { heading: string; rows: Row[] }[] = [
  {
    heading: "General",
    rows: [
      { label: "Search threads", combos: [[MOD, "K"], ["/"]] },
      { label: "Show keyboard shortcuts", combos: [["?"]] },
    ],
  },
  {
    heading: "In search",
    rows: [
      { label: "Move through results", combos: [["↑", "↓"]] },
      { label: "Open the selected result", combos: [["↵"]] },
      { label: "See all results", combos: [[MOD, "↵"]] },
      { label: "Close search", combos: [["Esc"]] },
    ],
  },
  {
    heading: "Writing",
    rows: [
      { label: "Post your comment", combos: [[MOD, "↵"]] },
      { label: "Cancel editing", combos: [["Esc"]] },
    ],
  },
];

/** The dialog panel is 26rem wide and 566px tall; the window crops its top, into the search group. */
const PANEL_HEIGHT = 566;
export const SHORTCUTS_CARD = { width: 416, height: 262, radius: 12 };

export function ShortcutsCard() {
  return (
    <div
      className="absolute inset-x-0 top-0 rounded-xl border border-border bg-raised text-foreground"
      style={{ height: PANEL_HEIGHT }}
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="text-heading font-semibold tracking-tight text-pretty text-foreground">Keyboard shortcuts</h2>
            <p className="text-meta text-pretty text-muted">Get around the forum without leaving the keyboard.</p>
          </div>
          <Button variant="ghost" size="icon" className="-mr-2 -mt-1.5">
            <X aria-hidden strokeWidth={1.75} />
          </Button>
        </div>

        {groups.map((group) => (
          <section key={group.heading}>
            <h3 className="mb-1 text-meta font-medium text-muted">{group.heading}</h3>
            <dl className="flex flex-col">
              {group.rows.map((row) => (
                <div key={row.label} className="flex min-h-9 items-center justify-between gap-4 text-small">
                  <dt>{row.label}</dt>
                  <dd className="flex shrink-0 items-center gap-1.5 tabular-nums">
                    {row.combos.map((combo, index) => (
                      <Fragment key={combo.join("+")}>
                        {index > 0 && <span className="text-meta text-subtle">or</span>}
                        <span className="flex gap-0.5">
                          {combo.map((key) => (
                            <Kbd key={key}>{key}</Kbd>
                          ))}
                        </span>
                      </Fragment>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="secondary">Done</Button>
        </div>
      </div>
    </div>
  );
}
