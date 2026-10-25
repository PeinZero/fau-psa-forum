import { afterEach, describe, expect, it, vi } from "vitest";

async function load() {
  vi.resetModules();
  return (await import("./site-url")).siteUrl;
}

afterEach(() => vi.unstubAllEnvs());

describe("siteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://forum.example");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "x.vercel.app");
    expect(await load()).toBe("https://forum.example");
  });

  it("uses the Vercel production host over https", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined as unknown as string);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "x.vercel.app");
    expect(await load()).toBe("https://x.vercel.app");
  });

  it("falls back to localhost", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", undefined as unknown as string);
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", undefined as unknown as string);
    expect(await load()).toBe("http://localhost:3000");
  });
});
