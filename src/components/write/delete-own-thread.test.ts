import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
const removeMany = vi.fn();
const mediaStorage = vi.fn();
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: vi.fn().mockResolvedValue({ userId: "u1", role: "member" }) }));
vi.mock("@/lib/media/storage", () => ({ mediaStorage: () => mediaStorage() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc }) }));

import { revalidatePath } from "next/cache";

import { getViewer } from "@/lib/auth/viewer";

import { deleteOwnThread } from "./delete-own-thread";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("deleteOwnThread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mediaStorage.mockReturnValue({ removeMany });
    removeMany.mockResolvedValue([]);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects an invalid thread id", async () => {
    expect(await deleteOwnThread(null, form({ threadId: "abc" }))).toMatchObject({ ok: false });
    expect(await deleteOwnThread(null, form({}))).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("asks signed-out visitors to sign in", async () => {
    vi.mocked(getViewer).mockResolvedValueOnce(null);
    expect(await deleteOwnThread(null, form({ threadId: "3" }))).toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps database errors to readable messages", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: "P0002", message: "thread not found" } });
    expect(await deleteOwnThread(null, form({ threadId: "3" }))).toEqual({
      ok: false,
      message: "Thread not found. It may already be deleted.",
    });

    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "only pending or rejected threads can be deleted by their author" },
    });
    expect(await deleteOwnThread(null, form({ threadId: "3" }))).toMatchObject({
      ok: false,
      message: expect.stringContaining("waiting for review or were rejected"),
    });

    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "P0001", message: "your account is banned until 31 Oct 2026, 14:00: Spam" },
    });
    expect(await deleteOwnThread(null, form({ threadId: "3" }))).toMatchObject({
      ok: false,
      message: expect.stringContaining("banned"),
    });

    rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "boom" } });
    expect(await deleteOwnThread(null, form({ threadId: "3" }))).toEqual({
      ok: false,
      message: "Something went wrong. Please try again.",
    });
    expect(removeMany).not.toHaveBeenCalled();
  });

  it("removes the image files, then leaves for the member's threads", async () => {
    rpc.mockResolvedValue({ data: ["a/1.webp", "a/2.webp"], error: null });
    await expect(deleteOwnThread(null, form({ threadId: "3" }))).rejects.toThrow("NEXT_REDIRECT /me/threads?deleted=thread");
    expect(rpc).toHaveBeenCalledWith("delete_own_thread", { p_thread_id: 3 });
    expect(removeMany).toHaveBeenCalledWith(["a/1.webp", "a/2.webp"]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("skips storage when the thread had no images", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await expect(deleteOwnThread(null, form({ threadId: "3" }))).rejects.toThrow("NEXT_REDIRECT /me/threads?deleted=thread");
    expect(mediaStorage).not.toHaveBeenCalled();
  });

  it("still succeeds when storage is not configured or fails", async () => {
    rpc.mockResolvedValue({ data: ["a/1.webp"], error: null });
    mediaStorage.mockImplementationOnce(() => {
      throw new Error("Image storage is not configured");
    });
    await expect(deleteOwnThread(null, form({ threadId: "3" }))).rejects.toThrow("NEXT_REDIRECT /me/threads?deleted=thread");

    removeMany.mockResolvedValueOnce(["a/1.webp"]);
    await expect(deleteOwnThread(null, form({ threadId: "3" }))).rejects.toThrow("NEXT_REDIRECT /me/threads?deleted=thread");
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
