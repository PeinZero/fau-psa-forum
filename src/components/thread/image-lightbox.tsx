"use client";

import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { type KeyboardEvent, type MouseEvent, type PointerEvent, useEffect, useLayoutEffect, useRef } from "react";

import { cn } from "@/components/ui/cn";

import { ImageUnavailable } from "./image-unavailable";
import type { GalleryImage } from "./thread-gallery";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Horizontal travel that turns a drag into a swipe to the next or previous image. */
const SWIPE_DISTANCE = 48;
/** Movement a finger may make and still count as a tap. */
const TAP_SLOP = 10;

// Controls float over photos of any brightness, so each carries its own fill and hairline.
const control =
  "inline-flex shrink-0 items-center justify-center rounded-full bg-raised/85 text-foreground ring-1 ring-border ring-inset backdrop-blur-sm " +
  "transition-[background-color,box-shadow,translate] duration-150 ease-out hover:bg-raised hover:ring-border-strong/60 active:translate-y-px [&_svg]:shrink-0";
const iconControl = cn(control, "size-10 pointer-coarse:size-11 [&_svg]:size-5");
const pillControl = cn(control, "h-10 gap-1.5 px-3.5 text-meta font-medium pointer-coarse:h-11 [&_svg]:size-4");

type Press = { id: number; x: number; y: number; moved: boolean; backdrop: boolean; swipe: boolean };

/** Anything in the viewer that is not the image, a caption or a control closes it on a tap. */
function isBackdrop(target: EventTarget): boolean {
  return target instanceof HTMLElement && target.hasAttribute("data-lightbox-backdrop");
}

function pinchZoomed(): boolean {
  return (window.visualViewport?.scale ?? 1) > 1.01;
}

/**
 * Full-screen viewer for a thread's images on the native modal `<dialog>`, always dark so photos
 * read the same in either theme. Escape and a tap beside the image close it, ←/→ and swipes move
 * between images, Tab stays inside. The gallery returns focus to the thumbnail that opened it.
 */
