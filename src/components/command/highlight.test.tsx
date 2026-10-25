import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Highlight } from "./highlight";

const marks = (text: string, query: string) => {
  const { container } = render(<p>{Highlight({ text, query })}</p>);
  return { text: container.textContent, marks: [...container.querySelectorAll("mark")].map((mark) => mark.textContent) };
};

describe("Highlight", () => {
  it("returns the text untouched for an empty query", () => {
    expect(marks("Anmeldung in Erlangen", "   ")).toEqual({ text: "Anmeldung in Erlangen", marks: [] });
  });

  it("marks every word case-insensitively and keeps the original casing", () => {
    expect(marks("Anmeldung in Erlangen", "anmel ERL")).toEqual({ text: "Anmeldung in Erlangen", marks: ["Anmel", "Erl"] });
  });

  it("prefers the longer word when words overlap", () => {
    expect(marks("Werkstudent", "werk werkstudent").marks).toEqual(["Werkstudent"]);
  });

  it("treats regex characters literally", () => {
    expect(marks("Is €50 (a month) enough?", "(a").marks).toEqual(["(a"]);
    expect(marks("Q&A?", "?").marks).toEqual(["?"]);
  });
});
