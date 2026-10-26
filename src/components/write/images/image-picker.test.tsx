import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { compressImage, ImageError } from "./compress";
import { ImagePicker, type ExistingImage, type ImagePickerHandle, type PickedImage } from "./image-picker";

vi.mock("./compress", async () => {
  class ImageError extends Error {}
  return { compressImage: vi.fn(), ImageError };
});

const compressMock = vi.mocked(compressImage);

const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });
const existingImage = (id: number, alt: string | null = null): ExistingImage => ({
  id,
  url: `https://img.example.test/${id}.webp`,
  alt,
  width: 800,
  height: 600,
});

let urlCounter = 0;
let revoke: ReturnType<typeof vi.fn>;

beforeEach(() => {
  urlCounter = 0;
  revoke = vi.fn();
  URL.createObjectURL = vi.fn(() => `blob:preview-${++urlCounter}`);
  URL.revokeObjectURL = revoke as unknown as typeof URL.revokeObjectURL;
  compressMock.mockReset();
  compressMock.mockImplementation(async (file) => ({
    file: new File(["c"], `${file.name}.webp`, { type: "image/webp" }),
    width: 800,
    height: 600,
  }));
});

afterEach(() => vi.useRealTimers());

function Harness({
  existing = [],
  initialRemoved = [],
  initialPicked = [],
  disabled,
  spy,
}: {
  existing?: ExistingImage[];
  initialRemoved?: number[];
  initialPicked?: PickedImage[];
  disabled?: boolean;
  spy?: { picked: (p: PickedImage[]) => void; removed: (ids: number[]) => void };
}) {
  const [removed, setRemoved] = useState(initialRemoved);
  const [picked, setPicked] = useState(initialPicked);
  const picker = useRef<ImagePickerHandle>(null);
  return (
    <div
      onPaste={(event) => picker.current?.handlePaste(event)}
      onDragEnter={(event) => picker.current?.handleDrag(event)}
      onDragOver={(event) => picker.current?.handleDrag(event)}
      onDragLeave={(event) => picker.current?.handleDrag(event)}
      onDrop={(event) => picker.current?.handleDrag(event)}
    >
      <textarea aria-label="Details" />
      <ImagePicker
        ref={picker}
        id="t"
        existing={existing}
        removedIds={removed}
        picked={picked}
        disabled={disabled}
        onRemovedIdsChange={(ids) => {
          spy?.removed(ids);
          setRemoved(ids);
        }}
        onPickedChange={(p) => {
          spy?.picked(p);
          setPicked(p);
        }}
      />
    </div>
  );
}

const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;
const addButton = () => screen.getByRole("button", { name: "Add images" });
const group = () => screen.getByRole("group", { name: "Images" });
const placeholders = () =>
  screen.queryAllByRole("listitem", { hidden: true }).filter((item) => item.getAttribute("aria-hidden") === "true");
const pdf = () => new File(["%PDF"], "lease.pdf", { type: "application/pdf" });
const fileDrag = (files: File[] = []) => ({ dataTransfer: { files, types: ["Files"], dropEffect: "none" } });
const pasteOf = (files: File[], text = "") => ({
  clipboardData: { files, types: ["Files"], getData: (format: string) => (format === "text/plain" ? text : "") },
});

function holdCompression() {
  const pending: (() => void)[] = [];
  compressMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        pending.push(() => resolve({ file: new File(["c"], "image.webp", { type: "image/webp" }), width: 1, height: 1 }));
      }),
  );
  return () => pending.splice(0).forEach((finish) => finish());
}