export function ImageLightbox({
  images,
  index,
  failed,
  onFail,
  onNavigate,
  onClose,
}: {
  images: readonly GalleryImage[];
  index: number | null;
  failed: ReadonlySet<number>;
  onFail: (id: number) => void;
  onNavigate: (index: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const press = useRef<Press | null>(null);
  const open = index !== null;
  const count = images.length;
  const image = index === null ? null : images[index];
  const label = index === null ? undefined : `Image ${index + 1} of ${count}`;

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter };
    // Keep the scrollbar's space so the page behind does not shift sideways.
    if (window.innerWidth > root.clientWidth) root.style.scrollbarGutter = "stable";
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous.overflow;
      root.style.scrollbarGutter = previous.gutter;
    };
  }, [open]);

  useEffect(() => {
    if (index === null || count < 2) return;
    for (const neighbour of new Set([(index + 1) % count, (index - 1 + count) % count])) {
      const preload = new Image();
      preload.src = images[neighbour].src;
    }
  }, [index, count, images]);

  function step(direction: 1 | -1) {
    if (index === null || count < 2) return;
    onNavigate((index + direction + count) % count);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function settleImage() {
    const img = imageRef.current;
    if (!img) return;
    img.style.transition = "";
    img.style.translate = "";
  }

  function onPointerDown(event: PointerEvent<HTMLDialogElement>) {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    const onControl = event.target instanceof Element && event.target.closest("a, button") !== null;
    press.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      backdrop: isBackdrop(event.target),
      // A pinch-zoomed reader is panning around the photo, not asking for the next one.
      swipe: count > 1 && !onControl && !pinchZoomed(),
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDialogElement>) {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (Math.hypot(dx, dy) > TAP_SLOP) current.moved = true;
    const img = imageRef.current;
    if (current.swipe && img && Math.abs(dx) > Math.abs(dy)) {
      img.style.transition = "none";
      img.style.translate = `${dx}px 0`;
    }
  }

  function onPointerUp(event: PointerEvent<HTMLDialogElement>) {
    const current = press.current;
    if (!current || current.id !== event.pointerId) return;
    settleImage();
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (current.swipe && Math.abs(dx) >= SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
      step(dx < 0 ? 1 : -1);
    }
  }

  function onPointerCancel() {
    press.current = null;
    settleImage();
  }

  // Closing on the click rather than on pointerup, so the tap cannot land on the page underneath.
  function onClick(event: MouseEvent<HTMLDialogElement>) {
    const current = press.current;
    press.current = null;
    if (current?.backdrop && !current.moved && isBackdrop(event.target)) onClose();
  }

  const hasCaptions = images.some((item) => item.caption);

  return (
    <dialog
      ref={ref}
      data-theme="dark"
      aria-label={label}
      aria-modal="true"
      // Focusable itself, so a tap on the photo keeps keyboard focus (Escape, arrows) inside the viewer.
      tabIndex={-1}
      onKeyDown={onKeyDown}
      // A close request that bypassed the keydown (Android back, focus lost) still goes through the gallery's state.
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      className={cn(
        "fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden overscroll-contain border-0 bg-background/95 p-0 text-foreground outline-none backdrop-blur-md",
        "touch-pan-y touch-pinch-zoom select-none backdrop:bg-transparent open:animate-fade-in",
      )}
    >
      {image && (
        <div data-lightbox-backdrop className="flex h-full flex-col">
          <div
            data-lightbox-backdrop
            className="flex items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4 sm:pt-4"
          >
            {count > 1 && (
              <p aria-live="polite" aria-atomic className="pl-1 text-meta font-medium tabular-nums text-muted">
                <span aria-hidden>
                  {(index ?? 0) + 1} / {count}
                </span>
                <span className="sr-only">
                  {label}
                  {image.caption ? `: ${image.caption}` : ""}
                </span>
              </p>
            )}
            <div className="ml-auto flex items-center gap-2">
              <a href={image.src} target="_blank" rel="noopener" className={pillControl}>
                Open original
                <ExternalLink aria-hidden strokeWidth={1.75} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className={iconControl}>
                <X aria-hidden strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div
            data-lightbox-backdrop
            className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-3 sm:px-20"
          >
            {failed.has(image.id) ? (
              <ImageUnavailable className="aspect-[4/3] w-full max-w-md" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- uploads arrive compressed, and Vercel Hobby caps image optimisation at 5,000 a month
              <img
                key={image.id}
                ref={imageRef}
                src={image.src}
                width={image.width}
                height={image.height}
                alt={image.alt}
                draggable={false}
                onError={() => onFail(image.id)}
                className="h-auto max-h-full w-auto max-w-full min-w-0 animate-fade-in rounded-md object-contain transition-[translate] duration-200 ease-out"
              />
            )}
            {count > 1 && (
              <>
                <div className="pointer-events-none absolute inset-y-0 left-2 flex items-center sm:left-4">
                  <button
                    type="button"
                    aria-label="Previous image"
                    onClick={() => step(-1)}
                    className={cn(iconControl, "pointer-events-auto")}
                  >
                    <ChevronLeft aria-hidden strokeWidth={1.75} />
                  </button>
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center sm:right-4">
                  <button
                    type="button"
                    aria-label="Next image"
                    onClick={() => step(1)}
                    className={cn(iconControl, "pointer-events-auto")}
                  >
                    <ChevronRight aria-hidden strokeWidth={1.75} />
                  </button>
                </div>
              </>
            )}
          </div>

          <div
            data-lightbox-backdrop
            className={cn(
              "px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5",
              // Room for a caption is kept on every image so the photo does not jump between them.
              hasCaptions && "min-h-[5.5rem]",
            )}
          >
            {image.caption && (
              // The image's alt already carries this text for screen readers.
              <p aria-hidden className="mx-auto line-clamp-3 max-w-prose text-center text-small text-pretty text-muted">
                {image.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
