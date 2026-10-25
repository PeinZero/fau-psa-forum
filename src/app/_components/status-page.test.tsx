import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusPage } from "./status-page";

describe("StatusPage", () => {
  function setup() {
    render(
      <StatusPage eyebrow="Error 404" icon={<svg data-testid="icon" />} title="Lost" actions={<button>Act</button>}>
        <p>Some explanation</p>
      </StatusPage>,
    );
  }

  it("renders eyebrow, title, children and actions", () => {
    setup();
    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Lost" })).toBeInTheDocument();
    expect(screen.getByText("Some explanation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Act" })).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("offers popular places as a way back in", () => {
    setup();
    const nav = screen.getByRole("navigation", { name: "Popular places" });
    expect(within(nav).getByRole("link", { name: "Browse threads" })).toHaveAttribute("href", "/browse");
    expect(within(nav).getByRole("link", { name: "Read the guides" })).toHaveAttribute("href", "/guides");
    expect(within(nav).getByRole("link", { name: "Ask a question" })).toHaveAttribute("href", "/new");
  });
});
