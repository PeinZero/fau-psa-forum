import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateProfile } from "@/app/account/actions";

import { normalizeUsername, WelcomeForm } from "./welcome-form";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/app/account/actions", () => ({ updateProfile: vi.fn() }));

const props = { next: "/browse", displayName: "Aisha", username: "aisha", affiliation: null } as const;

function preview() {
  return within(screen.getByLabelText("Preview"));
}

describe("normalizeUsername", () => {
  it("strips a leading @ and lowercases", () => {
    expect(normalizeUsername("@Ali_Khan")).toBe("ali_khan");
  });

  it("only strips the first @", () => {
    expect(normalizeUsername("a@B")).toBe("a@b");
  });
});

describe("WelcomeForm", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(updateProfile).mockReset();
  });

  it("previews the typed name, username and chosen badge", async () => {
    render(<WelcomeForm {...props} />);
    const name = screen.getByLabelText("Display name");
    await userEvent.clear(name);
    await userEvent.type(name, "Sara");
    const username = screen.getByLabelText("Username");
    await userEvent.clear(username);
    await userEvent.type(username, "@Sara_K");
    const group = screen.getByRole("group", { name: "Badge (optional)" });
    await userEvent.click(within(group).getByRole("radio", { name: "Graduate" }));

    expect(preview().getByText("Sara")).toBeInTheDocument();
    expect(preview().getByText("@sara_k")).toBeInTheDocument();
    expect(preview().getByText("Graduate")).toBeInTheDocument();
  });

  it("shows a placeholder name when the name is blank", async () => {
    render(<WelcomeForm {...props} />);
    await userEvent.clear(screen.getByLabelText("Display name"));
    expect(preview().getByText("Your name")).toBeInTheDocument();
  });

  it("shows no badge without an affiliation", () => {
    render(<WelcomeForm {...props} />);
    expect(preview().queryByText("Student")).not.toBeInTheDocument();
  });

  it("redirects to next after a successful save", async () => {
    vi.mocked(updateProfile).mockResolvedValue({ ok: true, message: "" });
    render(<WelcomeForm {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/browse");
  });

  it("marks the username invalid on a username error and clears it on edit", async () => {
    vi.mocked(updateProfile).mockResolvedValue({ ok: false, message: "Username is taken.", field: "username" });
    render(<WelcomeForm {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    const username = screen.getByLabelText("Username");
    expect(await screen.findByText("Username is taken.")).toBeInTheDocument();
    expect(username).toHaveAttribute("aria-invalid", "true");
    expect(replace).not.toHaveBeenCalled();

    await userEvent.type(username, "x");
    expect(screen.queryByText("Username is taken.")).not.toBeInTheDocument();
    expect(username).not.toHaveAttribute("aria-invalid");
  });

  it("shows other errors as an alert without flagging the username", async () => {
    vi.mocked(updateProfile).mockResolvedValue({ ok: false, message: "Something broke." });
    render(<WelcomeForm {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Something broke.");
    expect(screen.getByLabelText("Username")).not.toHaveAttribute("aria-invalid");
  });

  it("lets the user skip to next", () => {
    render(<WelcomeForm {...props} next="/t/abc" />);
    expect(screen.getByRole("link", { name: "Skip for now" })).toHaveAttribute("href", "/t/abc");
  });
});
