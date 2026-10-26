// Windows browsers often hand over iPhone photos without a type; compressing them explains what to do.
const HEIC = /\.(heic|heif)$/i;

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || HEIC.test(file.name);
}

export type ClipboardData = { files: ArrayLike<File>; getData: (format: string) => string };

/**
 * The images a paste should add. Spreadsheets and word processors put a picture of the copied text
 * on the clipboard beside the text itself; pasted into a text field, the text is what was meant.
 */
export function pastedImages(data: ClipboardData, target: EventTarget | null): File[] {
  const images = Array.from(data.files).filter(isImageFile);
  if (images.length === 0) return [];
  const intoTextField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
  return intoTextField && data.getData("text/plain").trim() ? [] : images;
}

/** File drags from the desktop; dragging selected text carries none and is left to the browser. */
export function carriesFiles(data: Pick<DataTransfer, "types"> | null): boolean {
  return Array.from(data?.types ?? []).includes("Files");
}
