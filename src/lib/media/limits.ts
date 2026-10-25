export const MAX_IMAGES_PER_THREAD = 3;
/** Size after the browser has compressed the photo. */
export const MAX_IMAGE_BYTES = 1_000_000;
export const MAX_IMAGE_DIMENSION = 1600;
/** Size of the original photo a member picks, checked before compressing. */
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_ALT_LENGTH = 200;

/** Safari cannot encode WebP, so JPEG is accepted as the fallback. */
export const IMAGE_TYPES = { "image/webp": "webp", "image/jpeg": "jpg" } as const;

export type ImageContentType = keyof typeof IMAGE_TYPES;
