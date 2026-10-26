import type { ImageContentType } from "./limits";

export type ImageInfo = { contentType: ImageContentType; width: number; height: number };

const ascii = (bytes: Uint8Array, start: number, text: string) => {
  if (bytes.length < start + text.length) return false;
  for (let i = 0; i < text.length; i++) {
    if (bytes[start + i] !== text.charCodeAt(i)) return false;
  }
  return true;
};

const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u24le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const u16be = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];

function webpInfo(b: Uint8Array): ImageInfo | null {
  if (!ascii(b, 0, "RIFF") || !ascii(b, 8, "WEBP")) return null;
  let width: number;
  let height: number;
  if (ascii(b, 12, "VP8 ")) {
    if (b.length < 30) return null;
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    width = u16le(b, 26) & 0x3fff;
    height = u16le(b, 28) & 0x3fff;
  } else if (ascii(b, 12, "VP8L")) {
    if (b.length < 25 || b[20] !== 0x2f) return null;
    const bits = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0;
    width = (bits & 0x3fff) + 1;
    height = ((bits >>> 14) & 0x3fff) + 1;
  } else if (ascii(b, 12, "VP8X")) {
    if (b.length < 30) return null;
    width = u24le(b, 24) + 1;
    height = u24le(b, 27) + 1;
  } else {
    return null;
  }
  if (width < 1 || height < 1) return null;
  return { contentType: "image/webp", width, height };
}

const isSof = (m: number) =>
  (m >= 0xc0 && m <= 0xcf) && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;

function jpegInfo(b: Uint8Array): ImageInfo | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) return null;
    while (i < b.length && b[i] === 0xff) i++;
    if (i >= b.length) return null;
    const marker = b[i++];
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    // End of image or start of scan before any frame header: no dimensions to read.
    if (marker === 0xd9 || marker === 0xda) return null;
    if (i + 2 > b.length) return null;
    const length = u16be(b, i);
    if (length < 2) return null;
    if (isSof(marker)) {
      if (length < 8 || i + 7 > b.length) return null;
      const height = u16be(b, i + 3);
      const width = u16be(b, i + 5);
      if (width < 1 || height < 1) return null;
      return { contentType: "image/jpeg", width, height };
    }
    i += length;
  }
  return null;
}

/** Reads the real format and size from the bytes; never trusts a file name or declared type. */
export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
  try {
    return webpInfo(bytes) ?? jpegInfo(bytes);
  } catch {
    return null;
  }
}
