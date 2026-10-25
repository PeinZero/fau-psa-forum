import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound from "./not-found";

describe("NotFound", () => {
  it("explains the missing page", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1, name: "We couldn't find that page" })).toBeInTheDocument();
  });

  it("links to search and home", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: "Search threads" })).toHaveAttribute("href", "/search");
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });
});
