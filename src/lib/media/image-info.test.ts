import { describe, expect, it } from "vitest";
import { readImageInfo } from "./image-info";
import { GIF_BYTES, PNG_BYTES, jpeg, webpExtended, webpLossless, webpLossy } from "./test-fixtures";

describe("readImageInfo", () => {
  it("reads lossy WebP", () => {
    expect(readImageInfo(webpLossy(1600, 900))).toEqual({ contentType: "image/webp", width: 1600, height: 900 });
  });

  it("reads lossless WebP", () => {
    expect(readImageInfo(webpLossless(640, 480))).toEqual({ contentType: "image/webp", width: 640, height: 480 });
  });

  it("reads extended WebP with large canvases", () => {
    expect(readImageInfo(webpExtended(70000, 3))).toEqual({ contentType: "image/webp", width: 70000, height: 3 });
  });

  it("reads baseline JPEG after APP segments", () => {
    expect(readImageInfo(jpeg(1200, 800))).toEqual({ contentType: "image/jpeg", width: 1200, height: 800 });
  });

  it("reads progressive JPEG", () => {
    expect(readImageInfo(jpeg(300, 2000, { progressive: true }))).toEqual({
      contentType: "image/jpeg",
      width: 300,
      height: 2000,
    });
  });

  it("rejects other formats and garbage", () => {
    expect(readImageInfo(PNG_BYTES)).toBeNull();
    expect(readImageInfo(GIF_BYTES)).toBeNull();
    expect(readImageInfo(new Uint8Array())).toBeNull();
    expect(readImageInfo(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]))).toBeNull();
    expect(readImageInfo(new TextEncoder().encode("<svg></svg>"))).toBeNull();
  });

  it("rejects RIFF files that are not WebP", () => {
    const bytes = webpLossy(10, 10).slice();
    bytes.set([...("WAVE")].map((c) => c.charCodeAt(0)), 8);
    expect(readImageInfo(bytes)).toBeNull();
  });

  it("rejects truncated data", () => {
    for (const full of [webpLossy(10, 10), webpLossless(10, 10), webpExtended(10, 10), jpeg(10, 10)]) {
      for (let n = 0; n < Math.min(full.length, 25); n++) {
        expect(readImageInfo(full.slice(0, n))).toBeNull();
      }
    }
  });

  it("rejects a lossy WebP without the frame start code", () => {
    const bytes = webpLossy(10, 10).slice();
    bytes[23] = 0;
    expect(readImageInfo(bytes)).toBeNull();
  });

  it("rejects JPEG with zero dimensions or a bad segment length", () => {
    expect(readImageInfo(jpeg(0, 10))).toBeNull();
    const bad = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01, 0, 0]);
    expect(readImageInfo(bad)).toBeNull();
  });

  it("returns null when the scan starts before any frame header", () => {
    expect(readImageInfo(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2, 0, 0]))).toBeNull();
  });
});
