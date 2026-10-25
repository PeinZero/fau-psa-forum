import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FormState } from "./actions";
import { firstInvalidControl, ThreadForm, type ThreadFormValues } from "./thread-form";

vi.mock("@/components/duplicates/similar-threads", () => ({ SimilarThreads: () => null }));

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
