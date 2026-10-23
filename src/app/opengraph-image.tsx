import { ogContentType, ogSize, renderOgImage, SITE_TAGLINE } from "@/lib/og";

export const alt = "FAU PSA Forum";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return renderOgImage({ title: SITE_TAGLINE });
}
