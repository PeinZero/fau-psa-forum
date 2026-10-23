const WINDOW = 170;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function plain(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Excerpt of the body around the first query word; falls back to the opening when a typo matched nothing. */
export function bodySnippet(body: string, query: string): { text: string; matched: boolean } | null {
  const text = plain(body);
  if (!text) return null;

  const words = query.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);
  const hit = words.length ? text.search(new RegExp(words.join("|"), "i")) : -1;
  const start = hit > 40 ? hit - 40 : 0;
  const end = start + WINDOW;
  const slice = text.slice(start, end);
  return {
    matched: hit >= 0,
    text: `${start > 0 ? "…" : ""}${slice}${end < text.length ? "…" : ""}`,
  };
}
