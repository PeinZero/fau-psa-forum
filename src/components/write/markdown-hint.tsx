const syntax = ["**bold**", "*italic*", "[link](url)", "- list", "> quote"];

/** Formatting cheat sheet under a Markdown field; phones get the short version. */
export function MarkdownHint({ id, short = false }: { id?: string; short?: boolean }) {
  return (
    <p id={id} className="min-w-0 text-meta text-muted">
      <span className={short ? undefined : "sm:hidden"}>Markdown and @mentions work here.</span>
      {short ? null : (
        <span className="hidden flex-wrap items-center gap-x-1.5 gap-y-1 sm:inline-flex">
          <span>Markdown:</span>
          {syntax.map((example) => (
            <code key={example} className="rounded bg-surface-hover px-1 font-mono text-[0.75rem] text-muted">
              {example}
            </code>
          ))}
          <span>· @ to mention</span>
        </span>
      )}
    </p>
  );
}
