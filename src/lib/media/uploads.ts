import { readImageInfo } from "./image-info";
import { newImageKey } from "./keys";
import {
  MAX_ALT_LENGTH,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGES_PER_THREAD,
  type ImageContentType,
} from "./limits";

export type ParsedImage = {
  bytes: Uint8Array;
  contentType: ImageContentType;
  width: number;
  height: number;
  size: number;
  alt: string | null;
  key: string;
};

export type ImageUploadResult = { ok: true; images: ParsedImage[] } | { ok: false; error: string };

const fail = (error: string): ImageUploadResult => ({ ok: false, error });

/** A browser sends an empty, nameless file part when no file was chosen. */
const isFile = (value: FormDataEntryValue): value is File =>
  typeof value !== "string" && value.size > 0;

export async function parseImageUploads(
  formData: FormData,
  existingCount: number,
): Promise<ImageUploadResult> {
  const files = formData.getAll("images").filter(isFile);
  const alts = formData.getAll("imageAlts");
  if (files.length === 0) return { ok: true, images: [] };

  if (existingCount + files.length > MAX_IMAGES_PER_THREAD) {
    return fail(`A thread can have at most ${MAX_IMAGES_PER_THREAD} images.`);
  }

  const images: ParsedImage[] = [];
  for (const [index, file] of files.entries()) {
    if (file.size > MAX_IMAGE_BYTES) {
      return fail(
        "One of the images is too large. Please try again; the forum shrinks photos before uploading.",
      );
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const info = readImageInfo(bytes);
    if (!info || info.contentType !== file.type) {
      return fail("One of the files is not a valid image. Please use a WebP or JPEG photo.");
    }
    if (info.width > MAX_IMAGE_DIMENSION || info.height > MAX_IMAGE_DIMENSION) {
      return fail(
        `One of the images is too large in pixels (at most ${MAX_IMAGE_DIMENSION} px on the longest side).`,
      );
    }
    const rawAlt = alts[index];
    const alt = typeof rawAlt === "string" ? rawAlt.trim() : "";
    if (alt.length > MAX_ALT_LENGTH) {
      return fail(`An image description can have at most ${MAX_ALT_LENGTH} characters.`);
    }
    images.push({
      bytes,
      contentType: info.contentType,
      width: info.width,
      height: info.height,
      size: bytes.length,
      alt: alt || null,
      key: newImageKey(info.contentType),
    });
  }
  return { ok: true, images };
}

export function parseRemovedImageIds(formData: FormData): number[] {
  const ids = new Set<number>();
  for (const value of formData.getAll("removeImageIds")) {
    if (typeof value !== "string" || !/^\d+$/.test(value.trim())) continue;
    const id = Number(value.trim());
    if (Number.isSafeInteger(id) && id > 0) ids.add(id);
  }
  return [...ids];
}
