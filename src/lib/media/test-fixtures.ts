const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
const le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];

function riff(chunk: number[]) {
  return new Uint8Array([...ascii("RIFF"), ...le32(chunk.length + 4), ...ascii("WEBP"), ...chunk]);
}

export function webpLossy(width: number, height: number) {
  const payload = [0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, width & 255, width >> 8, height & 255, height >> 8, 0, 0];
  return riff([...ascii("VP8 "), ...le32(payload.length), ...payload]);
}

export function webpLossless(width: number, height: number) {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  const payload = [0x2f, ...le32(bits), 0, 0];
  return riff([...ascii("VP8L"), ...le32(payload.length), ...payload]);
}

export function webpExtended(width: number, height: number) {
  const w = width - 1;
  const h = height - 1;
  const payload = [0, 0, 0, 0, w & 255, (w >> 8) & 255, w >> 16, h & 255, (h >> 8) & 255, h >> 16];
  return riff([...ascii("VP8X"), ...le32(payload.length), ...payload]);
}

export function jpeg(width: number, height: number, opts: { progressive?: boolean } = {}) {
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...ascii("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const app1 = [0xff, 0xe1, 0x00, 0x06, 1, 2, 3, 4];
  const dqt = [0xff, 0xdb, 0x00, 0x04, 0, 1];
  const sof = [
    0xff, opts.progressive ? 0xc2 : 0xc0, 0x00, 0x0b, 8,
    height >> 8, height & 255, width >> 8, width & 255, 1, 1, 0x11, 0,
  ];
  const sos = [0xff, 0xda, 0x00, 0x08, 1, 1, 0, 0, 0x3f, 0, 1, 2, 3, 0xff, 0xd9];
  return new Uint8Array([0xff, 0xd8, ...app0, ...app1, ...dqt, ...sof, ...sos]);
}

export const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, ...ascii("IHDR"), 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0,
]);
export const GIF_BYTES = new Uint8Array([...ascii("GIF89a"), 1, 0, 1, 0, 0, 0, 0]);
