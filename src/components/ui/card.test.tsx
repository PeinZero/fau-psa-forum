import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card, cardClasses } from "./card";
import { EmptyState } from "./empty-state";

describe("cardClasses", () => {
  it("keeps the outlined, padded card as the default", () => {
    const classes = cardClasses();
    expect(classes).toContain("border");
    expect(classes).toContain("p-4");
  });

  it("drops the outline for the quiet variant", () => {
    const classes = cardClasses({ variant: "quiet" }).split(" ");
    expect(classes).not.toContain("border");
    expect(classes).toContain("bg-surface");
    expect(classes).toContain("p-4");
  });

  it("separates list rows with hairlines and leaves the padding to the rows", () => {
    const classes = cardClasses({ variant: "list" }).split(" ");
    expect(classes).toContain("divide-y");
    expect(classes).not.toContain("border");
    expect(classes).not.toContain("p-4");
    expect(cardClasses({ variant: "list", padding: "md" })).toContain("p-4");
  });

  it("still honours padding none on the default card", () => {
    expect(cardClasses({ padding: "none" })).not.toContain("p-4");
  });

  it("renders a div with the variant's look", () => {
    render(<Card variant="list" data-testid="card" />);
    expect(screen.getByTestId("card")).toHaveClass("divide-y");
  });
});

describe("EmptyState", () => {
  it("shows the title, the explanation and the next action", () => {
    render(
      <EmptyState title="No threads yet" action={<a href="/new">Ask a question</a>}>
        Be the first to ask.
      </EmptyState>,
    );
    expect(screen.getByText("No threads yet")).toBeInTheDocument();
    expect(screen.getByText("Be the first to ask.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ask a question" })).toHaveAttribute("href", "/new");
  });

  it("has no dashed outline", () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    expect(container.firstElementChild).not.toHaveClass("border-dashed");
  });
});
