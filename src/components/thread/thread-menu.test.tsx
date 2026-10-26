import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteThread } from "@/components/mod/actions";

import { ThreadMenu } from "./thread-menu";

vi.mock("@/components/mod/actions", () => ({
  deleteThread: vi.fn().mockResolvedValue({ ok: true, message: "" }),
  moderateThread: vi.fn(),
  markThreadVerified: vi.fn(),
  restrictUser: vi.fn(),
  liftRestriction: vi.fn(),
}));
vi.mock("@/components/bookmarks/actions", () => ({ setBookmark: vi.fn(), setFollow: vi.fn() }));
vi.mock("@/components/report/report-dialog", () => ({ ReportDialog: () => null }));
vi.mock("@/components/update-requests/request-update-dialog", () => ({ RequestUpdateDialog: () => null }));

const thread = { id: 7, status: "published" as const, is_outdated: false, is_pinned: false };

async function openMenu(props: Partial<Parameters<typeof ThreadMenu>[0]> = {}) {
  const user = userEvent.setup();
  render(<ThreadMenu thread={thread} slug="visa-help" {...props} />);
  await user.click(screen.getByRole("button", { name: "Thread actions" }));
  return user;
}

describe("ThreadMenu edit and move", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers Edit to the author", async () => {
    await openMenu({ canEdit: true });
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveAttribute("href", "/t/visa-help/edit");
    expect(screen.queryByRole("menuitem", { name: "Move" })).not.toBeInTheDocument();
  });

  it("offers Move, never Edit, to a moderator on someone else's thread", async () => {
    await openMenu({ canMove: true, isMod: true });
    expect(screen.getByRole("menuitem", { name: "Move" })).toHaveAttribute("href", "/t/visa-help/edit");
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("offers Edit and no Move to a moderator on their own thread", async () => {
    await openMenu({ canEdit: true, canMove: false, isMod: true });
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Move" })).not.toBeInTheDocument();
  });

  it("offers neither to other members", async () => {
    await openMenu({ canReport: true });
    expect(screen.queryByRole("menuitem", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Move" })).not.toBeInTheDocument();
  });
});

describe("ThreadMenu delete", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is only offered to moderators", async () => {
    await openMenu({ canEdit: true });
    expect(screen.queryByRole("menuitem", { name: "Delete thread" })).not.toBeInTheDocument();
  });

  it("asks for a reason before deleting", async () => {
    const user = await openMenu({ isMod: true });
    await user.click(screen.getByRole("menuitem", { name: "Delete thread" }));
    const reason = screen.getByLabelText("Reason for deletion");
    expect(reason).toBeRequired();
    expect(reason).toHaveAttribute("maxlength", "1000");

    await user.click(screen.getByRole("button", { name: "Delete thread" }));
    expect(deleteThread).not.toHaveBeenCalled();

    await user.type(reason, "Spam");
    await user.click(screen.getByRole("button", { name: "Delete thread" }));
    expect(deleteThread).toHaveBeenCalledTimes(1);
    const formData = vi.mocked(deleteThread).mock.calls[0][1];
    expect(formData.get("threadId")).toBe("7");
    expect(formData.get("reason")).toBe("Spam");
  });
});
