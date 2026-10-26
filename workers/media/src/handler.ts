import { AwsClient } from "aws4fetch";

export interface Env {
  B2_KEY_ID: string;
  B2_APPLICATION_KEY: string;
  B2_REGION: string;
  B2_BUCKET: string;
}

const IMAGE_PATH =
  /^\/threads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|jpg)$/;

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
};

// Short enough that a deleted image stops loading within a day without needing a purge key.
const IMAGE_CACHE_CONTROL = "public, max-age=86400";

function plain(status: number, cacheControl: string, headers: HeadersInit = {}): Response {
  return new Response(status === 404 ? "Not found" : null, {
    status,
    headers: { "Cache-Control": cacheControl, ...headers },
  });
}

export async function handleRequest(
  request: Request,
  env: Env,
  ctx: { waitUntil(p: Promise<unknown>): void },
  deps: { cache?: Cache; fetch?: typeof fetch } = {},
): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const url = new URL(request.url);
  const match = IMAGE_PATH.exec(url.pathname);
  if (!match) return plain(404, "public, max-age=60");

  if (!env.B2_KEY_ID || !env.B2_APPLICATION_KEY || !env.B2_REGION || !env.B2_BUCKET) {
    return plain(500, "no-store");
  }

  const isGet = request.method === "GET";
  const cacheKey = new Request(url.origin + url.pathname);
  if (isGet && deps.cache) {
    const hit = await deps.cache.match(cacheKey);
    if (hit) return hit;
  }

  const client = new AwsClient({
    accessKeyId: env.B2_KEY_ID,
    secretAccessKey: env.B2_APPLICATION_KEY,
    service: "s3",
    region: env.B2_REGION,
  });
  const upstreamUrl = `https://s3.${env.B2_REGION}.backblazeb2.com/${env.B2_BUCKET}${url.pathname}`;

  let upstream: Response;
  try {
    const signed = await client.sign(upstreamUrl, { method: request.method });
    upstream = await (deps.fetch ?? fetch)(signed);
  } catch {
    return plain(502, "no-store");
  }

  if (upstream.status === 404) return plain(404, "public, max-age=60");
  if (upstream.status !== 200) {
    await upstream.body?.cancel();
    return plain(502, "no-store");
  }

  const headers = new Headers({
    "Content-Type": CONTENT_TYPES[match[1]],
    "Cache-Control": IMAGE_CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  for (const name of ["Content-Length", "ETag", "Last-Modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (!isGet) return new Response(null, { status: 200, headers });

  const response = new Response(upstream.body, { status: 200, headers });
  if (deps.cache) ctx.waitUntil(deps.cache.put(cacheKey, response.clone()));
  return response;
}
