"use client";

import { type MouseEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/components/ui/cn";

import { ImageLightbox } from "./image-lightbox";
import { ImageUnavailable } from "./image-unavailable";

export type GalleryImage = {
  id: number;
  src: string;
  width: number;
  height: number;
  /** The author's description, or "Image n of m" when they gave none. */
  alt: string;
  /** Only the author's own description; shown under the image in the viewer. */
  caption: string | null;
};

type Layout = "single" | "pair" | "trio";

const listLayouts: Record<Layout, string> = {
  single: "",
  pair: "grid grid-cols-2 gap-2",
  // The first image leads: full width on phones, a large tile beside two stacked ones from sm.
  trio: "grid grid-cols-2 gap-2 sm:grid-cols-3",
};

function tileClass(layout: Layout, index: number): string | undefined {
  if (layout === "single") return undefined;
  if (layout === "trio" && index === 0) return "relative col-span-2 aspect-[3/2] sm:row-span-2 sm:aspect-auto";
  return "relative aspect-[4/3]";
}

const subscribe = () => () => {};

/** Thumbnails link to the files themselves, so the gallery works before (or without) JavaScript; once hydrated a click opens the viewer instead. */
export function ThreadGallery({ images }: { images: readonly GalleryImage[] }) {
  const [current, setCurrent] = useState<number | null>(null);
  const [failed, setFailed] = useState<ReadonlySet<number>>(() => new Set());
  const opener = useRef<HTMLElement | null>(null);
  const enhanced = useSyncExternalStore(subscribe, () => true, () => false);
  const layout: Layout = images.length === 1 ? "single" : images.length === 2 ? "pair" : "trio";

  function markFailed(id: number) {
    setFailed((previous) => (previous.has(id) ? previous : new Set(previous).add(id)));
  }

  useEffect(() => {
    if (current !== null) return;
    const target = opener.current;
    opener.current = null;
    if (target?.isConnected) target.focus();
  }, [current]);

  function open(event: MouseEvent<HTMLAnchorElement>, index: number) {
    // Modified clicks keep the browser's own behaviour: the file in a new tab or window.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener.current = event.currentTarget;
    setCurrent(index);
  }

  return (
    <>
      <ul aria-label="Images" data-layout={layout} className={cn("mt-6", listLayouts[layout])}>
        {images.map((image, index) => (
          <li key={image.id} className={tileClass(layout, index)}>
            {failed.has(image.id) ? (
              <ImageUnavailable
                className={layout === "single" ? "max-h-[28rem] w-full" : "absolute inset-0"}
                style={layout === "single" ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}
              />
            ) : (
              <a
                href={image.src}
                target="_blank"
                rel="noopener"
                onClick={(event) => open(event, index)}
                className={cn(
                  "group cursor-zoom-in rounded-lg",
                  layout === "single" ? "block" : "absolute inset-0",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- uploads arrive compressed, and Vercel Hobby caps image optimisation at 5,000 a month */}
                <img
                  // An image that broke before hydration never reaches onError, so its state is read on mount.
                  ref={(img) => {
                    if (img?.complete && img.naturalWidth === 0) markFailed(image.id);
                  }}
                  onError={() => markFailed(image.id)}
                  src={image.src}
                  width={image.width}
                  height={image.height}
                  alt={image.alt}
                  loading="lazy"
                  decoding="async"
                  className={cn(
                    // A hairline so white screenshots keep their edge on a white page.
                    "rounded-lg bg-surface outline -outline-offset-1 outline-border transition-[filter] duration-150 ease-out group-hover:brightness-95 group-active:brightness-90",
                    // A small upload is framed rather than blown up past its own pixels.
                    layout === "single" ? "h-auto max-h-[28rem] w-full object-scale-down" : "size-full object-cover",
                  )}
                />
                <span className="sr-only">{enhanced ? " (opens full size)" : " (opens full size in a new tab)"}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
      <ImageLightbox
        images={images}
        index={current}
        failed={failed}
        onFail={markFailed}
        onNavigate={setCurrent}
        onClose={() => setCurrent(null)}
      />
    </>
  );
}
