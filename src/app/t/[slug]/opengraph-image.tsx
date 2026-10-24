import { getPublishedThreadOg, ogContentType, ogSize, renderOgImage, SITE_TAGLINE } from "@/lib/og";

export const alt = "PSA FAU Community Forum thread";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = await getPublishedThreadOg(slug);
  return renderOgImage(content ?? { title: SITE_TAGLINE });
}
