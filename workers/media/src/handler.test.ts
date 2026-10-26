// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { handleRequest, type Env } from "./handler";

const UUID = "3f2b8c1e-5a4d-4e7b-9c10-0a1b2c3d4e5f";
const ORIGIN = "https://media.example.test";
const env: Env = {
  B2_KEY_ID: "fakeKeyId0001",
  B2_APPLICATION_KEY: "fakeSecretKey0002",
  B2_REGION: "eu-central-003",
  B2_BUCKET: "fake-bucket",
};

function setup(upstream: () => Response | Promise<Response> = () => new Response("img", { status: 200 })) {
  const fetchMock = vi.fn(async (_req: Request) => upstream());
  const store = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (req: Request) => store.get(req.url)?.clone()),
    put: vi.fn(async (req: Request, res: Response) => {
      store.set(req.url, res);
    }),
  };
  const waited: Promise<unknown>[] = [];
  const ctx = { waitUntil: (p: Promise<unknown>) => void waited.push(p) };
  const deps = { cache: cache as unknown as Cache, fetch: fetchMock as unknown as typeof fetch };
  return { fetchMock, cache, ctx, deps, waited };
}

const get = (path: string, method = "GET") => new Request(ORIGIN + path, { method });

describe("method and path validation", () => {
  it.each(["POST", "PUT", "DELETE", "PATCH"])("rejects %s with 405 and Allow", async (method) => {
    const s = setup();
    const res = await handleRequest(get(`/threads/${UUID}.webp`, method), env, s.ctx, s.deps);
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET, HEAD");
    expect(s.fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "/",
    `/uploads/${UUID}.webp`,
    `/threads/${UUID.toUpperCase()}.webp`,
    "/threads/../x",
    `/threads/..%2F${UUID}.webp`,
    `/threads/${UUID}`,
    `/threads/${UUID}.png`,
    `/threads/${UUID}.webp/extra`,
    `/threads/sub/${UUID}.webp`,
    "/threads/3f2b8c1e-5a4d-1e7b-9c10-0a1b2c3d4e5f.webp",
    "/threads/3f2b8c1e-5a4d-4e7b-7c10-0a1b2c3d4e5f.webp",
    "/threads/",
  ])("returns 404 without upstream call for %s", async (path) => {
    const s = setup();
    const res = await handleRequest(get(path), env, s.ctx, s.deps);
    expect(res.status).toBe(404);
    expect(s.fetchMock).not.toHaveBeenCalled();
  });
});

describe("successful fetch", () => {
  it("signs a request to the Backblaze S3 endpoint", async () => {
    const s = setup();
    await handleRequest(get(`/threads/${UUID}.webp`), env, s.ctx, s.deps);
    expect(s.fetchMock).toHaveBeenCalledTimes(1);
    const req = s.fetchMock.mock.calls[0][0];
    expect(req.url).toBe(`https://s3.eu-central-003.backblazeb2.com/fake-bucket/threads/${UUID}.webp`);
    expect(req.method).toBe("GET");
    const auth = req.headers.get("Authorization") ?? "";
    expect(auth.startsWith("AWS4-HMAC-SHA256")).toBe(true);
    expect(auth).toMatch(/Credential=fakeKeyId0001\/\d{8}\/eu-central-003\/s3\/aws4_request/);
  });

  it("returns exactly the specified headers and drops upstream ones", async () => {
    const s = setup(
      () =>
        new Response("img", {
          status: 200,
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Length": "3",
            ETag: '"abc"',
            "Last-Modified": "Wed, 01 Oct 2026 10:00:00 GMT",
            "x-amz-request-id": "req-1",
            "x-bz-file-id": "file-1",
            "Set-Cookie": "a=b",
          },
        }),
    );
    const res = await handleRequest(get(`/threads/${UUID}.jpg`), env, s.ctx, s.deps);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("img");
    const headers = Object.fromEntries(res.headers.entries());
    expect(headers).toEqual({
      "content-type": "image/jpeg",
      "content-length": "3",
      etag: '"abc"',
      "last-modified": "Wed, 01 Oct 2026 10:00:00 GMT",
      "cache-control": "public, max-age=86400",
      "x-content-type-options": "nosniff",
      "cross-origin-resource-policy": "cross-origin",
    });
  });

  it("derives the webp content type from the extension", async () => {
    const s = setup();
    const res = await handleRequest(get(`/threads/${UUID}.webp`), env, s.ctx, s.deps);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
  });

  it("omits optional headers upstream did not send", async () => {
    const s = setup();
    const res = await handleRequest(get(`/threads/${UUID}.webp`), env, s.ctx, s.deps);
    expect(res.headers.has("ETag")).toBe(false);
    expect(res.headers.has("Last-Modified")).toBe(false);
  });

  it("ignores the query string for the upstream URL and the cache key", async () => {
    const s = setup();
    await handleRequest(get(`/threads/${UUID}.webp?bust=123&x=y`), env, s.ctx, s.deps);
    await Promise.all(s.waited);
    expect(s.fetchMock.mock.calls[0][0].url).toBe(
      `https://s3.eu-central-003.backblazeb2.com/fake-bucket/threads/${UUID}.webp`,
    );
    expect(s.cache.match.mock.calls[0][0].url).toBe(`${ORIGIN}/threads/${UUID}.webp`);
    expect(s.cache.put.mock.calls[0][0].url).toBe(`${ORIGIN}/threads/${UUID}.webp`);
  });
});

