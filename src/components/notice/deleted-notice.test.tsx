import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(search),
}));

import { DeletedNotice } from "./deleted-notice";

describe("DeletedNotice", () => {
  beforeEach(() => replace.mockClear());

  it("renders nothing without the param", () => {
    search = "";
    render(<DeletedNotice />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("removes only the deleted param when dismissed", async () => {
    search = "deleted=1&q=x";
    render(<DeletedNotice />);
    expect(screen.getByRole("status")).toHaveTextContent("Your account was deleted.");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(replace).toHaveBeenCalledWith("/?q=x", { scroll: false });
  });

  it("replaces with the bare path when it was the only param", async () => {
    search = "deleted=1";
    render(<DeletedNotice />);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(replace).toHaveBeenCalledWith("/", { scroll: false });
  });
});