describe("ImagePicker", () => {
  it("starts as a drop zone that explains the limit and the privacy rule", () => {
    render(<Harness />);
    expect(group()).toBeInTheDocument();
    expect(addButton()).toBeEnabled();
    expect(addButton()).toHaveAccessibleDescription(/Up to 3 · JPEG, PNG, WebP or iPhone photos/);
    expect(addButton()).toHaveAccessibleDescription(/Black out names, addresses and ID numbers on documents/);
    expect(screen.getByText("Tap to choose photos")).toBeInTheDocument();
    expect(fileInput()).toHaveAttribute("accept", "image/*");
    expect(fileInput()).toHaveAttribute("multiple");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("opens the file dialog from the drop zone by click and keyboard", async () => {
    render(<Harness />);
    const open = vi.spyOn(fileInput(), "click");
    await userEvent.click(addButton());
    expect(open).toHaveBeenCalledTimes(1);
    addButton().focus();
    await userEvent.keyboard("{Enter}");
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("shows an add tile with the count while there is room and a note once full", async () => {
    render(<Harness />);
    await userEvent.upload(fileInput(), [photo("a.jpg")]);
    await screen.findByRole("button", { name: "Remove image 1" });
    expect(addButton()).toHaveAccessibleDescription(/^1 of 3 images/);
    const open = vi.spyOn(fileInput(), "click");
    await userEvent.click(addButton());
    expect(open).toHaveBeenCalled();
    await userEvent.upload(fileInput(), [photo("b.jpg"), photo("c.jpg")]);
    await screen.findByRole("button", { name: "Remove image 3" });
    expect(screen.queryByRole("button", { name: "Add images" })).not.toBeInTheDocument();
    expect(screen.getByText("3 of 3 images")).toBeInTheDocument();
  });

  it("compresses picked files, shows previews and reports them", async () => {
    const picked = vi.fn();
    render(<Harness spy={{ picked, removed: vi.fn() }} />);
    await userEvent.upload(fileInput(), [photo("a.jpg"), photo("b.jpg")]);
    expect(await screen.findByRole("button", { name: "Remove image 2" })).toBeInTheDocument();
    expect(compressMock).toHaveBeenCalledTimes(2);
    const last = picked.mock.calls.at(-1)![0] as PickedImage[];
    expect(last).toHaveLength(2);
    expect(last[0]).toMatchObject({ previewUrl: "blob:preview-1", width: 800, height: 600, alt: "" });
    expect(last[0].file.type).toBe("image/webp");
    expect(last[0].localId).not.toBe(last[1].localId);
  });

  it("limits existing plus picked images to three", async () => {
    render(<Harness existing={[existingImage(1), existingImage(2)]} />);
    await userEvent.upload(fileInput(), [photo("a.jpg"), photo("b.jpg"), photo("c.jpg")]);
    expect(await screen.findByRole("button", { name: "Remove image 3" })).toBeInTheDocument();
    expect(compressMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert")).toHaveTextContent(/2 photos were left out/);
    expect(screen.queryByRole("button", { name: "Add images" })).not.toBeInTheDocument();
    expect(fileInput()).toBeDisabled();
  });

  it("frees a slot when an existing image is removed", async () => {
    render(<Harness existing={[existingImage(1), existingImage(2), existingImage(3)]} />);
    expect(screen.queryByRole("button", { name: "Add images" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove image 2" }));
    expect(addButton()).toBeEnabled();
    expect(addButton()).toHaveAccessibleDescription(/^2 of 3 images/);
  });

  it("keeps Undo from going past the limit", async () => {
    render(<Harness existing={[existingImage(1), existingImage(2), existingImage(3)]} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove image 2" }));
    await userEvent.upload(fileInput(), [photo("a.jpg")]);
    await screen.findByRole("button", { name: "Remove image 3" });
    expect(screen.getByRole("button", { name: /Undo removing/ })).toBeDisabled();
    expect(screen.getByText("Remove another image to keep it.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove image 3" }));
    expect(screen.getByRole("button", { name: /Undo removing/ })).toBeEnabled();
    expect(screen.queryByText("Remove another image to keep it.")).not.toBeInTheDocument();
  });

  it("revokes the preview URL when a picked image is removed", async () => {
    render(<Harness />);
    await userEvent.upload(fileInput(), [photo("a.jpg"), photo("b.jpg")]);
    await userEvent.click(await screen.findByRole("button", { name: "Remove image 1" }));
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith("blob:preview-1");
    expect(screen.getAllByRole("button", { name: /Remove image/ })).toHaveLength(1);
  });

  it("revokes remaining previews on unmount", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { unmount } = render(<Harness />);
    await userEvent.upload(fileInput(), [photo("a.jpg")]);
    await screen.findByRole("button", { name: "Remove image 1" });
    unmount();
    await vi.advanceTimersByTimeAsync(5);
    expect(revoke).toHaveBeenCalledWith("blob:preview-1");
  });

  it("marks an existing image for removal and restores it", async () => {
    const removed = vi.fn();
    render(<Harness existing={[existingImage(7, "Campus")]} spy={{ picked: vi.fn(), removed }} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove image 1" }));
    expect(removed).toHaveBeenLastCalledWith([7]);
    expect(screen.getByText("Will be removed when you save.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Undo removing/ }));
    expect(removed).toHaveBeenLastCalledWith([]);
    expect(screen.queryByText("Will be removed when you save.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove image 1" })).toBeInTheDocument();
  });

  it("starts with initially removed images dimmed", () => {
    render(<Harness existing={[existingImage(1), existingImage(2)]} initialRemoved={[1]} />);
    expect(screen.getByRole("button", { name: /Undo removing/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Remove image/ })).toHaveLength(1);
  });

  it("edits the alt text of a picked image up to 200 characters", async () => {
    const picked = vi.fn();
    render(<Harness spy={{ picked, removed: vi.fn() }} />);
    await userEvent.upload(fileInput(), [photo("a.jpg")]);
    const alt = await screen.findByLabelText("Describe image 1 (optional)");
    expect(alt).toHaveAttribute("maxlength", "200");
    await userEvent.type(alt, "Registration desk");
    expect((picked.mock.calls.at(-1)![0] as PickedImage[])[0].alt).toBe("Registration desk");
    expect(alt).toHaveValue("Registration desk");
  });

  it("shows no alt field for existing images", () => {
    render(<Harness existing={[existingImage(1)]} />);
    expect(screen.queryByLabelText(/Describe image/)).not.toBeInTheDocument();
  });

  it("reports a failing file and keeps the good ones", async () => {
    compressMock.mockImplementation(async (file) => {
      if (file.name === "bad.heic") throw new ImageError("Your browser can't read this photo.");
      return { file: new File(["c"], "image.webp", { type: "image/webp" }), width: 10, height: 10 };
    });
    const picked = vi.fn();
    render(<Harness spy={{ picked, removed: vi.fn() }} />);
    await userEvent.upload(fileInput(), [photo("good.jpg"), new File(["x"], "bad.heic", { type: "image/heic" })], {
      applyAccept: false,
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("bad.heic: Your browser can't read this photo.");
    expect(screen.getAllByRole("button", { name: /Remove image/ })).toHaveLength(1);
    expect(picked.mock.calls.at(-1)![0]).toHaveLength(1);
  });

  it("uses a generic message for unexpected failures", async () => {
    compressMock.mockRejectedValue(new Error("boom"));
    render(<Harness />);
    await userEvent.upload(fileInput(), [photo("a.jpg")]);
    expect(await screen.findByRole("alert")).toHaveTextContent("a.jpg: Something went wrong");
    expect(addButton()).toBeEnabled();
  });

  it("shows a hidden placeholder per photo while they are prepared", async () => {
    const finish = holdCompression();
    render(<Harness />);
    await userEvent.upload(fileInput(), [photo("a.jpg"), photo("b.jpg")]);
    expect(placeholders()).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("Preparing 2 images…");
    expect(addButton()).toBeDisabled();
    expect(addButton()).toHaveAccessibleDescription(/^2 of 3 images/);
    finish();
    await waitFor(() => expect(addButton()).toBeEnabled());
    expect(placeholders()).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: /Remove image/ })).toHaveLength(2);
  });

  it("hides the add tile while placeholders fill the last slots", async () => {
    const finish = holdCompression();
    render(<Harness />);
    await userEvent.upload(fileInput(), [photo("a.jpg"), photo("b.jpg"), photo("c.jpg")]);
    expect(placeholders()).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Add images" })).not.toBeInTheDocument();
    finish();
    await screen.findByRole("button", { name: "Remove image 3" });
  });

  it("returns focus to the add control once chosen photos are ready", async () => {
    const finish = holdCompression();
    render(<Harness />);
    addButton().focus();
    fireEvent.change(fileInput(), { target: { files: [photo("a.jpg")] } });
    await waitFor(() => expect(placeholders()).toHaveLength(1));
    finish();
    await waitFor(() => expect(addButton()).toHaveFocus());
  });

  it("focuses the last new image when the chosen photos fill the thread", async () => {
    render(<Harness existing={[existingImage(1), existingImage(2)]} />);
    addButton().focus();
    fireEvent.change(fileInput(), { target: { files: [photo("a.jpg")] } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove image 3" })).toHaveFocus());
  });

  it("clears earlier errors on the next pick", async () => {
    compressMock.mockRejectedValueOnce(new ImageError("nope"));
    render(<Harness />);
    await userEvent.upload(fileInput(), [photo("a.jpg")]);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await userEvent.upload(fileInput(), [photo("b.jpg")]);
    await screen.findByRole("button", { name: "Remove image 1" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("disables every control when disabled", () => {
    render(
      <Harness
        disabled
        existing={[existingImage(1)]}
        initialPicked={[
          { localId: "p1", file: photo("a.jpg"), previewUrl: "blob:x", width: 1, height: 1, alt: "" },
        ]}
      />,
    );
    expect(addButton()).toBeDisabled();
    for (const button of screen.getAllByRole("button", { name: /Remove image/ })) expect(button).toBeDisabled();
    expect(screen.getByLabelText("Describe image 2 (optional)")).toBeDisabled();
  });

  it("labels each description field uniquely and keeps the preview alt stable while typing", async () => {
    render(<Harness />);
    await userEvent.upload(fileInput(), [photo("a.jpg"), photo("b.jpg")]);
    const second = await screen.findByLabelText("Describe image 2 (optional)");
    expect(screen.getByLabelText("Describe image 1 (optional)")).toBeInTheDocument();
    await userEvent.type(second, "Desk");
    expect(screen.getByAltText("Image 1 preview")).toBeInTheDocument();
    expect(screen.getByAltText("Image 2 preview")).toBeInTheDocument();
  });

  it("announces how many images were added and how many failed", async () => {
    compressMock.mockImplementation(async (file) => {
      if (file.name === "bad.jpg") throw new ImageError("nope");
      return { file: new File(["c"], "image.webp", { type: "image/webp" }), width: 1, height: 1 };
    });
    render(<Harness />);
    await userEvent.upload(fileInput(), [photo("a.jpg"), photo("b.jpg"), photo("bad.jpg")]);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("2 images added. 1 could not be added."));
  });

  it("announces a single addition", async () => {
    render(<Harness />);
    await userEvent.upload(fileInput(), [photo("a.jpg")]);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 image added."));
  });

  it("moves focus to the next Remove button, then the previous, then Add images", async () => {
    render(<Harness />);
    await userEvent.upload(fileInput(), [photo("a.jpg"), photo("b.jpg"), photo("c.jpg")]);
    await userEvent.click(await screen.findByRole("button", { name: "Remove image 2" }));
    expect(screen.getByRole("button", { name: "Remove image 2" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Remove image 2" }));
    expect(screen.getByRole("button", { name: "Remove image 1" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Remove image 1" }));
    expect(addButton()).toHaveFocus();
  });

  it("moves focus to Undo after removing an existing image and back after Undo", async () => {
    render(<Harness existing={[existingImage(7)]} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove image 1" }));
    expect(screen.getByRole("button", { name: /Undo removing/ })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: /Undo removing/ }));
    expect(screen.getByRole("button", { name: "Remove image 1" })).toHaveFocus();
  });
});

describe("ImagePicker drag and drop", () => {
  it("highlights the drop zone while photos are dragged over the picker", () => {
    render(<Harness />);
    fireEvent.dragEnter(group(), fileDrag());
    expect(screen.getByRole("button", { name: "Drop to add images" })).toBeInTheDocument();
    // Moving onto a child enters it before leaving the parent, so the highlight stays.
    fireEvent.dragEnter(screen.getByRole("button", { name: "Drop to add images" }), fileDrag());
    fireEvent.dragLeave(group(), fileDrag());
    expect(screen.getByRole("button", { name: "Drop to add images" })).toBeInTheDocument();
    fireEvent.dragLeave(screen.getByRole("button", { name: "Drop to add images" }), fileDrag());
    expect(addButton()).toBeInTheDocument();
  });

  it("ignores drags that carry no files", () => {
    render(<Harness />);
    const notCancelled = fireEvent.dragOver(group(), { dataTransfer: { files: [], types: ["text/plain"] } });
    expect(notCancelled).toBe(true);
    fireEvent.dragEnter(group(), { dataTransfer: { files: [], types: ["text/plain"] } });
    expect(addButton()).toBeInTheDocument();
  });

  it("adds dropped images and leaves out other files", async () => {
    const picked = vi.fn();
    render(<Harness spy={{ picked, removed: vi.fn() }} />);
    const drag = fileDrag();
    expect(fireEvent.dragOver(group(), drag)).toBe(false);
    expect(drag.dataTransfer.dropEffect).toBe("copy");
    fireEvent.drop(addButton(), fileDrag([photo("a.jpg"), pdf(), photo("b.jpg")]));
    expect(await screen.findByRole("button", { name: "Remove image 2" })).toBeInTheDocument();
    expect(compressMock).toHaveBeenCalledTimes(2);
    expect(picked.mock.calls.at(-1)![0]).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Only images can be added, so 1 file was left out.");
    expect(addButton()).toBeInTheDocument();
  });

  it("drops onto the grid once images are there and caps them at three", async () => {
    render(<Harness existing={[existingImage(1, "Campus")]} />);
    fireEvent.dragEnter(group(), fileDrag());
    expect(screen.getByRole("button", { name: "Add images" })).toHaveTextContent("Drop to add");
    fireEvent.drop(screen.getByAltText("Campus"), fileDrag([photo("a.jpg"), photo("b.jpg"), photo("c.jpg")]));
    expect(await screen.findByRole("button", { name: "Remove image 3" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("so 1 photo was left out");
  });

  it("shows only a message when nothing dropped is an image", async () => {
    render(<Harness />);
    fireEvent.drop(group(), fileDrag([pdf(), pdf()]));
    expect(await screen.findByRole("alert")).toHaveTextContent("Only images can be added, so 2 files were left out.");
    expect(compressMock).not.toHaveBeenCalled();
    expect(placeholders()).toHaveLength(0);
  });

  it("refuses drops while disabled but still keeps the browser from opening the file", () => {
    render(<Harness disabled />);
    const drag = fileDrag();
    fireEvent.dragEnter(group(), drag);
    expect(fireEvent.dragOver(group(), drag)).toBe(false);
    expect(drag.dataTransfer.dropEffect).toBe("none");
    expect(screen.queryByRole("button", { name: "Drop to add images" })).not.toBeInTheDocument();
    expect(fireEvent.drop(group(), fileDrag([photo("a.jpg")]))).toBe(false);
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("refuses drops when the thread already has three images", () => {
    render(<Harness existing={[existingImage(1), existingImage(2), existingImage(3)]} />);
    const drag = fileDrag();
    fireEvent.dragOver(group(), drag);
    expect(drag.dataTransfer.dropEffect).toBe("none");
    fireEvent.drop(group(), fileDrag([photo("a.jpg")]));
    expect(compressMock).not.toHaveBeenCalled();
  });
});

describe("ImagePicker paste", () => {
  it("adds a pasted screenshot without pasting anything into the field", async () => {
    render(<Harness />);
    const notCancelled = fireEvent.paste(screen.getByLabelText("Details"), pasteOf([photo("image.png")]));
    expect(notCancelled).toBe(false);
    expect(await screen.findByRole("button", { name: "Remove image 1" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 image added."));
  });

  it("leaves text pastes to the field", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByLabelText("Details"));
    await userEvent.paste("Anmeldung at the Bürgeramt");
    expect(screen.getByLabelText("Details")).toHaveValue("Anmeldung at the Bürgeramt");
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("ignores pasted images when the thread is full, disabled or still preparing", async () => {
    const { unmount } = render(<Harness existing={[existingImage(1), existingImage(2), existingImage(3)]} />);
    expect(fireEvent.paste(screen.getByLabelText("Details"), pasteOf([photo("a.png")]))).toBe(true);
    unmount();

    render(<Harness disabled />);
    expect(fireEvent.paste(screen.getByLabelText("Details"), pasteOf([photo("a.png")]))).toBe(true);
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("ignores a second paste while the first is being prepared", async () => {
    const finish = holdCompression();
    render(<Harness />);
    fireEvent.paste(screen.getByLabelText("Details"), pasteOf([photo("a.png")]));
    await waitFor(() => expect(placeholders()).toHaveLength(1));
    expect(fireEvent.paste(screen.getByLabelText("Details"), pasteOf([photo("b.png")]))).toBe(true);
    finish();
    await screen.findByRole("button", { name: "Remove image 1" });
    expect(compressMock).toHaveBeenCalledTimes(1);
  });
});
