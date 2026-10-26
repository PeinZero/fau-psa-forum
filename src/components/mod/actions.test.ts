import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const removeMany = vi.fn();
const update = vi.fn();
const mediaStorage = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("@/lib/auth/viewer", () => ({
  getViewer: vi.fn().mockResolvedValue({ userId: "u1", role: "moderator" }),
  isModerator: (role: string) => role === "moderator" || role === "superadmin",
}));
vi.mock("@/lib/media/storage", () => ({ mediaStorage: () => mediaStorage() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc,
    from: () => ({
      update: (values: unknown) => {
        const filters: [string, unknown][] = [];
        const chain = {
          eq: (column: string, value: unknown) => (filters.push([column, value]), chain),
          select: () => update(values, filters),
        };
        return chain;
      },
    }),
  }),
}));

import { getViewer } from "@/lib/auth/viewer";

import { deleteThread, moderateThread, moveThread } from "./actions";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("deleteThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mediaStorage.mockReturnValue({ removeMany });
    removeMany.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("requires a reason", async () => {
    expect(await deleteThread(null, form({ threadId: "3", reason: "   " }))).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("limits the reason to 1000 characters", async () => {
    const result = await deleteThread(null, form({ threadId: "3", reason: "x".repeat(1001) }));
    expect(result).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects members", async () => {
    vi.mocked(getViewer).mockResolvedValueOnce({ userId: "u2", role: "member" } as never);
    expect(await deleteThread(null, form({ threadId: "3", reason: "Spam" }))).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps database errors to readable messages", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "P0002", message: "thread not found" } });
    expect(await deleteThread(null, form({ threadId: "3", reason: "Spam" }))).toEqual({
      ok: false,
      message: "Thread not found. It may already be deleted.",
    });
  });

  it("removes the image files, then leaves for the home page", async () => {
    rpc.mockResolvedValue({ data: ["a/1.webp", "a/2.webp"], error: null });
    await expect(deleteThread(null, form({ threadId: "3", reason: " Spam " }))).rejects.toThrow("NEXT_REDIRECT /?deleted=thread");
    expect(rpc).toHaveBeenCalledWith("delete_thread", { p_thread_id: 3, p_reason: "Spam" });
    expect(removeMany).toHaveBeenCalledWith(["a/1.webp", "a/2.webp"]);
  });

  it("skips storage when the thread had no images", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(deleteThread(null, form({ threadId: "3", reason: "Spam" }))).rejects.toThrow("NEXT_REDIRECT /?deleted=thread");
    expect(mediaStorage).not.toHaveBeenCalled();
  });

  it("still succeeds when storage is not configured or fails", async () => {
    rpc.mockResolvedValue({ data: ["a/1.webp"], error: null });
    mediaStorage.mockImplementationOnce(() => {
      throw new Error("Image storage is not configured");
    });
    await expect(deleteThread(null, form({ threadId: "3", reason: "Spam" }))).rejects.toThrow("NEXT_REDIRECT /?deleted=thread");

    removeMany.mockResolvedValueOnce(["a/1.webp"]);
    await expect(deleteThread(null, form({ threadId: "3", reason: "Spam" }))).rejects.toThrow("NEXT_REDIRECT /?deleted=thread");
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});

describe("moveThread", () => {
  beforeEach(() => vi.clearAllMocks());

  it("needs a category and a known city", async () => {
    expect(await moveThread(null, form({ threadId: "3", city: "erlangen" }))).toMatchObject({ ok: false });
    expect(await moveThread(null, form({ threadId: "3", categoryId: "2", city: "munich" }))).toMatchObject({ ok: false });
    expect(update).not.toHaveBeenCalled();
  });

  it("updates only category and city, with no city stored as null", async () => {
    update.mockResolvedValue({ data: [{ slug: "visa-help" }], error: null });
    await expect(moveThread(null, form({ threadId: "3", categoryId: "2", city: "" }))).rejects.toThrow(
      "NEXT_REDIRECT /t/visa-help",
    );
    expect(update).toHaveBeenCalledWith({ category_id: 2, city: null }, [["id", 3]]);
  });

  it("reports a thread that can't be updated", async () => {
    update.mockResolvedValue({ data: [], error: null });
    expect(await moveThread(null, form({ threadId: "3", categoryId: "2", city: "both" }))).toMatchObject({ ok: false });
  });
});

describe("moderateThread", () => {
  beforeEach(() => update.mockReset());

  it("only rejects a thread that is still waiting for review", async () => {
    update.mockResolvedValue({ data: [], error: null });
    const result = await moderateThread(null, form({ threadId: "3", op: "reject", reason: "Off topic" }));
    expect(update).toHaveBeenCalledWith({ status: "rejected", rejection_reason: "Off topic" }, [
      ["id", 3],
      ["status", "pending"],
    ]);
    expect(result).toEqual({ ok: false, message: "Only threads waiting for review can be rejected." });
  });

  it("approves without a status filter, so a rejected thread can be approved again", async () => {
    update.mockResolvedValue({ data: [{ id: 3 }], error: null });
    const result = await moderateThread(null, form({ threadId: "3", op: "approve" }));
    expect(update).toHaveBeenCalledWith({ status: "published", rejection_reason: null }, [["id", 3]]);
    expect(result).toEqual({ ok: true, message: "Thread approved." });
  });
});
