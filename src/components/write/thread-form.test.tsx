import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FormState } from "./actions";
import { compressImage } from "./images/compress";
import { firstInvalidControl, ThreadForm, type ThreadFormValues } from "./thread-form";

vi.mock("@/components/duplicates/similar-threads", () => ({ SimilarThreads: () => null }));
vi.mock("./images/compress", () => ({ compressImage: vi.fn(), ImageError: class extends Error {} }));

const categories = [
  { id: 1, slug: "housing", name: "Housing", description: "Flats" },
  { id: 2, slug: "visa", name: "Visa", description: null },
];

const empty: ThreadFormValues = { title: "", body: "", categoryId: null, city: null };

function setup(
  overrides: Partial<Parameters<typeof ThreadForm>[0]> = {},
  action: (formData: FormData) => Promise<FormState> = vi.fn().mockResolvedValue({}),
) {
  render(
    <ThreadForm
      categories={categories}
      initial={empty}
      submitLabel="Post thread"
      pendingLabel="Posting…"
      action={action}
      {...overrides}
    />,
  );
  return { action: action as ReturnType<typeof vi.fn> };
}

async function fillValid() {
  await userEvent.type(screen.getByLabelText("Title"), "How do I register?");
  await userEvent.click(screen.getByRole("radio", { name: /Housing/ }));
  await userEvent.click(screen.getByRole("radio", { name: "Erlangen" }));
  await userEvent.type(screen.getByLabelText("Details"), "Details here");
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});

afterEach(() => vi.unstubAllGlobals());

