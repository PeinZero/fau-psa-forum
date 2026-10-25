import { Fragment, type ReactNode } from "react";

import { cn } from "../../ui/cn";
import type { Block } from "../demo-data";

/*
 * The site's <Markdown> (src/components/markdown.tsx) for demo blocks: same prose classes, same
 * reading/body sizes, headings as h3, lists with subtle markers, links in emerald with a soft underline.
 */

const prose = cn(
  "min-w-0 break-words text-foreground/90",
  "[&_li+li]:mt-1.5",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
);

const sizes = {
  body: "text-body [&>*+*]:mt-4 [&>h3:not(:first-child)]:mt-7",
  reading: "text-reading [&>*+*]:mt-5 [&>h3:not(:first-child)]:mt-10 [&_h3]:text-heading [&_li+li]:mt-2",
};

const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

/** `**bold**` and `[label](url)`; emoji and everything else stay plain text. */
export function Inline({ text }: { text: string }): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    if (match[1] !== undefined) {
      parts.push(<strong key={index}>{match[1]}</strong>);
    } else {
      parts.push(
        <span key={index} className="font-medium text-accent underline decoration-accent/30 underline-offset-2">
          {match[2]}
        </span>,
      );
    }
    last = index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>);
}

export function Markdown({
  blocks,
  size = "body",
  limit,
  className,
}: {
  blocks: Block[];
  /** `reading` for a thread's own post, `body` for comments. */
  size?: keyof typeof sizes;
  /** Renders only the first `limit` blocks. */
  limit?: number;
  className?: string;
}) {
  const shown = limit === undefined ? blocks : blocks.slice(0, limit);
  return (
    <div className={cn(prose, sizes[size], className)}>
      {shown.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p key={i}>
                <Inline text={block.text} />
              </p>
            );
          case "h":
            return (
              <h3 key={i} className="font-semibold text-foreground">
                <Inline text={block.text} />
              </h3>
            );
          case "ul":
            return (
              <ul key={i} className="list-disc pl-5 marker:text-subtle">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal pl-5 marker:text-subtle">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </ol>
            );
        }
      })}
    </div>
  );
}
