import { afterEach, describe, expect, it, vi } from "vitest";
import { imagesEnabled, isImageKey, mediaUrl, newImageKey } from "./keys";

afterEach(() => vi.unstubAllEnvs());

describe("image keys", () => {
  it("creates valid keys with the extension of the type", () => {
    const webp = newImageKey("image/webp");
    const jpg = newImageKey("image/jpeg");
    expect(webp).toMatch(/^threads\/.+\.webp$/);
    expect(jpg).toMatch(/\.jpg$/);
    expect(isImageKey(webp)).toBe(true);
    expect(isImageKey(jpg)).toBe(true);
  });

  it("creates unique keys", () => {
    const keys = new Set(Array.from({ length: 50 }, () => newImageKey("image/webp")));
    expect(keys.size).toBe(50);
  });

  it.each([
    "threads/../secret.webp",
    "threads/123.webp",
    "other/0b9a1f5e-3c1d-4a7e-8b2f-5d6c7e8f9a0b.webp",
    "threads/0b9a1f5e-3c1d-4a7e-8b2f-5d6c7e8f9a0b.png",
    "threads/0b9a1f5e-3c1d-4a7e-8b2f-5d6c7e8f9a0b.webp/extra",
    "/threads/0b9a1f5e-3c1d-4a7e-8b2f-5d6c7e8f9a0b.webp",
    "threads/0B9A1F5E-3C1D-4A7E-8B2F-5D6C7E8F9A0B.webp",
    "threads/0b9a1f5e-3c1d-1a7e-8b2f-5d6c7e8f9a0b.webp",
    "",
  ])("rejects %j", (key) => {
    expect(isImageKey(key)).toBe(false);
  });

  it("joins the media url without double slashes", () => {
    const key = "threads/a.webp";
    expect(mediaUrl(key, "https://media.example.test")).toBe("https://media.example.test/threads/a.webp");
    expect(mediaUrl(key, "https://media.example.test/")).toBe("https://media.example.test/threads/a.webp");
    expect(mediaUrl("/threads/a.webp", "https://media.example.test//")).toBe(
      "https://media.example.test/threads/a.webp",
    );
  });

  it("defaults the base to NEXT_PUBLIC_MEDIA_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_URL", "https://cdn.example.test/");
    expect(mediaUrl("threads/a.webp")).toBe("https://cdn.example.test/threads/a.webp");
  });

  it("enables images only when the media url is set", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_URL", "");
    expect(imagesEnabled()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_MEDIA_URL", "https://cdn.example.test");
    expect(imagesEnabled()).toBe(true);
  });
});
