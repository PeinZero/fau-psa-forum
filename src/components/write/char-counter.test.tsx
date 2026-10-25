import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CharCounter, counterLabel, counterState } from "./char-counter";

describe("counterState", () => {
  it("stays hidden below 80% of the limit", () => {
    expect(counterState(0, 100)).toBeNull();
    expect(counterState(79, 100)).toBeNull();
  });

  it("is subtle from 80% up to just below 95%", () => {
    expect(counterState(80, 100)).toEqual({ remaining: 20, tone: "subtle" });
    expect(counterState(94, 100)).toEqual({ remaining: 6, tone: "subtle" });
  });

  it("warns from 95%", () => {
    expect(counterState(95, 100)).toEqual({ remaining: 5, tone: "warning" });
    expect(counterState(99, 100)).toEqual({ remaining: 1, tone: "warning" });
  });

  it("is danger at the limit", () => {
    expect(counterState(100, 100)).toEqual({ remaining: 0, tone: "danger" });
  });

  it("never reports a negative remainder when pasted text overshoots", () => {
    expect(counterState(130, 100)).toEqual({ remaining: 0, tone: "danger" });
  });
});

describe("counterLabel", () => {
  it("uses the singular for one character", () => {
    expect(counterLabel(1)).toBe("1 character left");
  });

  it("uses the plural for zero and many", () => {
    expect(counterLabel(0)).toBe("0 characters left");
    expect(counterLabel(20)).toBe("20 characters left");
  });

  it("separates thousands", () => {
    expect(counterLabel(1000)).toBe("1,000 characters left");
  });
});

describe("CharCounter", () => {
  it("renders nothing below the threshold", () => {
    const { container } = render(<CharCounter length={10} max={100} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the remaining count above the threshold", () => {
    render(<CharCounter length={90} max={100} id="c" />);
    const label = screen.getByText("10 characters left");
    expect(label).toHaveAttribute("id", "c");
    expect(label).toHaveClass("text-subtle");
  });

  it("switches tone as the limit nears", () => {
    const { rerender } = render(<CharCounter length={96} max={100} />);
    expect(screen.getByText("4 characters left")).toHaveClass("text-warning");
    rerender(<CharCounter length={100} max={100} />);
    expect(screen.getByText("0 characters left")).toHaveClass("text-danger");
  });
});
