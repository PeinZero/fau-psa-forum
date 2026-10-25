import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { importGuideProgress, setGuideStepDone } from "./actions";
import { GuideProgressProvider, GuideProgressSummary, StepCheckbox } from "./guide-progress";

vi.mock("./actions", () => ({ setGuideStepDone: vi.fn(), importGuideProgress: vi.fn() }));

const save = vi.mocked(setGuideStepDone);

beforeEach(() => {
  save.mockReset();
  vi.mocked(importGuideProgress).mockReset();
  window.localStorage.clear();
});

function Guide({ initialDone }: { initialDone: number[] }) {
  return (
    <GuideProgressProvider guideId={4} guideSlug="anmeldung" stepIds={[11, 12]} signedIn initialDone={initialDone}>
      <GuideProgressSummary />
      <StepCheckbox stepId={11} number={1} title="Book an appointment" />
      <StepCheckbox stepId={12} number={2} title="Bring your lease" />
    </GuideProgressProvider>
  );
}

const step = (n: 1 | 2) => screen.getByRole("checkbox", { name: new RegExp(`^Step ${n} done`) });

describe("GuideProgressProvider, signed in", () => {
  it("keeps a saved tick without waiting for the page to re-render", async () => {
    save.mockResolvedValue({ ok: true, message: "Step marked done." });
    render(<Guide initialDone={[]} />);

    await userEvent.click(step(1));
    expect(save).toHaveBeenCalledWith(11, true);
    expect(step(1)).toBeChecked();
    expect(screen.getByText("1 of 2 done")).toBeInTheDocument();
  });

  it("unticks a saved step and keeps it unticked", async () => {
    save.mockResolvedValue({ ok: true, message: "Step marked not done." });
    render(<Guide initialDone={[11, 12]} />);

    await userEvent.click(step(2));
    expect(save).toHaveBeenCalledWith(12, false);
    expect(step(2)).not.toBeChecked();
    expect(screen.getByText("1 of 2 done")).toBeInTheDocument();
  });

  it("rolls the tick back and explains when the save fails", async () => {
    save.mockResolvedValue({ ok: false, message: "Could not save." });
    render(<Guide initialDone={[]} />);

    await userEvent.click(step(1));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save.");
    expect(step(1)).not.toBeChecked();
  });

  it("follows the server's ticks when the page re-renders", async () => {
    const { rerender } = render(<Guide initialDone={[]} />);
    await act(async () => rerender(<Guide initialDone={[12]} />));
    expect(step(2)).toBeChecked();
    expect(step(1)).not.toBeChecked();
  });
});
