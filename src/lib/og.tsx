import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { cacheLife } from "next/cache";
import type { Database } from "@/lib/supabase/database.types";
import { cityLabels } from "@/lib/labels";

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

export const SITE_TAGLINE = "Answers for Pakistani students in Erlangen & Nuremberg";

type OgContent = { title: string; footer?: string };

function titleFontSize(title: string): number {
  if (title.length <= 40) return 76;
  if (title.length <= 80) return 62;
  if (title.length <= 130) return 50;
  return 42;
}

export function renderOgImage({ title, footer }: OgContent) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#08090a",
          backgroundImage: "radial-gradient(circle at 18% 0%, rgba(16,185,129,0.22), rgba(8,9,10,0) 55%)",
          color: "#f7f8f8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "#10b981",
              color: "#04120c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            P
          </div>
          <div style={{ marginLeft: 16, fontSize: 28, color: "#8a8f98", display: "flex" }}>
            PSA FAU Community Forum
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: titleFontSize(title),
            fontWeight: 600,
            letterSpacing: -1.5,
            lineHeight: 1.12,
            lineClamp: 3,
            maxHeight: titleFontSize(title) * 1.12 * 3,
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#8a8f98", minHeight: 34 }}>{footer ?? ""}</div>
      </div>
    ),
    ogSize,
  );
}

function anonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function getPublishedThreadOg(slug: string): Promise<OgContent | null> {
  "use cache";
  cacheLife("hours");
  const { data } = await anonClient()
    .from("threads")
    .select("title, city, categories(name)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  const parts = [data.categories?.name, data.city ? cityLabels[data.city] : null].filter(Boolean);
  return { title: data.title, footer: parts.join(" · ") };
}

export async function getCategoryOg(slug: string): Promise<OgContent | null> {
  "use cache";
  cacheLife("hours");
  const { data } = await anonClient()
    .from("categories")
    .select("name, description")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return { title: data.name, footer: data.description ?? "Category" };
}
