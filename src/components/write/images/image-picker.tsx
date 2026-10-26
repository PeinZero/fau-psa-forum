"use client";

import { AlertCircle, ImagePlus, RotateCcw, X } from "lucide-react";
import {
  type ClipboardEvent,
  type DragEvent,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { fieldClasses, Label } from "@/components/ui/field";
import { MAX_ALT_LENGTH, MAX_IMAGES_PER_THREAD } from "@/lib/media/limits";
import { compressImage, ImageError } from "./compress";
import { carriesFiles, isImageFile, pastedImages } from "./files";

export type ExistingImage = { id: number; url: string; alt: string | null; width: number; height: number };

export type PickedImage = {
  localId: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  alt: string;
};

/** The host wires these on its own area (the thread form), so photos can land anywhere in it. */
export type ImagePickerHandle = {
  /** Adds pasted images; text pastes go on as usual. */
  handlePaste: (event: ClipboardEvent) => void;
  /** For dragenter, dragover, dragleave and drop; drags without files are left alone. */
  handleDrag: (event: DragEvent) => void;
};

type Props = {
  existing: ExistingImage[];
  removedIds: number[];
  picked: PickedImage[];
  onRemovedIdsChange: (ids: number[]) => void;
  onPickedChange: (picked: PickedImage[]) => void;
  /** Lets the form hold its submit until every chosen photo is ready to go up with it. */
  onPreparingChange?: (preparing: boolean) => void;
  disabled?: boolean;
  id: string;
  ref?: Ref<ImagePickerHandle>;
};

const MAX = MAX_IMAGES_PER_THREAD;

// The hairline keeps a white photo from melting into a white page.
const frame = "relative aspect-square overflow-hidden rounded-lg bg-surface ring-1 ring-border";
const tileButton =
  "absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground " +
  "ring-1 ring-border shadow-[0_1px_2px_var(--shadow-color)] transition-colors duration-150 ease-out " +
  "hover:bg-background active:bg-surface-hover disabled:pointer-events-none disabled:opacity-50 pointer-coarse:size-11";

function dropTarget(over: boolean) {
  return cn(
    "group rounded-lg border border-dashed text-center transition-[background-color,border-color] duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    over
      ? "border-accent bg-accent-soft"
      : "border-border-strong/60 hover:border-border-strong hover:bg-surface active:bg-surface-hover",
  );
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function ImagePicker({
  existing,
  removedIds,
  picked,
  onRemovedIdsChange,
  onPickedChange,
  onPreparingChange,
  disabled = false,
  id,
  ref,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState(false);
  // Entering a child fires dragleave on the parent first, so only the outermost leave ends the drag.
  const dragDepth = useRef(0);
  const addRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const refocus = useRef<string | null>(null);
  const restoreAddFocus = useRef(false);

  // Compression is async, so the list is read from here to avoid appending to a stale copy.
  const pickedRef = useRef(picked);
  const removedRef = useRef(removedIds);
  const keptCountRef = useRef(0);

  const kept = existing.filter((image) => !removedIds.includes(image.id));
  useEffect(() => {
    pickedRef.current = picked;
    removedRef.current = removedIds;
    keptCountRef.current = kept.length;
  });
  const shown = kept.length + picked.length;
  const compressing = preparing > 0;
  const used = shown + preparing;
  const full = used >= MAX;
  const accepting = !disabled && !compressing && !full;
  useEffect(() => onPreparingChange?.(compressing), [compressing, onPreparingChange]);
  const over = dragging && accepting;

  // The control that had focus unmounts with its image, so focus is moved to its neighbour.
  useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;
    const list = listRef.current;
    const element =
      (target === "add" ? null : list?.querySelector<HTMLElement>(`[data-focus="${target}"]`)) ?? addRef.current;
    element?.focus();
  });

  // Choosing photos swaps the add control for placeholders; once they are ready, focus comes back.
  useEffect(() => {
    if (compressing || !restoreAddFocus.current) return;
    restoreAddFocus.current = false;
    if (document.activeElement !== document.body) return;
    const removeButtons = listRef.current?.querySelectorAll<HTMLElement>('[data-focus^="remove-"]');
    (addRef.current ?? removeButtons?.[removeButtons.length - 1])?.focus();
  }, [compressing]);

  // Previews that left the list (removed or reset after a submit) are released.
  const knownUrls = useRef(new Set<string>());
  useEffect(() => {
    const current = new Set(picked.map((image) => image.previewUrl));
    for (const url of knownUrls.current) {
      if (!current.has(url)) URL.revokeObjectURL(url);
    }
    knownUrls.current = current;
  }, [picked]);

  // Deferred so that React strict mode's simulated remount doesn't kill live previews.
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(unmountTimer.current);
    return () => {
      unmountTimer.current = setTimeout(() => {
        for (const url of knownUrls.current) URL.revokeObjectURL(url);
        knownUrls.current = new Set();
      }, 0);
    };
  }, []);

  async function addFiles(files: File[]) {
    const images = files.filter(isImageFile);
    const accepted = images.slice(0, Math.max(MAX - shown, 0));
    const messages: string[] = [];
    const notImages = files.length - images.length;
    if (notImages > 0) {
      messages.push(`Only images can be added, so ${plural(notImages, "file was", "files were")} left out.`);
    }
    const leftOver = images.length - accepted.length;
    if (leftOver > 0) {
      messages.push(`Only ${MAX} images fit in a thread, so ${plural(leftOver, "photo was", "photos were")} left out.`);
    }

    setAnnouncement("");
    if (accepted.length === 0) {
      setErrors(messages);
      return;
    }
    setErrors([]);
    restoreAddFocus.current = document.activeElement === addRef.current;
    setPreparing(accepted.length);
    const results = await Promise.all(
      accepted.map(async (file) => {
        try {
          return { ok: true as const, name: file.name, ...(await compressImage(file)) };
        } catch (error) {
          const reason = error instanceof ImageError ? error.message : "Something went wrong while preparing this photo.";
          return { ok: false as const, message: `${file.name}: ${reason}` };
        }
      }),
    );

    const added: PickedImage[] = [];
    for (const result of results) {
      if (!result.ok) {
        messages.push(result.message);
        continue;
      }
      const currentShown = keptCountRef.current + pickedRef.current.length + added.length;
      if (currentShown >= MAX) continue;
      added.push({
        localId: crypto.randomUUID(),
        file: result.file,
        previewUrl: URL.createObjectURL(result.file),
        width: result.width,
        height: result.height,
        alt: "",
      });
    }
    if (added.length > 0) onPickedChange([...pickedRef.current, ...added]);
    setErrors(messages);
    const failed = results.filter((result) => !result.ok).length;
    setAnnouncement(
      `${plural(added.length, "image", "images")} added.` + (failed > 0 ? ` ${failed} could not be added.` : ""),
    );
    setPreparing(0);
  }

  useImperativeHandle(ref, () => ({
    handlePaste(event) {
      if (!accepting || !event.clipboardData) return;
      const images = pastedImages(event.clipboardData, event.target);
      if (images.length === 0) return;
      event.preventDefault();
      void addFiles(images);
    },
    handleDrag(event) {
      if (!carriesFiles(event.dataTransfer)) return;
      // Taken even when no drop fits, or the browser would open the photo in place of the form.
      event.preventDefault();
      switch (event.type) {
        case "dragenter":
          dragDepth.current += 1;
          setDragging(true);
          break;
        case "dragover":
          event.dataTransfer.dropEffect = accepting ? "copy" : "none";
          break;
        case "dragleave":
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
          break;
        case "drop":
          dragDepth.current = 0;
          setDragging(false);
          if (accepting) void addFiles(Array.from(event.dataTransfer.files));
          break;
      }
    },
  }));

  function removePicked(localId: string) {
    const list = pickedRef.current;
    const index = list.findIndex((image) => image.localId === localId);
    const neighbour = list[index + 1] ?? list[index - 1];
    refocus.current = neighbour ? `remove-${neighbour.localId}` : "add";
    onPickedChange(pickedRef.current.filter((image) => image.localId !== localId));
  }

  function setAlt(localId: string, alt: string) {
    onPickedChange(pickedRef.current.map((image) => (image.localId === localId ? { ...image, alt } : image)));
  }

  const numbers = new Map<number | string, number>();
  kept.forEach((image, index) => numbers.set(image.id, index + 1));
  picked.forEach((image, index) => numbers.set(image.localId, kept.length + index + 1));
  const labelId = `${id}-label`;
  const hintId = `${id}-hint`;
  const empty = existing.length + picked.length + preparing === 0;
  const openPicker = () => inputRef.current?.click();

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span id={labelId} className="text-meta font-medium text-foreground">
          Images
        </span>
        {full ? (
          <span className="text-meta tabular-nums text-subtle">
            {MAX} of {MAX} images
          </span>
        ) : null}
      </div>
      <input
        ref={inputRef}
        id={`${id}-file`}
        type="file"
        accept="image/*"
        multiple
        hidden
        tabIndex={-1}
        aria-labelledby={labelId}
        disabled={!accepting}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          // Reset so choosing the same file again after removing it still fires.
          event.target.value = "";
          if (files.length > 0) void addFiles(files);
        }}
      />

      <div role="status" aria-live="polite" className="sr-only">
        {compressing ? `Preparing ${plural(preparing, "image", "images")}…` : announcement}
      </div>

      {errors.length > 0 ? (
        <div
          role="alert"
          className="flex animate-fade-in items-start gap-2 rounded-md border border-danger/25 bg-danger/10 p-3 text-meta text-danger"
        >
          <AlertCircle aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          <ul className="flex min-w-0 flex-col gap-1 break-words">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {empty ? (
        <button
          ref={addRef}
          type="button"
          disabled={!accepting}
          onClick={openPicker}
          aria-labelledby={`${id}-add-title`}
          aria-describedby={`${id}-add-detail ${hintId}`}
          className={cn(dropTarget(over), "flex w-full flex-col items-center px-4 py-6")}
        >
          <span
            aria-hidden
            className={cn(
              "mb-3 flex size-10 items-center justify-center rounded-full transition-colors duration-150 ease-out",
              over ? "bg-raised text-accent" : "bg-surface text-subtle group-hover:bg-raised group-hover:text-muted",
            )}
          >
            <ImagePlus strokeWidth={1.75} className="size-5" />
          </span>
          <span id={`${id}-add-title`} className="text-small font-medium text-foreground">
            {over ? "Drop to add images" : "Add images"}
          </span>
          <span id={`${id}-add-detail`} className="mt-0.5 flex flex-col text-meta text-balance">
            <span className="text-muted pointer-coarse:hidden">Drag or paste photos here, or click to choose</span>
            <span className="hidden text-muted pointer-coarse:inline">Tap to choose photos</span>
            <span className="text-subtle">Up to {MAX} · JPEG, PNG, WebP or iPhone photos</span>
          </span>
        </button>
      ) : (
        <ul ref={listRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {existing.map((image) => {
            const removed = removedIds.includes(image.id);
            return (
              <li key={`existing-${image.id}`} className="flex flex-col gap-1.5">
                <div className={frame}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- served by the image CDN as is */}
                  <img
                    src={image.url}
                    alt={image.alt ?? ""}
                    width={image.width}
                    height={image.height}
                    draggable={false}
                    className={cn("size-full object-cover transition-opacity duration-150", removed && "opacity-30")}
                  />
                  {removed ? (
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        // Bringing it back must not push the thread past the limit.
                        disabled={disabled || full}
                        data-focus={`undo-${image.id}`}
                        aria-label={`Undo removing ${image.alt ? `image "${image.alt}"` : "this image"}`}
                        onClick={() => {
                          refocus.current = `remove-existing-${image.id}`;
                          onRemovedIdsChange(removedRef.current.filter((x) => x !== image.id));
                        }}
                      >
                        <RotateCcw aria-hidden strokeWidth={1.75} />
                        Undo
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={`Remove image ${numbers.get(image.id)}`}
                      data-focus={`remove-existing-${image.id}`}
                      className={tileButton}
                      onClick={() => {
                        refocus.current = `undo-${image.id}`;
                        onRemovedIdsChange([...removedRef.current, image.id]);
                      }}
                    >
                      <X aria-hidden strokeWidth={1.75} className="size-4" />
                    </button>
                  )}
                </div>
                {removed ? <p className="text-meta text-muted">Will be removed when you save.</p> : null}
                {removed && full ? <p className="text-meta text-subtle">Remove another image to keep it.</p> : null}
              </li>
            );
          })}
          {picked.map((image) => {
            const position = numbers.get(image.localId);
            const altId = `${id}-alt-${image.localId}`;
            return (
              <li key={image.localId} className="flex animate-fade-in flex-col gap-1.5">
                <div className={frame}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img
                    src={image.previewUrl}
                    alt={`Image ${position} preview`}
                    width={image.width}
                    height={image.height}
                    draggable={false}
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Remove image ${position}`}
                    data-focus={`remove-${image.localId}`}
                    className={tileButton}
                    onClick={() => removePicked(image.localId)}
                  >
                    <X aria-hidden strokeWidth={1.75} className="size-4" />
                  </button>
                </div>
                <Label htmlFor={altId} className="sr-only">
                  Describe image {position} (optional)
                </Label>
                <input
                  id={altId}
                  value={image.alt}
                  maxLength={MAX_ALT_LENGTH}
                  disabled={disabled}
                  autoComplete="off"
                  placeholder="Add a description"
                  className={cn(fieldClasses, "min-h-8 py-1 pointer-coarse:min-h-11")}
                  onChange={(event) => setAlt(image.localId, event.target.value)}
                />
              </li>
            );
          })}
          {Array.from({ length: preparing }, (_, index) => (
            <li key={`preparing-${index}`} aria-hidden className="flex flex-col gap-1.5">
              <div className="skeleton aspect-square rounded-lg" />
              <div className="skeleton h-8 rounded-md pointer-coarse:h-11" />
            </li>
          ))}
          {full ? null : (
            <li>
              <button
                ref={addRef}
                type="button"
                disabled={!accepting}
                onClick={openPicker}
                aria-label="Add images"
                aria-describedby={`${id}-count ${hintId}`}
                className={cn(dropTarget(over), "flex aspect-square w-full flex-col items-center justify-center gap-0.5 p-2")}
              >
                <ImagePlus
                  aria-hidden
                  strokeWidth={1.75}
                  className={cn(
                    "mb-1.5 size-5 transition-colors duration-150 ease-out",
                    over ? "text-accent" : "text-subtle group-hover:text-muted",
                  )}
                />
                <span className="text-small font-medium text-foreground">{over ? "Drop to add" : "Add"}</span>
                <span id={`${id}-count`} className="text-meta tabular-nums text-subtle">
                  {used} of {MAX} <span className="sr-only">images</span>
                </span>
              </button>
            </li>
          )}
        </ul>
      )}

      <p id={hintId} className="text-meta text-muted">
        Black out names, addresses and ID numbers on documents before uploading.
      </p>
    </div>
  );
}
