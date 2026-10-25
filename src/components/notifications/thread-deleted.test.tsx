import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ThreadDeletedSentence, threadDeletedDetails } from "./thread-deleted";

describe("ThreadDeletedSentence", () => {
  it("names the thread and shows the moderator's reason, without any link", () => {
    const { container } = render(
      <p>
        <ThreadDeletedSentence details={{ title: "Flat hunting", reason: "Off topic" }} />
      </p>,
    );
    expect(container.textContent).toBe("Your thread “Flat hunting” was deleted by a moderator. Reason: “Off topic”");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("falls back to a generic title when details are missing", () => {
    const { container } = render(
      <p>
        <ThreadDeletedSentence details={null} />
      </p>,
    );
    expect(container.textContent).toBe("Your thread “a thread” was deleted by a moderator");
  });

  it("ignores malformed details", () => {
    expect(threadDeletedDetails({ title: 5, reason: "" })).toEqual({ title: null, reason: null });
    expect(threadDeletedDetails("x")).toEqual({ title: null, reason: null });
  });
});