describe("ThreadForm submission", () => {
  it("passes title, body, category and city to the action as FormData", async () => {
    const { action } = setup();
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const data = action.mock.calls[0][0] as FormData;
    expect(data.get("title")).toBe("How do I register?");
    expect(data.get("body")).toBe("Details here");
    expect(data.get("categoryId")).toBe("1");
    expect(data.get("city")).toBe("erlangen");
  });

  it("seeds the fields from initial values", () => {
    setup({ initial: { title: "Existing title", body: "Existing body", categoryId: 2, city: "both" } });
    expect(screen.getByLabelText("Title")).toHaveValue("Existing title");
    expect(screen.getByLabelText("Details")).toHaveValue("Existing body");
    expect(screen.getByRole("radio", { name: "Visa" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Both cities" })).toBeChecked();
  });

  it("shows the pending label while the action runs and disables the fields", async () => {
    let finish!: (state: FormState) => void;
    const action = vi.fn(() => new Promise<FormState>((resolve) => (finish = resolve)));
    setup({}, action);
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    const pending = await screen.findByRole("button", { name: "Posting…" });
    expect(pending).toBeDisabled();
    expect(screen.getByLabelText("Title")).toBeDisabled();
    await act(async () => finish({}));
    expect(screen.getByRole("button", { name: "Post thread" })).toBeEnabled();
  });

  it("submits from the body with Cmd+Enter and Ctrl+Enter", async () => {
    const { action } = setup();
    await fillValid();
    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
  });

  it("does not submit on a plain Enter in the body", async () => {
    const { action } = setup();
    await fillValid();
    await userEvent.keyboard("{Enter}");
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Details")).toHaveValue("Details here\n");
  });
});

describe("ThreadForm errors", () => {
  const failure: FormState = {
    error: "Please fix the highlighted fields.",
    fieldErrors: { title: "Title must be at least 8 characters." },
  };

  it("shows the form error and field error", async () => {
    setup({}, vi.fn().mockResolvedValue(failure));
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    expect(await screen.findByText("Please fix the highlighted fields.")).toHaveAttribute("role", "alert");
    expect(screen.getByText("Title must be at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute("aria-invalid", "true");
  });

  it("focuses the first invalid control once the form is enabled again", async () => {
    setup({}, vi.fn().mockResolvedValue(failure));
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    await screen.findByText("Please fix the highlighted fields.");
    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveFocus());
  });

  it("focuses the category radio when only the category is invalid", async () => {
    setup(
      { initial: { ...empty, categoryId: 2 } },
      vi.fn().mockResolvedValue({ error: "x", fieldErrors: { categoryId: "Please choose a category." } }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    await screen.findByText("Please choose a category.");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Visa" })).toHaveFocus());
  });

  it("clears a field error as soon as that field is edited", async () => {
    setup({}, vi.fn().mockResolvedValue(failure));
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    await screen.findByText("Title must be at least 8 characters.");
    await userEvent.type(screen.getByLabelText("Title"), "a");
    expect(screen.queryByText("Title must be at least 8 characters.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Title")).not.toHaveAttribute("aria-invalid");
  });

  it("leaves other field errors alone when one field is edited", async () => {
    setup(
      {},
      vi.fn().mockResolvedValue({ error: "x", fieldErrors: { title: "Bad title", body: "Bad body" } }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    await screen.findByText("Bad title");
    await userEvent.type(screen.getByLabelText("Title"), "a");
    expect(screen.queryByText("Bad title")).not.toBeInTheDocument();
    expect(screen.getByText("Bad body")).toBeInTheDocument();
  });

  it("shows a general error without field errors and does not move focus", async () => {
    setup({}, vi.fn().mockResolvedValue({ error: "Sign in required." }));
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in required.");
    expect(screen.getByLabelText("Title")).not.toHaveFocus();
  });

  it("returns to the write view when a body error comes back from preview", async () => {
    setup({ initial: { ...empty, body: "text" } }, vi.fn().mockResolvedValue({ error: "x", fieldErrors: { body: "Too long" } }));
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    await screen.findByText("Too long");
    expect(screen.getByLabelText("Details")).toBeVisible();
  });
});

describe("firstInvalidControl", () => {
  function formFrom(html: string) {
    const form = document.createElement("form");
    form.innerHTML = html;
    document.body.append(form);
    return form;
  }

  afterEach(() => document.body.replaceChildren());

  it("returns null when nothing is invalid", () => {
    expect(firstInvalidControl(formFrom('<input id="a">'))).toBeNull();
  });

  it("returns the invalid element itself for plain controls", () => {
    const form = formFrom('<input id="a"><input id="b" aria-invalid="true">');
    expect(firstInvalidControl(form)?.id).toBe("b");
  });

  it("returns the checked radio of an invalid fieldset", () => {
    const form = formFrom(
      '<fieldset aria-invalid="true"><input type="radio" id="r1" name="x"><input type="radio" id="r2" name="x" checked></fieldset>',
    );
    expect(firstInvalidControl(form)?.id).toBe("r2");
  });

  it("returns the first radio of an invalid fieldset with nothing checked", () => {
    const form = formFrom(
      '<fieldset aria-invalid="true"><input type="radio" id="r1" name="x"><input type="radio" id="r2" name="x"></fieldset>',
    );
    expect(firstInvalidControl(form)?.id).toBe("r1");
  });
});

describe("ThreadForm preview", () => {
  it("hides the textarea but still submits the body", async () => {
    const { action } = setup();
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByLabelText("Details")).not.toBeVisible();
    expect(screen.getByLabelText("Preview")).toHaveTextContent("Details here");
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect((action.mock.calls[0][0] as FormData).get("body")).toBe("Details here");
  });

  it("says there is nothing to preview for blank text", async () => {
    setup();
    await userEvent.type(screen.getByLabelText("Details"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByText("Nothing to preview yet.")).toBeInTheDocument();
  });

  it("returns to the editor from preview", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    await userEvent.click(screen.getByRole("button", { name: "Write" }));
    expect(screen.getByLabelText("Details")).toBeVisible();
    expect(screen.queryByText("Nothing to preview yet.")).not.toBeInTheDocument();
  });
});

describe("ThreadForm chrome", () => {
  it("renders the Cancel link only with cancelHref", () => {
    setup({ cancelHref: "/t/abc" });
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/t/abc");
  });

  it("omits the Cancel link by default", () => {
    setup();
    expect(screen.queryByRole("link", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("renders the footnote", () => {
    setup({ footnote: "A moderator reviews it first." });
    expect(screen.getByText("A moderator reviews it first.")).toBeInTheDocument();
  });

  it("shows the body counter near the limit", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "x".repeat(19000) } });
    expect(screen.getByText("1,000 characters left")).toBeInTheDocument();
  });
});

describe("ThreadForm images", () => {
  const compressMock = vi.mocked(compressImage);
  const screenshot = () => new File(["png"], "image.png", { type: "image/png" });
  const paste = (target: Element, files: File[], text = "") =>
    fireEvent.paste(target, {
      clipboardData: { files, types: ["Files"], getData: (format: string) => (format === "text/plain" ? text : "") },
    });

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    compressMock.mockReset();
    compressMock.mockResolvedValue({
      file: new File(["c"], "image.webp", { type: "image/webp" }),
      width: 800,
      height: 600,
    });
  });

  it("hides the picker when image storage is off", () => {
    setup();
    expect(screen.queryByRole("group", { name: "Images" })).not.toBeInTheDocument();
  });

  it("adds a screenshot pasted into the title and submits it with its description", async () => {
    const { action } = setup({ images: { existing: [] } });
    await fillValid();
    expect(paste(screen.getByLabelText("Title"), [screenshot()])).toBe(false);
    expect(await screen.findByRole("button", { name: "Remove image 1" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("How do I register?");
    await userEvent.type(screen.getByLabelText("Describe image 1 (optional)"), "Bürgeramt form");
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const data = action.mock.calls[0][0] as FormData;
    expect(data.getAll("images")).toHaveLength(1);
    expect((data.get("images") as File).type).toBe("image/webp");
    expect(data.getAll("imageAlts")).toEqual(["Bürgeramt form"]);
  });

  it("keeps a plain text paste in the body", async () => {
    setup({ images: { existing: [] } });
    await userEvent.click(screen.getByLabelText("Details"));
    await userEvent.paste("Termin at the Ausländerbehörde");
    expect(screen.getByLabelText("Details")).toHaveValue("Termin at the Ausländerbehörde");
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("pastes the text when a spreadsheet also puts a picture of it on the clipboard", () => {
    setup({ images: { existing: [] } });
    expect(paste(screen.getByLabelText("Details"), [screenshot()], "Miete\t450")).toBe(true);
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("ignores pasted images without the picker", () => {
    setup();
    expect(paste(screen.getByLabelText("Details"), [screenshot()])).toBe(true);
    expect(compressMock).not.toHaveBeenCalled();
  });

  const fileDrag = (files: File[] = []) => ({ dataTransfer: { files, types: ["Files"], dropEffect: "copy" } });
  const textDrag = () => ({ dataTransfer: { files: [], types: ["text/plain"], dropEffect: "move" } });

  it("adds a photo dropped on the body instead of letting the browser open it", async () => {
    setup({ images: { existing: [] } });
    const body = screen.getByLabelText("Details");
    const drag = fileDrag();
    fireEvent.dragEnter(body, drag);
    expect(screen.getByRole("button", { name: "Drop to add images" })).toBeInTheDocument();
    expect(fireEvent.dragOver(body, drag)).toBe(false);
    expect(drag.dataTransfer.dropEffect).toBe("copy");
    expect(fireEvent.drop(body, fileDrag([screenshot()]))).toBe(false);
    expect(await screen.findByRole("button", { name: "Remove image 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add images" })).toBeInTheDocument();
  });

  it("ends the drop state when the drag leaves the form", () => {
    setup({ images: { existing: [] } });
    const title = screen.getByLabelText("Title");
    fireEvent.dragEnter(title, fileDrag());
    expect(screen.getByRole("button", { name: "Drop to add images" })).toBeInTheDocument();
    fireEvent.dragLeave(title, fileDrag());
    expect(screen.getByRole("button", { name: "Add images" })).toBeInTheDocument();
  });

  it("leaves text drags between fields to the browser", () => {
    setup({ images: { existing: [] } });
    const body = screen.getByLabelText("Details");
    const drag = textDrag();
    fireEvent.dragEnter(body, drag);
    expect(screen.queryByRole("button", { name: "Drop to add images" })).not.toBeInTheDocument();
    expect(fireEvent.dragOver(body, drag)).toBe(true);
    expect(drag.dataTransfer.dropEffect).toBe("move");
    expect(fireEvent.drop(body, textDrag())).toBe(true);
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("still keeps a dropped file from replacing the form without the picker", () => {
    setup();
    const body = screen.getByLabelText("Details");
    const drag = fileDrag();
    expect(fireEvent.dragOver(body, drag)).toBe(false);
    expect(drag.dataTransfer.dropEffect).toBe("none");
    expect(fireEvent.drop(body, fileDrag([screenshot()]))).toBe(false);
    expect(compressMock).not.toHaveBeenCalled();
  });

  it("submits the ids of removed existing images", async () => {
    const existing = [{ id: 41, url: "https://img.example.test/41.webp", alt: null, width: 800, height: 600 }];
    const { action } = setup({ images: { existing } });
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Remove image 1" }));
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect((action.mock.calls[0][0] as FormData).getAll("removeImageIds")).toEqual(["41"]);
  });
});

describe("ThreadForm while images are prepared", () => {
  const compressMock = vi.mocked(compressImage);
  let finish: (value: { file: File; width: number; height: number }) => void;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    compressMock.mockReset();
    compressMock.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
  });

  async function startPreparing() {
    const { action } = setup({ images: { existing: [] } });
    await fillValid();
    fireEvent.paste(screen.getByLabelText("Title"), {
      clipboardData: {
        files: [new File(["png"], "image.png", { type: "image/png" })],
        types: ["Files"],
        getData: () => "",
      },
    });
    await screen.findByRole("button", { name: "Preparing images…" });
    return action;
  }

  it("disables submit and ignores every way of submitting until the photos are ready", async () => {
    const action = await startPreparing();
    expect(screen.getByRole("button", { name: "Preparing images…" })).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Details"), "{Control>}{Enter}{/Control}");
    await userEvent.type(screen.getByLabelText("Details"), "{Meta>}{Enter}{/Meta}");
    fireEvent.submit(screen.getByLabelText("Title").closest("form")!);
    expect(action).not.toHaveBeenCalled();
  });

  it("submits normally once the photos are ready", async () => {
    const action = await startPreparing();
    await act(async () => {
      finish({ file: new File(["c"], "image.webp", { type: "image/webp" }), width: 800, height: 600 });
    });
    const submit = await screen.findByRole("button", { name: "Post thread" });
    expect(submit).toBeEnabled();
    await userEvent.type(screen.getByLabelText("Details"), "{Control>}{Enter}{/Control}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect((action.mock.calls[0][0] as FormData).getAll("images")).toHaveLength(1);
  });
});

describe("ThreadForm placement fields", () => {
  it("carries the values the form started with, for the edit action to compare", async () => {
    const { action } = setup({ initial: { title: "Where to find a flat?", body: "Details here", categoryId: 2, city: "both" } });
    await userEvent.click(screen.getByRole("radio", { name: /Housing/ }));
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const data = action.mock.calls[0][0] as FormData;
    expect(data.get("initialCategoryId")).toBe("2");
    expect(data.get("initialCity")).toBe("both");
    expect(data.get("categoryId")).toBe("1");
  });

  it("sends empty initial values for a new thread", async () => {
    const { action } = setup();
    await fillValid();
    await userEvent.click(screen.getByRole("button", { name: "Post thread" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const data = action.mock.calls[0][0] as FormData;
    expect(data.get("initialCategoryId")).toBe("");
    expect(data.get("initialCity")).toBe("");
  });
});
