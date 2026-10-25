import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CommandPalette } from "./command-palette";
import type { SearchResponse, SearchThread } from "./types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeAll(() => {
  // jsdom lacks the modal dialog API and scrolling.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  Element.prototype.scrollIntoView = () => {};
});

const anmeldung: SearchThread = {
  slug: "anmeldung",
  title: "How do I register my address (Anmeldung) in Erlangen or Nuremberg?",
  category: { slug: "accommodation", name: "Accommodation" },
  city: null,
  commentCount: 2,
};
const recent: SearchThread = { ...anmeldung, slug: "health", title: "Which health insurance do I need?", commentCount: 0 };

type Answer = SearchResponse | Error;
let answers: Record<string, Answer>;
const fetchMock = vi.fn(async (input: string) => {
  const q = new URL(input, "http://forum.test").searchParams.get("q") ?? "";
  const answer = answers[q] ?? { results: [] };
  if (answer instanceof Error) throw answer;
  return { ok: true, json: async () => answer } as Response;
});

beforeEach(() => {
  answers = {
    "": { results: [], recent: [recent], categories: [{ slug: "accommodation", name: "Accommodation" }] },
    anmel: { results: [anmeldung] },
  };
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  push.mockReset();
  fetchMock.mockClear();
});

function renderPalette() {
  const onClose = vi.fn();
  render(<CommandPalette open onClose={onClose} canModerate={false} triggerRef={{ current: null }} />);
  return { input: screen.getByRole("combobox", { name: "Search threads" }), onClose };
}

const options = () => within(screen.getByRole("listbox")).getAllByRole("option");

describe("CommandPalette", () => {
  it("shows skeleton rows outside the listbox until suggestions arrive", async () => {
    let release!: () => void;
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: true, json: async () => answers[""] } as Response);
        }),
    );
    renderPalette();
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("option", { name: /health insurance/ })).not.toBeInTheDocument();
    expect(document.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    await waitFor(() => expect(release).toBeDefined());
    await act(async () => release());
    expect(await screen.findByRole("option", { name: /health insurance/ })).toBeInTheDocument();
    expect(document.querySelector(".skeleton")).toBeNull();
  });

  it("highlights the match and keeps the full title as a tooltip", async () => {
    const { input } = renderPalette();
    await userEvent.type(input, "anmel");
    const option = await screen.findByRole("option", { name: /register my address/ });
    expect(within(option).getByText("Anmel", { selector: "mark" })).toBeInTheDocument();
    expect(within(option).getByTitle(anmeldung.title)).toBeInTheDocument();
    expect(option).toHaveTextContent("Accommodation");
    expect(option).toHaveTextContent("2 comments");
    expect(screen.getByText("1 thread found")).toBeInTheDocument();
  });

  it("moves through options with the arrows and opens the active one", async () => {
    const { input } = renderPalette();
    await userEvent.type(input, "anmel");
    await screen.findByRole("option", { name: /register my address/ });

    await userEvent.keyboard("{ArrowDown}");
    const [first] = options();
    expect(input).toHaveAttribute("aria-activedescendant", first.id);
    expect(first).toHaveAttribute("aria-selected", "true");

    // Up from the first option hands focus back to the query.
    await userEvent.keyboard("{ArrowUp}");
    expect(input).not.toHaveAttribute("aria-activedescendant");

    // Up from the query wraps to the last option.
    await userEvent.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", options().at(-1)!.id);

    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(push).toHaveBeenCalledWith("/t/anmeldung");
  });

  it("searches everything on Enter when no option is active", async () => {
    const { input } = renderPalette();
    await userEvent.type(input, "anmel");
    await screen.findByRole("option", { name: /register my address/ });
    await userEvent.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/search?q=anmel");
  });

  it("offers Ask a question when nothing matches", async () => {
    const { input } = renderPalette();
    await userEvent.type(input, "zzzzqq");
    expect(await screen.findByText("No threads match “zzzzqq”")).toBeInTheDocument();
    const nextSteps = screen.getByRole("group", { name: "Next steps" });
    const ask = within(nextSteps).getByRole("option", { name: /Ask a question/ });
    expect(screen.getByText("No threads found")).toBeInTheDocument();

    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(ask).toHaveAttribute("aria-selected", "true");
    expect(push).toHaveBeenCalledWith("/new");
  });

  it("explains a failed search and retries", async () => {
    answers.anmel = new Error("offline");
    const { input } = renderPalette();
    await userEvent.type(input, "anmel");
    expect(await screen.findByText("Search didn’t load")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Threads" })).not.toBeInTheDocument();

    answers.anmel = { results: [anmeldung] };
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("option", { name: /register my address/ })).toBeInTheDocument();
    expect(screen.queryByText("Search didn’t load")).not.toBeInTheDocument();
  });

  it("opens an option on click and closes", async () => {
    const { onClose } = renderPalette();
    fireEvent.click(await screen.findByRole("option", { name: /health insurance/ }));
    expect(push).toHaveBeenCalledWith("/t/health");
    expect(onClose).toHaveBeenCalled();
  });

  it("reports the listbox as expanded only when it has options", async () => {
    answers[""] = { results: [], recent: [], categories: [] };
    const { input } = renderPalette();
    // Quick actions are always there for an empty query.
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "true"));
    expect(input).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
  });
});
