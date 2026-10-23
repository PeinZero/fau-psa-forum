import { describe, expect, it } from "vitest";

import { findMentionToken } from "./types";

describe("findMentionToken", () => {
  it("finds the token ending at the caret", () => {
    expect(findMentionToken("hi @bil", 7)).toEqual({ start: 3, end: 7, query: "bil" });
  });

  it("extends the replace range over the rest of the handle", () => {
    expect(findMentionToken("hi @bilal", 6)).toEqual({ start: 3, end: 9, query: "bi" });
  });

  it("works at the start of the text and after a newline", () => {
    expect(findMentionToken("@ali", 4)?.query).toBe("ali");
    expect(findMentionToken("a\n@ali", 6)?.query).toBe("ali");
  });

  it("is no mention inside an email address", () => {
    expect(findMentionToken("bilal@example", 13)).toBeNull();
    expect(findMentionToken("a_1@x", 5)).toBeNull();
  });

  it("needs at least one handle character", () => {
    expect(findMentionToken("hi @", 4)).toBeNull();
    expect(findMentionToken("hi @ bil", 8)).toBeNull();
  });

  it("rejects handles longer than 20 characters", () => {
    const long = "a".repeat(21);
    expect(findMentionToken(`@${long}`, long.length + 1)).toBeNull();
    expect(findMentionToken(`@${"a".repeat(20)}`, 21)?.query).toHaveLength(20);
  });

  it("returns null when the caret is not in a mention", () => {
    expect(findMentionToken("hello world", 5)).toBeNull();
  });
});
