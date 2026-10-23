import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// User-written content: react-markdown never renders raw HTML, and links open outside the forum.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 break-words leading-relaxed [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_code]:rounded [&_code]:bg-border/50 [&_code]:px-1 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-6 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_ul]:list-disc [&_ul]:pl-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
              {children}
            </a>
          ),
          h1: ({ children }) => <h3>{children}</h3>,
          h2: ({ children }) => <h3>{children}</h3>,
          h4: ({ children }) => <h3>{children}</h3>,
          h5: ({ children }) => <h3>{children}</h3>,
          h6: ({ children }) => <h3>{children}</h3>,
          table: ({ children }) => (
            <div tabIndex={0} role="region" aria-label="Table" className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
          pre: ({ children }) => (
            <div tabIndex={0} role="region" aria-label="Code" className="overflow-x-auto">
              <pre>{children}</pre>
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
