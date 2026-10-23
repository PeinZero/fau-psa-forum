import { getGuideOg } from "@/components/guides/og";
import { ogContentType, ogSize, renderOgImage, SITE_TAGLINE } from "@/lib/og";

export const alt = "FAU PSA Forum guide";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = await getGuideOg(slug);
  return renderOgImage(content ?? { title: SITE_TAGLINE });
}
