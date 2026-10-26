import { MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION, MAX_SOURCE_BYTES } from "@/lib/media/limits";

/** An error whose message is safe to show to the member as is. */
export class ImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageError";
  }
}

export type CompressedImage = { file: File; width: number; height: number };

export type DecodedImage = { width: number; height: number; close?: () => void };

export type CompressDeps = {
  decode: (file: File) => Promise<DecodedImage>;
  /** Draws the decoded image at the target size and encodes it; null when the browser can't encode. */
  encode: (image: DecodedImage, width: number, height: number, type: string, quality: number) => Promise<Blob | null>;
};

const WEBP = "image/webp";
const JPEG = "image/jpeg";
// Most photos land well under this at the first quality; only dense ones need retries.
const SOFT_TARGET_BYTES = 400_000;
const QUALITIES = [0.82, 0.72, 0.62, 0.5];

const mb = (bytes: number) => Math.round(bytes / (1024 * 1024));

export function scaledSize(width: number, height: number, max = MAX_IMAGE_DIMENSION) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const ratio = max / longest;
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

/** JPEG has no alpha, so transparent pixels must be white before encoding or they turn black. */
export function paintOnWhite(
  context: Pick<CanvasRenderingContext2D, "fillRect" | "drawImage"> & { fillStyle: unknown },
  image: CanvasImageSource,
  width: number,
  height: number,
) {
  context.fillStyle = "#fff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
}

const defaultDeps: CompressDeps = {
  // "from-image" applies the EXIF rotation before the metadata is dropped by re-encoding.
  decode: (file) => createImageBitmap(file, { imageOrientation: "from-image" }),
  async encode(image, width, height, type, quality) {
    const source = image as ImageBitmap;
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) return null;
      paintOnWhite(context, source, width, height);
      return canvas.convertToBlob({ type, quality });
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    paintOnWhite(context, source, width, height);
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  },
};

export async function compressImage(
  file: File,
  deps: Partial<CompressDeps> = {},
): Promise<CompressedImage> {
  const { decode, encode } = { ...defaultDeps, ...deps };

  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageError(`This photo is larger than ${mb(MAX_SOURCE_BYTES)} MB. Choose a smaller one.`);
  }

  let image: DecodedImage;
  try {
    image = await decode(file);
  } catch {
    throw new ImageError(
      "Your browser can't read this photo. Choose a JPEG or PNG, or on iPhone share it as \"Most Compatible\".",
    );
  }

  try {
    const { width, height } = scaledSize(image.width, image.height);
    let type = WEBP;
    let blob: Blob | null = null;

    for (const quality of QUALITIES) {
      blob = await encode(image, width, height, type, quality);
      // Safari answers a WebP request with PNG, which is far too large for a photo.
      if (blob && type === WEBP && blob.type !== WEBP) {
        type = JPEG;
        blob = await encode(image, width, height, type, quality);
      }
      if (blob && blob.size <= SOFT_TARGET_BYTES) break;
    }

    if (!blob || blob.size === 0) {
      throw new ImageError("Your browser couldn't process this photo. Try another one.");
    }
    if (blob.size > MAX_IMAGE_BYTES) {
      throw new ImageError("This photo is still too large after shrinking it. Choose a simpler or smaller one.");
    }

    const outType = blob.type === WEBP || blob.type === JPEG ? blob.type : type;
    const name = outType === WEBP ? "image.webp" : "image.jpg";
    return { file: new File([blob], name, { type: outType }), width, height };
  } finally {
    image.close?.();
  }
}
