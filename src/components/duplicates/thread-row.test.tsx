import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SimilarThreadRow } from "./thread-row";
import type { SimilarThread } from "./types";

const base: SimilarThread = {
  slug: "visa-help",
  title: "Visa help",
  category: { slug: "visa", name: "Visa" },
  city: "erlangen",
  commentCount: 2,
  hasBestAnswer: false,
};

describe("SimilarThreadRow", () => {
  it("opens the thread in a new tab so a draft is not lost", () => {
    render(<SimilarThreadRow thread={base} />);
    const link = screen.getByRole("link", { name: /Visa help/ });
    expect(link).toHaveAttribute("href", "/t/visa-help");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByText("(opens in a new tab)")).toHaveClass("sr-only");
  });

  it("shows category and city as text", () => {
    render(<SimilarThreadRow thread={base} />);
    expect(screen.getByText("Visa")).toBeInTheDocument();
    expect(screen.getByText("Erlangen")).toBeInTheDocument();
  });

  it("omits category and city when absent", () => {
    render(<SimilarThreadRow thread={{ ...base, category: null, city: null }} />);
    expect(screen.queryByText("Visa")).not.toBeInTheDocument();
    expect(screen.queryByText("Erlangen")).not.toBeInTheDocument();
  });

  it("pluralises the comment count", () => {
    const { rerender } = render(<SimilarThreadRow thread={{ ...base, commentCount: 1 }} />);
    expect(screen.getByText("1 comment")).toBeInTheDocument();
    rerender(<SimilarThreadRow thread={base} />);
    expect(screen.getByText("2 comments")).toBeInTheDocument();
  });

  it("marks answered threads only", () => {
    const { rerender } = render(<SimilarThreadRow thread={base} />);
    expect(screen.queryByText("Answered")).not.toBeInTheDocument();
    rerender(<SimilarThreadRow thread={{ ...base, hasBestAnswer: true }} />);
    expect(screen.getByText("Answered")).toBeInTheDocument();
  });
});
