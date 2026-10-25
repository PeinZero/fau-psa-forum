import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { GuideSummary } from "./data";
import { GuideCard, GuideRow, guideProgress } from "./guide-card";

const guide: GuideSummary = {
  id: 1,
  slug: "first-weeks-in-erlangen",
  title: "First weeks in Erlangen",
  summary: "The paperwork for your first weeks, in a sensible order.",
  isFeatured: true,
  stepCount: 8,
  doneCount: null,
};

describe("guideProgress", () => {
  it("shows only the step count to signed-out visitors", () => {
    expect(guideProgress({ stepCount: 8, doneCount: null })).toEqual({ tracked: false, finished: false, label: "8 steps" });
  });

  it("counts finished steps for members", () => {
    expect(guideProgress({ stepCount: 8, doneCount: 3 })).toEqual({ tracked: true, finished: false, label: "3 of 8 steps done" });
    expect(guideProgress({ stepCount: 1, doneCount: 0 }).label).toBe("0 of 1 step done");
  });

  it("marks a guide with every step ticked as finished", () => {
    expect(guideProgress({ stepCount: 8, doneCount: 8 })).toEqual({ tracked: true, finished: true, label: "All 8 steps done" });
  });

  it("does not track a guide without steps", () => {
    expect(guideProgress({ stepCount: 0, doneCount: 0 })).toEqual({ tracked: false, finished: false, label: "0 steps" });
  });
});

describe("GuideCard and GuideRow", () => {
  it("link to the guide with its title, summary and step count", () => {
    render(<GuideCard guide={guide} />);
    const link = screen.getByRole("link", { name: /First weeks in Erlangen/ });
    expect(link).toHaveAttribute("href", "/guides/first-weeks-in-erlangen");
    expect(link).toHaveTextContent("The paperwork for your first weeks");
    expect(link).toHaveTextContent("8 steps");
    expect(screen.queryByRole("progressbar", { hidden: true })).not.toBeInTheDocument();
  });

  it("show a member's progress with a bar", () => {
    render(<GuideRow guide={{ ...guide, doneCount: 5 }} />);
    expect(screen.getByRole("link")).toHaveTextContent("5 of 8 steps done");
    expect(screen.getByRole("progressbar", { hidden: true })).toHaveAttribute("aria-valuenow", "5");
  });
});
