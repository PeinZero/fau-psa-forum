import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { moveThread } from "./actions";
import { MoveThreadForm } from "./move-thread-form";

vi.mock("./actions", () => ({ moveThread: vi.fn().mockResolvedValue(null) }));

const categories = [
  { id: 1, slug: "housing", name: "Housing", description: "Flats" },
  { id: 2, slug: "visa", name: "Visa", description: null },
];

function setup(city: "erlangen" | "nuremberg" | "both" | null = null) {
  render(
    <MoveThreadForm
      threadId={5}
      title="How do I register my flat?"
      categories={categories}
      categoryId={1}
      city={city}
      cancelHref="/t/register"
    />,
  );
}

describe("MoveThreadForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the title as text, not as a field", () => {
    setup();
    expect(screen.getByText("How do I register my flat?")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/t/register");
  });

  it("starts from the current category and city", () => {
    setup("both");
    expect(screen.getByRole("radio", { name: /Housing/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Both cities" })).toBeChecked();
  });

  it("submits the chosen category and city for the thread", async () => {
    setup();
    await userEvent.click(screen.getByRole("radio", { name: /Visa/ }));
    await userEvent.click(screen.getByRole("radio", { name: "Nuremberg" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(moveThread).toHaveBeenCalledTimes(1);
    const formData = vi.mocked(moveThread).mock.calls[0][1];
    expect(formData.get("threadId")).toBe("5");
    expect(formData.get("categoryId")).toBe("2");
    expect(formData.get("city")).toBe("nuremberg");
  });

  it("shows a failure from the action", async () => {
    vi.mocked(moveThread).mockResolvedValueOnce({ ok: false, message: "Thread not found." });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Thread not found.");
  });

  it("announces saving while the move is pending", async () => {
    let finish!: () => void;
    vi.mocked(moveThread).mockImplementationOnce(() => new Promise((resolve) => (finish = () => resolve(null))));
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saving…");
    expect(document.querySelector("form")).toHaveAttribute("aria-busy", "true");
    finish();
    await waitFor(() => expect(screen.getByRole("status")).toBeEmptyDOMElement());
  });
});
