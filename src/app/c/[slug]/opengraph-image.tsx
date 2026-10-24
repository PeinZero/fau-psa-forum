import { getCategoryOg, ogContentType, ogSize, renderOgImage, SITE_TAGLINE } from "@/lib/og";

export const alt = "PSA FAU Community Forum category";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = await getCategoryOg(slug);
  return renderOgImage(content ?? { title: SITE_TAGLINE });
}