describe("caching", () => {
  it("stores a 200 GET in the cache via waitUntil", async () => {
    const s = setup();
    const res = await handleRequest(get(`/threads/${UUID}.webp`), env, s.ctx, s.deps);
    expect(s.waited).toHaveLength(1);
    await Promise.all(s.waited);
    expect(s.cache.put).toHaveBeenCalledTimes(1);
    expect(await res.text()).toBe("img");
    const stored = s.cache.put.mock.calls[0][1];
    expect(await stored.text()).toBe("img");
  });

  it("returns a cache hit without calling upstream", async () => {
    const s = setup();
    s.cache.match.mockResolvedValueOnce(new Response("cached", { status: 200 }));
    const res = await handleRequest(get(`/threads/${UUID}.webp`), env, s.ctx, s.deps);
    expect(await res.text()).toBe("cached");
    expect(s.fetchMock).not.toHaveBeenCalled();
    expect(s.cache.put).not.toHaveBeenCalled();
  });

  it("serves the second request from the cache", async () => {
    const s = setup();
    await handleRequest(get(`/threads/${UUID}.webp`), env, s.ctx, s.deps);
    await Promise.all(s.waited);
    const res = await handleRequest(get(`/threads/${UUID}.webp?other=1`), env, s.ctx, s.deps);
    expect(await res.text()).toBe("img");
    expect(s.fetchMock).toHaveBeenCalledTimes(1);
  });

  it("works without a cache", async () => {
    const s = setup();
    const res = await handleRequest(get(`/threads/${UUID}.webp`), env, s.ctx, { fetch: s.deps.fetch });
    expect(res.status).toBe(200);
  });

  it("does not cache HEAD, 404 or errors", async () => {
    const head = setup();
    await handleRequest(get(`/threads/${UUID}.webp`, "HEAD"), env, head.ctx, head.deps);
    expect(head.cache.match).not.toHaveBeenCalled();
    expect(head.cache.put).not.toHaveBeenCalled();

    for (const status of [404, 500]) {
      const s = setup(() => new Response("x", { status }));
      await handleRequest(get(`/threads/${UUID}.webp`), env, s.ctx, s.deps);
      expect(s.waited).toHaveLength(0);
      expect(s.cache.put).not.toHaveBeenCalled();
    }
  });
});

describe("HEAD", () => {
  it("returns the same headers with no body and a HEAD upstream request", async () => {
    const s = setup(
      () => new Response(null, { status: 200, headers: { "Content-Length": "3", ETag: '"abc"' } }),
    );
    const res = await handleRequest(get(`/threads/${UUID}.webp`, "HEAD"), env, s.ctx, s.deps);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
    expect(res.headers.get("ETag")).toBe('"abc"');
    expect(s.fetchMock.mock.calls[0][0].method).toBe("HEAD");
  });
});

describe("upstream failures", () => {
  it("maps upstream 404 to a short-cached 404", async () => {
    const s = setup(() => new Response("<Error>NoSuchKey</Error>", { status: 404 }));
    const res = await handleRequest(get(`/threads/${UUID}.webp`), env, s.ctx, s.deps);
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=60");
    expect(await res.text()).not.toContain("NoSuchKey");
  });

  it.each([500, 403, 503, 301])("maps upstream %i to an uncached 502 without details", async (status) => {
    const s = setup(
      () => new Response("secret upstream detail", { status, headers: { "x-amz-request-id": "r" } }),
    );
    const res = await handleRequest(get(`/threads/${UUID}.webp`), env, s.ctx, s.deps);
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(res.headers.has("x-amz-request-id")).toBe(false);
    expect(await res.text()).not.toContain("secret");
  });

  it("maps a network error to an uncached 502", async () => {
    const s = setup(() => {
      throw new Error("connect ECONNREFUSED fake-host");
    });
    const res = await handleRequest(get(`/threads/${UUID}.webp`), env, s.ctx, s.deps);
    expect(res.status).toBe(502);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.text()).not.toContain("ECONNREFUSED");
  });
});

describe("misconfiguration", () => {
  it.each(["B2_KEY_ID", "B2_APPLICATION_KEY", "B2_REGION", "B2_BUCKET"] as const)(
    "returns 500 no-store without upstream call when %s is empty",
    async (name) => {
      const s = setup();
      const res = await handleRequest(get(`/threads/${UUID}.webp`), { ...env, [name]: "" }, s.ctx, s.deps);
      expect(res.status).toBe(500);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(s.fetchMock).not.toHaveBeenCalled();
    },
  );
});
