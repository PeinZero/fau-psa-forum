import { describe, expect, it, vi } from "vitest";

import { MAX_IMAGE_BYTES, MAX_SOURCE_BYTES } from "@/lib/media/limits";
import { compressImage, ImageError, paintOnWhite, scaledSize, type CompressDeps } from "./compress";

const source = (size = 1000) => new File([new Uint8Array(size)], "holiday.heic", { type: "image/heic" });
const blobOf = (size: number, type: string) => new Blob([new Uint8Array(size)], { type });

function deps(width: number, height: number, encoder: CompressDeps["encode"]) {
  const close = vi.fn();
  const decode = vi.fn(async () => ({ width, height, close }));
  const encode = vi.fn(encoder);
  return { decode, encode, close };
}

describe("scaledSize", () => {
  it("scales landscape by width", () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
  });
  it("scales portrait by height", () => {
    expect(scaledSize(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });
  it("never upscales", () => {
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
    expect(scaledSize(1600, 1600)).toEqual({ width: 1600, height: 1600 });
  });
  it("keeps at least one pixel on extreme panoramas", () => {
    expect(scaledSize(32000, 3)).toEqual({ width: 1600, height: 1 });
  });
});

describe("compressImage", () => {
  it("rejects oversized sources before decoding", async () => {
    const d = deps(10, 10, async () => blobOf(10, "image/webp"));
    const big = source(MAX_SOURCE_BYTES + 1);
    await expect(compressImage(big, d)).rejects.toThrow(ImageError);
    await expect(compressImage(big, d)).rejects.toThrow(/larger than 10 MB/);
    expect(d.decode).not.toHaveBeenCalled();
  });

  it("explains an undecodable photo", async () => {
    const encode = vi.fn();
    const error = await compressImage(source(), {
      decode: async () => {
        throw new Error("InvalidStateError");
      },
      encode,
    }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ImageError);
    expect((error as ImageError).message).toMatch(/JPEG or PNG/);
    expect((error as ImageError).message).toMatch(/Most Compatible/);
    expect(encode).not.toHaveBeenCalled();
  });

  it("encodes WebP at the scaled size and returns a named file", async () => {
    const d = deps(4000, 3000, async () => blobOf(200_000, "image/webp"));
    const result = await compressImage(source(), d);
    expect(d.encode).toHaveBeenCalledTimes(1);
    expect(d.encode).toHaveBeenCalledWith(expect.anything(), 1600, 1200, "image/webp", 0.82);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
    expect(result.file.name).toBe("image.webp");
    expect(result.file.type).toBe("image/webp");
    expect(result.file.size).toBe(200_000);
  });

  it("keeps small images at their size", async () => {
    const d = deps(640, 480, async () => blobOf(1000, "image/webp"));
    const result = await compressImage(source(), d);
    expect(d.encode).toHaveBeenCalledWith(expect.anything(), 640, 480, "image/webp", 0.82);
    expect([result.width, result.height]).toEqual([640, 480]);
  });

  it("falls back to JPEG when the browser answers WebP with PNG", async () => {
    const d = deps(1000, 1000, async (_i, _w, _h, type) =>
      type === "image/webp" ? blobOf(900_000, "image/png") : blobOf(150_000, "image/jpeg"),
    );
    const result = await compressImage(source(), d);
    expect(d.encode.mock.calls.map((c) => c[3])).toEqual(["image/webp", "image/jpeg"]);
    expect(result.file.name).toBe("image.jpg");
    expect(result.file.type).toBe("image/jpeg");
  });

  it("stays on JPEG for the quality retries after a fallback", async () => {
    const sizes = [500_000, 300_000];
    const d = deps(1000, 1000, async (_i, _w, _h, type) =>
      type === "image/webp" ? blobOf(900_000, "image/png") : blobOf(sizes.shift() ?? 1, "image/jpeg"),
    );
    const result = await compressImage(source(), d);
    expect(d.encode.mock.calls.map((c) => [c[3], c[4]])).toEqual([
      ["image/webp", 0.82],
      ["image/jpeg", 0.82],
      ["image/jpeg", 0.72],
    ]);
    expect(result.file.size).toBe(300_000);
  });

  it("retries at lower quality while the result is over 400 KB", async () => {
    const sizes = [700_000, 520_000, 380_000];
    const d = deps(2000, 1000, async () => blobOf(sizes.shift() ?? 1, "image/webp"));
    const result = await compressImage(source(), d);
    expect(d.encode.mock.calls.map((c) => c[4])).toEqual([0.82, 0.72, 0.62]);
    expect(result.file.size).toBe(380_000);
  });

  it("accepts the last attempt when it is under the hard limit", async () => {
    const d = deps(2000, 1000, async () => blobOf(900_000, "image/webp"));
    const result = await compressImage(source(), d);
    expect(d.encode.mock.calls.length).toBeGreaterThan(2);
    expect(result.file.size).toBe(900_000);
  });

  it("fails when the image can't get under the hard limit", async () => {
    const d = deps(2000, 1000, async () => blobOf(MAX_IMAGE_BYTES + 1, "image/webp"));
    await expect(compressImage(source(), d)).rejects.toThrow(/still too large/);
    expect(d.close).toHaveBeenCalled();
  });

  it("fails politely when the encoder produces nothing", async () => {
    const d = deps(100, 100, async () => null);
    await expect(compressImage(source(), d)).rejects.toThrow(ImageError);
  });

  it("closes the decoded image on success", async () => {
    const d = deps(100, 100, async () => blobOf(1000, "image/webp"));
    await compressImage(source(), d);
    expect(d.close).toHaveBeenCalledTimes(1);
  });
});

describe("paintOnWhite", () => {
  it("fills the canvas white before drawing so transparency does not turn black in JPEG", () => {
    const calls: string[] = [];
    const context = {
      fillStyle: "",
      fillRect: vi.fn(() => calls.push(`fill:${context.fillStyle}`)),
      drawImage: vi.fn(() => calls.push("draw")),
    };
    paintOnWhite(context, {} as CanvasImageSource, 100, 50);
    expect(calls).toEqual(["fill:#fff", "draw"]);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 100, 50);
    expect(context.drawImage).toHaveBeenCalledWith({}, 0, 0, 100, 50);
  });
});
