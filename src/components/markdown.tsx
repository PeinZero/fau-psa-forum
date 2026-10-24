import type { Parent, PhrasingContent, Root, Text } from "mdast";
import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/components/ui/cn";

const prose = cn(
  "min-w-0 break-words text-foreground/90",
  "[&_li>p]:my-1 [&_li+li]:mt-1.5 [&_li_ul]:mt-1.5 [&_li_ol]:mt-1.5",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:border [&_:not(pre)>code]:border-border [&_:not(pre)>code]:bg-surface [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-px [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em]",
  "[&_input[type=checkbox]]:mr-1.5 [&_input[type=checkbox]]:accent-(--accent)",
);

function Heading({ children }: { children?: ReactNode }) {
  return <h3 className="text-base font-semibold tracking-tight text-foreground">{children}</h3>;
}

// Same boundary as the database's mention rule, so a linked handle is one that gets notified
// (`bilal@example.com` and `@@name` are no mentions).
const MENTION = /(?<![A-Za-z0-9_@])@([A-Za-z0-9_]{3,20})(?![A-Za-z0-9_])/g;

function splitMentions(text: Text): PhrasingContent[] {
  const parts: PhrasingContent[] = [];
  let last = 0;
  for (const match of text.value.matchAll(MENTION)) {
    if (match.index > last) parts.push({ type: "text", value: text.value.slice(last, match.index) });
    parts.push({
      type: "link",
      url: `/u/${match[1].toLowerCase()}`,
      children: [{ type: "text", value: match[0] }],
      data: { hProperties: { dataMention: true } },
    });
    last = match.index + match[0].length;
  }
  if (last === 0) return [text];
  if (last < text.value.length) parts.push({ type: "text", value: text.value.slice(last) });
  return parts;
}

function linkMentions(node: Parent) {
  // Code keeps its literal text (it has no child nodes) and existing links keep their target.
  if (node.type === "link" || node.type === "linkReference") return;
  node.children = node.children.flatMap((child): Parent["children"] => {
    if (child.type === "text") return splitMentions(child);
    if ("children" in child) linkMentions(child);
    return [child];
  });
}

function remarkMentions() {
  return (tree: Root) => linkMentions(tree);
}

// User-written content: react-markdown never renders raw HTML, and links open outside the forum.
// Mentions are the only internal links.
/** `reading` is the long-form size for a thread's own post; comments stay at body size. */
const sizes = {
  body: "text-body [&>*+*]:mt-4 [&>h3:not(:first-child)]:mt-7",
  reading: "text-reading [&>*+*]:mt-5 [&>h3:not(:first-child)]:mt-9 [&_h3]:text-heading",
};

export function Markdown({ children, size = "body" }: { children: string; size?: keyof typeof sizes }) {
  return (
    <div className={cn(prose, sizes[size])}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMentions]}
        components={{
          a: ({ href, children, node }) =>
            node?.properties.dataMention && href ? (
              <Link
                href={href}
                className="rounded-[5px] bg-accent-soft px-1 py-px font-medium text-accent transition-colors hover:bg-accent/20"
              >
                {children}
              </Link>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="font-medium text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
              >
                {children}
              </a>
            ),
          // The page title is the only h1; user headings stay below the comment heading level.
          h1: Heading,
          h2: Heading,
          h3: Heading,
          h4: Heading,
          h5: Heading,
          h6: Heading,
          ul: ({ children }) => <ul className="list-disc pl-5 marker:text-subtle">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 marker:text-subtle">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/40 pl-4 text-muted [&>*+*]:mt-2">{children}</blockquote>
          ),
          hr: () => <hr className="border-border" />,
          table: ({ children }) => (
            <div
              tabIndex={0}
              role="region"
              aria-label="Table"
              className="overflow-x-auto rounded-lg border border-border"
            >
              <table className="w-full border-collapse text-meta [&_tbody_tr+tr>td]:border-t [&_tbody_tr+tr>td]:border-border">{children}</table>
            </div>
          ),
          th: ({ children, style }) => (
            <th style={style} className="border-b border-border bg-surface px-3 py-2 text-left font-medium text-foreground">
              {children}
            </th>
          ),
          td: ({ children, style }) => (
            <td style={style} className="px-3 py-2 align-top">
              {children}
            </td>
          ),
          pre: ({ children }) => (
            <div
              tabIndex={0}
              role="region"
              aria-label="Code"
              className="overflow-x-auto rounded-lg border border-border bg-surface"
            >
              <pre className="px-4 py-3 font-mono text-[13px] leading-relaxed">{children}</pre>
            </div>
          ),
          img: ({ alt }) => <span>{alt}</span>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
