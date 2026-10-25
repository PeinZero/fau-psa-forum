import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Author, initials, profileHref } from "./author";

const ayesha = { display_name: "Ayesha Khan", username: "ayesha_khan", affiliation: "student", role: "member" } as const;

describe("Author", () => {
  it("links the name to the public profile", () => {
    render(<Author profile={ayesha} />);
    expect(screen.getByRole("link", { name: "Ayesha Khan" })).toHaveAttribute("href", "/u/ayesha_khan");
  });

  it("shows the name as plain text when the profile came without a handle", () => {
    render(<Author profile={{ ...ayesha, username: undefined }} />);
    expect(screen.getByText("Ayesha Khan")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("never links a deleted user", () => {
    render(<Author profile={null} />);
    expect(screen.getByText("Deleted user")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("labels staff and affiliation next to the name", () => {
    render(<Author profile={{ ...ayesha, role: "moderator" }} />);
    expect(screen.getByText("Moderator")).toBeInTheDocument();
    expect(screen.getByText("Student")).toBeInTheDocument();
  });

  it("keeps members free of a role badge and of reputation unless asked", () => {
    render(<Author profile={{ ...ayesha, reputation: 42 }} />);
    expect(screen.queryByText("Moderator")).toBeNull();
    expect(screen.queryByLabelText("42 reputation")).toBeNull();
  });
});

describe("profile helpers", () => {
  it("builds the profile path from the handle", () => {
    expect(profileHref("ayesha_khan")).toBe("/u/ayesha_khan");
  });

  it("takes initials from the first and last name", () => {
    expect(initials("Ayesha Noor Khan")).toBe("AK");
    expect(initials("ayesha")).toBe("AY");
  });
});
