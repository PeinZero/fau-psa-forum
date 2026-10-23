import { describe, expect, it } from "vitest";

import { firstIssue, friendlyError } from "./errors";

describe("friendlyError", () => {
  it("maps known Postgres codes", () => {
    expect(friendlyError({ code: "42501" })).toMatch(/permission/);
    expect(friendlyError({ code: "23505" })).toMatch(/already taken/);
  });

  it("never leaks the raw message", () => {
    const text = friendlyError({ code: "XX000", message: "relation \"secret_table\" does not exist" });
    expect(text).toBe("Something went wrong. Please try again.");
  });

  it("shows rate-limit messages from the database as written", () => {
    expect(friendlyError({ code: "P0001", message: "rate limit: Please wait a minute." }, { codes: { P0001: "Other." } })).toBe(
      "Please wait a minute.",
    );
  });

  it("prefers a module message over the code, and a module code over the default", () => {
    const options = {
      messages: [["cannot vote on your own", "Not your own."]] as const,
      codes: { "42501": "Custom denied." },
    };
    expect(friendlyError({ code: "42501", message: "you cannot vote on your own comment" }, options)).toBe("Not your own.");
    expect(friendlyError({ code: "42501", message: "other" }, options)).toBe("Custom denied.");
  });
});

describe("firstIssue", () => {
  it("returns the first validation message or a fallback", () => {
    expect(firstIssue({ error: { issues: [{ message: "Too short" }, { message: "x" }] } })).toBe("Too short");
    expect(firstIssue({ error: { issues: [] } })).toBe("Invalid request.");
  });
});
