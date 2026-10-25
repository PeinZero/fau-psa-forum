import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SignInCard, SignInPrompt } from "./sign-in-prompt";

describe("SignInPrompt", () => {
  it("links to login with the encoded return path", () => {
    render(<SignInPrompt next="/t/a b/edit" purpose="to comment." />);
    expect(screen.getByRole("link", { name: "sign in" })).toHaveAttribute("href", "/login?next=%2Ft%2Fa%20b%2Fedit");
  });

  it("keeps the purpose in the sentence", () => {
    render(<SignInPrompt next="/x" purpose="to comment." />);
    expect(screen.getByText(/to comment\./)).toBeInTheDocument();
  });
});

describe("SignInCard", () => {
  const props = { next: "/new?x=1&y=2", title: "Sign in to ask", description: "You need an account to ask." };

  it("renders the title as a heading and the description", () => {
    render(<SignInCard {...props} />);
    expect(screen.getByRole("heading", { name: "Sign in to ask" })).toBeInTheDocument();
    expect(screen.getByText("You need an account to ask.")).toBeInTheDocument();
  });

  it("links to login with the encoded return path", () => {
    render(<SignInCard {...props} />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=%2Fnew%3Fx%3D1%26y%3D2",
    );
  });

  it("offers search as an alternative", () => {
    render(<SignInCard {...props} />);
    expect(screen.getByRole("link", { name: "Search threads" })).toHaveAttribute("href", "/search");
  });
});
