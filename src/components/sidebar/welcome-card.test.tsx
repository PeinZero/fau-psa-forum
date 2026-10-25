import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/viewer", () => ({ getViewer: vi.fn() }));

import { WelcomeCardView } from "./welcome-card";

describe("WelcomeCardView", () => {
  it("offers visitors a way to ask and to sign in, without repeating the page headline", () => {
    render(<WelcomeCardView viewer={null} />);
    const card = screen.getByRole("region", { name: "Have a question?" });
    expect(within(card).getByRole("link", { name: "Ask a question" })).toHaveAttribute("href", "/new");
    expect(within(card).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(card).not.toHaveTextContent("PSA FAU Community");
  });

  it("greets members by first name and links their own corners of the forum", () => {
    render(<WelcomeCardView viewer={{ displayName: "Ayesha Noor Khan" }} />);
    const card = screen.getByRole("region", { name: "Hi, Ayesha" });
    expect(within(card).getByRole("link", { name: "Ask a question" })).toHaveAttribute("href", "/new");
    expect(within(card).getByRole("link", { name: "Your threads" })).toHaveAttribute("href", "/me/threads");
    expect(within(card).getByRole("link", { name: "Saved threads" })).toHaveAttribute("href", "/saved");
    expect(within(card).getByRole("link", { name: "Notifications" })).toHaveAttribute("href", "/notifications");
    expect(within(card).queryByRole("link", { name: "Sign in" })).toBeNull();
  });
});
