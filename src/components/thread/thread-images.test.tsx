import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { type ThreadImage, ThreadImages } from "./thread-images";

const MEDIA = "https://media.psa-fau.test";

const formPhoto: ThreadImage = {
  id: 41,
  storage_key: "threads/3f2b8c1e-9a4d-4c6e-8b1f-2d7e5a9c0b13.webp",
  width: 1600,
  height: 1200,
  alt_text: "Anmeldung form from the Bürgeramt Erlangen, page 1",
};
const queuePhoto: ThreadImage = {
  id: 42,
  storage_key: "threads/a81c4e07-5b2f-4d39-9e6a-7c0f1b3d8e52.jpg",
  width: 1200,
  height: 1600,
  alt_text: null,
};
const mapPhoto: ThreadImage = {
  id: 43,
  storage_key: "threads/c5d9f2a6-1e7b-4a83-b0c4-6f8e2d1a9b77.webp",
  width: 1600,
  height: 900,
  alt_text: "Bus 30 stop outside the Technische Fakultät",
};
const three = [formPhoto, queuePhoto, mapPhoto];

const url = (image: ThreadImage) => `${MEDIA}/${image.storage_key}`;

let preloaded: string[] = [];

beforeAll(() => {
  // jsdom lacks the modal dialog API.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_MEDIA_URL", MEDIA);
  preloaded = [];
  vi.stubGlobal(
    "Image",
    class {
      set src(value: string) {
        preloaded.push(value);
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function thumbnails() {
  return within(screen.getByRole("list", { name: "Images" }));
}

async function openViewer(images: ThreadImage[], thumbnail: RegExp) {
  const user = userEvent.setup();
  render(<ThreadImages images={images} />);
  await user.click(thumbnails().getByRole("link", { name: thumbnail }));
  return user;
}

function viewer() {
  const dialog = document.querySelector("dialog")!;
  expect(dialog).toHaveAttribute("open");
  return dialog;
}

/** The area around the photo, where a tap closes the viewer. */
function stage() {
  return viewer().querySelector("img")!.parentElement!;
}

describe("ThreadImages gallery", () => {
  it("renders nothing without a media address", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_URL", "");
    const { container } = render(<ThreadImages images={three} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a thread without images", () => {
    const { container } = render(<ThreadImages images={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links every thumbnail to its full file so it works without JavaScript", () => {
    render(<ThreadImages images={three} />);
    const links = thumbnails().getAllByRole("link");
    expect(links).toHaveLength(3);
    links.forEach((link, i) => {
      expect(link).toHaveAttribute("href", url(three[i]));
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  it("reserves each image's space and loads it lazily", () => {
    render(<ThreadImages images={[formPhoto]} />);
    const img = thumbnails().getByRole("img");
    expect(img).toHaveAttribute("src", url(formPhoto));
    expect(img).toHaveAttribute("width", "1600");
    expect(img).toHaveAttribute("height", "1200");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("uses the author's description as alt text and falls back to the position", () => {
    render(<ThreadImages images={three} />);
    expect(thumbnails().getByRole("img", { name: formPhoto.alt_text! })).toBeInTheDocument();
    expect(thumbnails().getByRole("img", { name: "Image 2 of 3" })).toBeInTheDocument();
    expect(thumbnails().getByRole("img", { name: mapPhoto.alt_text! })).toBeInTheDocument();
  });

  it("shows one image across the column at its own aspect ratio", () => {
    render(<ThreadImages images={[queuePhoto]} />);
    const list = screen.getByRole("list", { name: "Images" });
    expect(list).toHaveAttribute("data-layout", "single");
    expect(thumbnails().getByRole("img", { name: "Image 1 of 1" })).toHaveClass("w-full", "h-auto", "object-scale-down");
  });

  it("shows two images as equal tiles", () => {
    render(<ThreadImages images={[formPhoto, queuePhoto]} />);
    expect(screen.getByRole("list", { name: "Images" })).toHaveAttribute("data-layout", "pair");
    for (const item of thumbnails().getAllByRole("listitem")) expect(item).toHaveClass("aspect-[4/3]");
  });

  it("leads three images with the first as the large tile", () => {
    render(<ThreadImages images={three} />);
    expect(screen.getByRole("list", { name: "Images" })).toHaveAttribute("data-layout", "trio");
    const [first, second, third] = thumbnails().getAllByRole("listitem");
    expect(first).toHaveClass("col-span-2", "sm:row-span-2");
    expect(second).toHaveClass("aspect-[4/3]");
    expect(third).toHaveClass("aspect-[4/3]");
  });
});

describe("ThreadImages viewer", () => {
  it("opens on the clicked thumbnail with counter, caption, original link and focus on Close", async () => {
    await openViewer(three, /Anmeldung form/);
    const dialog = screen.getByRole("dialog", { name: "Image 1 of 3" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText("1 / 3")).toBeInTheDocument();
    expect(within(dialog).getByRole("img", { name: formPhoto.alt_text! })).toHaveAttribute("src", url(formPhoto));
    expect(within(dialog).getByText(formPhoto.alt_text!, { selector: "p[aria-hidden]" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /Open original/ })).toHaveAttribute("href", url(formPhoto));
    expect(within(dialog).getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("shows no caption for an image without a description", async () => {
    await openViewer(three, /Image 2 of 3/);
    const dialog = screen.getByRole("dialog", { name: "Image 2 of 3" });
    expect(dialog.querySelector("p[aria-hidden]")).not.toBeInTheDocument();
  });

  it("moves with the arrow keys and wraps around the ends", async () => {
    const user = await openViewer(three, /Image 2 of 3/);
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("dialog", { name: "Image 3 of 3" })).toBeInTheDocument();
    expect(within(viewer()).getByText("3 / 3")).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("dialog", { name: "Image 1 of 3" })).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("dialog", { name: "Image 3 of 3" })).toBeInTheDocument();
  });

  it("moves with the previous and next buttons", async () => {
    const user = await openViewer(three, /Image 2 of 3/);
    await user.click(screen.getByRole("button", { name: "Next image" }));
    expect(within(viewer()).getByRole("img", { name: mapPhoto.alt_text! })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous image" }));
    await user.click(screen.getByRole("button", { name: "Previous image" }));
    expect(screen.getByRole("dialog", { name: "Image 1 of 3" })).toBeInTheDocument();
  });

  it("announces the new position and description to screen readers", async () => {
    const user = await openViewer(three, /Image 2 of 3/);
    await user.keyboard("{ArrowRight}");
    const live = viewer().querySelector("[aria-live]");
    expect(live).toHaveTextContent(`Image 3 of 3: ${mapPhoto.alt_text}`);
  });

  it("closes on Escape and returns focus to the thumbnail that opened it", async () => {
    const user = await openViewer(three, /Image 2 of 3/);
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Escape}");
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
    expect(thumbnails().getByRole("link", { name: /Image 2 of 3/ })).toHaveFocus();
  });

  it("closes with the close button and with the browser's close request", async () => {
    const user = await openViewer(three, /Bus 30/);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
    expect(thumbnails().getByRole("link", { name: /Bus 30/ })).toHaveFocus();

    await user.click(thumbnails().getByRole("link", { name: /Bus 30/ }));
    fireEvent(viewer(), new Event("cancel", { cancelable: true }));
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("keeps Tab inside the viewer", async () => {
    const user = await openViewer(three, /Anmeldung form/);
    screen.getByRole("button", { name: "Next image" }).focus();
    await user.tab();
    expect(screen.getByRole("link", { name: /Open original/ })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Next image" })).toHaveFocus();
  });

  it("leaves out the counter and arrows for a single image", async () => {
    const user = await openViewer([formPhoto], /Anmeldung form/);
    const dialog = screen.getByRole("dialog", { name: "Image 1 of 1" });
    expect(within(dialog).queryByRole("button", { name: "Previous image" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();
    expect(within(dialog).queryByText("1 / 1")).not.toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("dialog", { name: "Image 1 of 1" })).toBeInTheDocument();
  });

  it("leaves a modified click to the browser", () => {
    render(<ThreadImages images={three} />);
    const link = thumbnails().getByRole("link", { name: /Bus 30/ });
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { ctrlKey: true });
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
  });

  it("locks the page scroll while open", async () => {
    const user = await openViewer(three, /Bus 30/);
    expect(document.documentElement.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("preloads the neighbouring images", async () => {
    await openViewer(three, /Anmeldung form/);
    expect(preloaded.sort()).toEqual([url(queuePhoto), url(mapPhoto)].sort());
  });

  it("preloads nothing for a single image", async () => {
    await openViewer([formPhoto], /Anmeldung form/);
    expect(preloaded).toEqual([]);
  });

  it("swipes left to the next image and right to the previous one", async () => {
    await openViewer(three, /Image 2 of 3/);
    const swipe = (from: number, to: number) => {
      const target = viewer().querySelector("img")!;
      fireEvent.pointerDown(target, { pointerId: 1, isPrimary: true, clientX: from, clientY: 300 });
      fireEvent.pointerMove(target, { pointerId: 1, isPrimary: true, clientX: (from + to) / 2, clientY: 302 });
      fireEvent.pointerUp(target, { pointerId: 1, isPrimary: true, clientX: to, clientY: 305 });
    };
    swipe(300, 180);
    expect(screen.getByRole("dialog", { name: "Image 3 of 3" })).toBeInTheDocument();
    swipe(150, 290);
    swipe(150, 290);
    expect(screen.getByRole("dialog", { name: "Image 1 of 3" })).toBeInTheDocument();
  });

  it("ignores a short or mostly vertical drag", async () => {
    await openViewer(three, /Image 2 of 3/);
    const img = viewer().querySelector("img")!;
    fireEvent.pointerDown(img, { pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 });
    fireEvent.pointerUp(img, { pointerId: 1, isPrimary: true, clientX: 270, clientY: 300 });
    fireEvent.pointerDown(img, { pointerId: 1, isPrimary: true, clientX: 300, clientY: 300 });
    fireEvent.pointerUp(img, { pointerId: 1, isPrimary: true, clientX: 240, clientY: 420 });
    expect(screen.getByRole("dialog", { name: "Image 2 of 3" })).toBeInTheDocument();
  });

  it("closes on a tap beside the image but not on the image or after a drag", async () => {
    const user = await openViewer(three, /Image 2 of 3/);
    await user.click(viewer().querySelector("img")!);
    expect(viewer()).toBeInTheDocument();

    fireEvent.pointerDown(stage(), { pointerId: 1, isPrimary: true, clientX: 20, clientY: 300 });
    fireEvent.pointerMove(stage(), { pointerId: 1, isPrimary: true, clientX: 20, clientY: 360 });
    fireEvent.pointerUp(stage(), { pointerId: 1, isPrimary: true, clientX: 20, clientY: 360 });
    fireEvent.click(stage());
    expect(viewer()).toBeInTheDocument();

    await user.click(stage());
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
    expect(thumbnails().getByRole("link", { name: /Image 2 of 3/ })).toHaveFocus();
  });
});

describe("ThreadImages broken files", () => {
  it("replaces a thumbnail that fails to load with a calm placeholder in the same tile", () => {
    render(<ThreadImages images={three} />);
    fireEvent.error(thumbnails().getByRole("img", { name: "Image 2 of 3" }));
    const items = thumbnails().getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveClass("aspect-[4/3]");
    expect(within(items[1]).getByText("Image unavailable")).toBeInTheDocument();
    expect(within(items[1]).queryByRole("link")).not.toBeInTheDocument();
    expect(within(items[1]).queryByRole("img")).not.toBeInTheDocument();
    expect(thumbnails().getAllByRole("link")).toHaveLength(2);
  });

  it("keeps a single broken image's frame at its aspect ratio", () => {
    render(<ThreadImages images={[queuePhoto]} />);
    fireEvent.error(thumbnails().getByRole("img"));
    const placeholder = thumbnails().getByText("Image unavailable");
    expect(placeholder).toHaveStyle({ aspectRatio: "1200 / 1600" });
    expect(placeholder).toHaveClass("w-full", "max-h-[28rem]");
  });

  it("catches a file that broke before the page became interactive", () => {
    vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(true);
    render(<ThreadImages images={[formPhoto]} />);
    expect(thumbnails().getByText("Image unavailable")).toBeInTheDocument();
  });

  it("shows the placeholder in the viewer for a file that fails there or already failed", async () => {
    const user = await openViewer(three, /Anmeldung form/);
    fireEvent.error(within(viewer()).getByRole("img"));
    expect(within(viewer()).getByText("Image unavailable")).toBeInTheDocument();
    expect(thumbnails().getAllByRole("link")).toHaveLength(2);

    await user.keyboard("{ArrowRight}");
    expect(within(viewer()).getByRole("img", { name: "Image 2 of 3" })).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(within(viewer()).getByText("Image unavailable")).toBeInTheDocument();
  });
});
