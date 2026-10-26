import { describe, expect, it } from "vitest";
import { isImageKey } from "./keys";
import { MAX_IMAGE_BYTES } from "./limits";
import { PNG_BYTES, jpeg, webpLossy } from "./test-fixtures";
import { parseImageUploads, parseRemovedImageIds } from "./uploads";

const file = (bytes: Uint8Array, name: string, type: string) =>
  new File([bytes as unknown as BlobPart], name, { type });
const webp = (w = 800, h = 600) => file(webpLossy(w, h), "a.webp", "image/webp");

function form(files: File[], alts: string[] = []) {
  const fd = new FormData();
  files.forEach((f) => fd.append("images", f));
  alts.forEach((a) => fd.append("imageAlts", a));
  return fd;
}

describe("parseImageUploads", () => {
  it("returns no images when none were sent", async () => {
    expect(await parseImageUploads(new FormData(), 0)).toEqual({ ok: true, images: [] });
  });

  it("parses webp and jpeg with sniffed metadata and keys", async () => {
    const result = await parseImageUploads(
      form([webp(800, 600), file(jpeg(1000, 500), "b.jpg", "image/jpeg")], ["A shelf", ""]),
      0,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.images).toHaveLength(2);
    const [a, b] = result.images;
    expect(a).toMatchObject({ contentType: "image/webp", width: 800, height: 600, alt: "A shelf" });
    expect(a.size).toBe(a.bytes.length);
    expect(isImageKey(a.key)).toBe(true);
    expect(b).toMatchObject({ contentType: "image/jpeg", width: 1000, height: 500, alt: null });
    expect(a.key).not.toBe(b.key);
  });

  it("enforces the count including existing images", async () => {
    expect((await parseImageUploads(form([webp(), webp()]), 2)).ok).toBe(false);
    const result = await parseImageUploads(form([webp(), webp(), webp(), webp()]), 0);
    expect(result).toEqual({ ok: false, error: "A thread can have at most 3 images." });
    expect((await parseImageUploads(form([webp()]), 2)).ok).toBe(true);
  });

  it("rejects oversized files", async () => {
    const big = new Uint8Array(MAX_IMAGE_BYTES + 1);
    big.set(webpLossy(10, 10));
    const result = await parseImageUploads(form([file(big, "a.webp", "image/webp")]), 0);
    expect(result).toEqual({
      ok: false,
      error: "One of the images is too large. Please try again; the forum shrinks photos before uploading.",
    });
  });

  it("rejects a PNG renamed to .webp", async () => {
    const result = await parseImageUploads(form([file(PNG_BYTES, "a.webp", "image/webp")]), 0);
    expect(result.ok).toBe(false);
  });

  it("rejects a declared type that differs from the real one", async () => {
    const result = await parseImageUploads(form([file(webpLossy(10, 10), "a.jpg", "image/jpeg")]), 0);
    expect(result.ok).toBe(false);
  });

  it("rejects oversized dimensions", async () => {
    expect((await parseImageUploads(form([webp(1601, 100)]), 0)).ok).toBe(false);
    expect((await parseImageUploads(form([webp(100, 1601)]), 0)).ok).toBe(false);
    expect((await parseImageUploads(form([webp(1600, 1600)]), 0)).ok).toBe(true);
  });

  it("trims alt text and limits its length", async () => {
    const ok = await parseImageUploads(form([webp()], ["  Library entrance  "]), 0);
    expect(ok.ok && ok.images[0].alt).toBe("Library entrance");
    const blank = await parseImageUploads(form([webp()], ["   "]), 0);
    expect(blank.ok && blank.images[0].alt).toBeNull();
    const edge = await parseImageUploads(form([webp()], ["x".repeat(200)]), 0);
    expect(edge.ok).toBe(true);
    const long = await parseImageUploads(form([webp()], ["x".repeat(201)]), 0);
    expect(long.ok).toBe(false);
  });

  it("ignores empty file entries and string values", async () => {
    const fd = form([new File([], "", { type: "application/octet-stream" }), webp()]);
    fd.append("images", "not a file");
    const result = await parseImageUploads(fd, 2);
    expect(result.ok && result.images).toHaveLength(1);
  });
});

describe("parseRemovedImageIds", () => {
  it("keeps positive integers once and ignores the rest", () => {
    const fd = new FormData();
    ["3", "3", " 7 ", "0", "-2", "1.5", "abc", "", "99999999999999999999"].forEach((v) =>
      fd.append("removeImageIds", v),
    );
    fd.append("removeImageIds", new File(["1"], "x.txt"));
    expect(parseRemovedImageIds(fd)).toEqual([3, 7]);
  });

  it("returns an empty list when absent", () => {
    expect(parseRemovedImageIds(new FormData())).toEqual([]);
  });
});
