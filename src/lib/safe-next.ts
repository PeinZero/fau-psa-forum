// Same-origin paths only; the URL parser strips tabs/newlines and treats "\" as "/", so compare origins.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  try {
    const url = new URL(next, "http://localhost");
    if (url.origin !== "http://localhost") return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
