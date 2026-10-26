import { imagesEnabled, mediaUrl } from "@/lib/media/keys";

import { type GalleryImage, ThreadGallery } from "./thread-gallery";

export type ThreadImage = {
  id: number;
  storage_key: string;
  width: number;
  height: number;
  alt_text: string | null;
};

/** Gallery under the thread text, in upload order. */
export function ThreadImages({ images }: { images: readonly ThreadImage[] }) {
  // Without a media address the files can't be reached, so a broken gallery would help nobody.
  if (images.length === 0 || !imagesEnabled()) return null;

  const gallery: GalleryImage[] = images.map((image, i) => ({
    id: image.id,
    src: mediaUrl(image.storage_key),
    width: image.width,
    height: image.height,
    alt: image.alt_text || `Image ${i + 1} of ${images.length}`,
    caption: image.alt_text || null,
  }));
  return <ThreadGallery images={gallery} />;
}
