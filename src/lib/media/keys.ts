import { IMAGE_TYPES, type ImageContentType } from "./limits";

const KEY_PATTERN =
  /^threads\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|jpg)$/;

export function newImageKey(type: ImageContentType): string {
  return `threads/${crypto.randomUUID()}.${IMAGE_TYPES[type]}`;
}

export function isImageKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function mediaUrl(key: string, base = process.env.NEXT_PUBLIC_MEDIA_URL): string {
  return `${(base ?? "").replace(/\/+$/, "")}/${key.replace(/^\/+/, "")}`;
}

/** Local development and CI run without storage, so image UI stays hidden there. */
export function imagesEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MEDIA_URL);
}
