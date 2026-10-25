// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { jpeg, webpLossy } from "@/lib/media/test-fixtures";

type Result = { data?: unknown; error?: { code?: string; message?: string } | null };

const events: string[] = [];
const rpcResults: Record<string, Result> = {};
const tableResults: Record<string, Result> = {};
const fromCalls: { table: string; op: string; args: unknown[]; filters: [string, unknown[]][] }[] = [];
const put = vi.fn();
const remove = vi.fn();
const removeMany = vi.fn();
const imagesEnabled = vi.fn();
const revalidatePath = vi.fn();

const rpc = vi.fn(async (name: string, args: unknown) => {
  events.push(`rpc:${name}`);
  void args;
  return rpcResults[name] ?? { data: null, error: null };
});

function builder(table: string) {
  const call = { table, op: "select", args: [] as unknown[], filters: [] as [string, unknown[]][] };
  fromCalls.push(call);
  const settle = () => {
    events.push(`db:${table}.${call.op}`);
    return Promise.resolve(tableResults[`${table}.${call.op}`] ?? { data: null, error: null });
  };
  const chain: Record<string, unknown> = {};
  for (const op of ["update", "delete", "insert"]) {
    chain[op] = (...args: unknown[]) => {
      call.op = op;
      call.args = args;
      return chain;
    };
  }
  chain.select = (...args: unknown[]) => {
    if (call.op === "select") call.args = args;
    return chain;
  };
  for (const filter of ["eq", "in"]) {
    chain[filter] = (...args: unknown[]) => {
      call.filters.push([filter, args]);
      return chain;
    };
  }
  chain.maybeSingle = settle;
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => settle().then(resolve, reject);
  return chain;
}

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => {
    events.push("revalidate");
    revalidatePath(...args);
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    events.push("redirect");
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from: builder }) }));
vi.mock("@/lib/media/storage", () => ({ mediaStorage: () => ({ put, remove, removeMany }) }));
vi.mock("@/lib/media/keys", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/media/keys")>()),
  imagesEnabled: () => imagesEnabled(),
}));

import { getViewer } from "@/lib/auth/viewer";

import { createThreadAction, updateThreadAction } from "./actions";

const GALLERY_FAILED = "The images could not be uploaded. Please try again.";

function webp(name = "a.webp") {
  return new File([webpLossy(40, 30) as BlobPart], name, { type: "image/webp" });
}
function jpg(name = "b.jpg") {
  return new File([jpeg(20, 10) as BlobPart], name, { type: "image/jpeg" });
}

function form(fields: Record<string, string> = {}, files: File[] = []) {
  const data = new FormData();
  data.set("title", "Where to find a flat?");
  data.set("body", "Looking for a room near the Südgelände.");
  data.set("categoryId", "4");
  data.set("city", "erlangen");
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  for (const file of files) {
    data.append("images", file);
    data.append("imageAlts", `alt ${file.name}`);
  }
  return data;
}

const dbCalls = (table: string, op: string) => fromCalls.filter((c) => c.table === table && c.op === op);
const rpcArgs = (name: string) => rpc.mock.calls.find(([n]) => n === name)?.[1] as Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  events.length = 0;
  fromCalls.length = 0;
  for (const key of Object.keys(rpcResults)) delete rpcResults[key];
  for (const key of Object.keys(tableResults)) delete tableResults[key];
  vi.mocked(getViewer).mockResolvedValue({ userId: "u1", role: "member" } as never);
  imagesEnabled.mockReturnValue(true);
  put.mockResolvedValue(undefined);
  removeMany.mockResolvedValue([]);
  rpcResults.create_thread_with_images = { data: "where-to-find-a-flat", error: null };
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createThreadAction", () => {
  it("creates a thread without images in one call and goes to it", async () => {
    await expect(createThreadAction(form())).rejects.toThrow("NEXT_REDIRECT /t/where-to-find-a-flat");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpcArgs("create_thread_with_images")).toEqual({
      p_title: "Where to find a flat?",
      p_body: "Looking for a room near the Südgelände.",
      p_category_id: 4,
      p_city: "erlangen",
      p_images: [],
    });
    expect(put).not.toHaveBeenCalled();
    expect(removeMany).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("asks for sign-in without a viewer", async () => {
    vi.mocked(getViewer).mockResolvedValue(null as never);
    expect(await createThreadAction(form())).toEqual({ error: "Please sign in again to continue." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("checks the limits, uploads both files, then creates the thread with both rows", async () => {
    const files = [webp(), jpg()];
    await expect(createThreadAction(form({}, files))).rejects.toThrow("NEXT_REDIRECT /t/where-to-find-a-flat");

    expect(events).toEqual(["rpc:check_image_upload", "rpc:create_thread_with_images", "revalidate", "redirect"]);
    const check = rpcArgs("check_image_upload");
    expect(check).toMatchObject({ p_thread_id: null, p_count: 2, p_removed_ids: [] });
    expect(check.p_bytes).toBe(files[0].size + files[1].size);

    expect(put).toHaveBeenCalledTimes(2);
    const rows = rpcArgs("create_thread_with_images").p_images as Record<string, unknown>[];
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ content_type: "image/webp", width: 40, height: 30, alt_text: "alt a.webp" });
    expect(rows[1]).toMatchObject({ content_type: "image/jpeg", width: 20, height: 10, alt_text: "alt b.jpg" });
    expect(put.mock.calls.map(([key]) => key)).toEqual(rows.map((row) => row.storage_key));
    expect(put.mock.calls[0][2]).toBe("image/webp");
  });

  it("removes both files and shows a friendly error when the thread insert fails", async () => {
    rpcResults.create_thread_with_images = {
      data: null,
      error: { message: "3 threads waiting for review" },
    };
    const result = await createThreadAction(form({}, [webp(), jpg()]));
    expect(result.error).toMatch(/3 threads waiting for review/);
    const keys = put.mock.calls.map(([key]) => key);
    expect(removeMany).toHaveBeenCalledWith(keys);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(events).not.toContain("redirect");
  });

  it("treats a missing slug like a failure", async () => {
    rpcResults.create_thread_with_images = { data: null, error: null };
    expect(await createThreadAction(form({}, [webp()]))).toEqual({ error: "Something went wrong. Please try again." });
    expect(removeMany).toHaveBeenCalledTimes(1);
  });

  it("removes the stored file and skips the thread when one upload fails", async () => {
    put.mockImplementation(async (key: string, _b: unknown, type: string) => {
      if (type === "image/jpeg") throw new Error("storage down");
      void key;
    });
    const result = await createThreadAction(form({}, [webp(), jpg()]));
    expect(result).toEqual({ error: GALLERY_FAILED });
    const webpKey = put.mock.calls.find(([, , type]) => type === "image/webp")![0];
    expect(removeMany).toHaveBeenCalledWith([webpKey]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalledWith("create_thread_with_images", expect.anything());
  });

  it("shows a rate limit message without its prefix and uploads nothing", async () => {
    rpcResults.check_image_upload = {
      data: null,
      error: { message: "rate limit: You can add up to 6 images a day." },
    };
    expect(await createThreadAction(form({}, [webp()]))).toEqual({ error: "You can add up to 6 images a day." });
    expect(put).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalledWith("create_thread_with_images", expect.anything());
  });

  it("refuses images when storage is off", async () => {
    imagesEnabled.mockReturnValue(false);
    expect(await createThreadAction(form({}, [webp()]))).toEqual({ error: "Image uploads are not available right now." });
    expect(rpc).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("rejects a file that is not an image before any database call", async () => {
    const fake = new File(["not an image"], "x.webp", { type: "image/webp" });
    const result = await createThreadAction(form({}, [fake]));
    expect(result.error).toMatch(/not a valid image/);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("updateThreadAction", () => {
  beforeEach(() => {
    tableResults["threads.update"] = { data: { slug: "where-to-find-a-flat" }, error: null };
    tableResults["thread_images.select"] = { data: [{ id: 1 }, { id: 2 }, { id: 3 }], error: null };
    tableResults["thread_images.delete"] = { data: [{ storage_key: "old/1.webp" }, { storage_key: "old/2.webp" }], error: null };
    tableResults["thread_images.insert"] = { data: null, error: null };
  });

  const threadUpdate = () => dbCalls("threads", "update")[0].args[0] as Record<string, unknown>;

  it("reports a thread the viewer may not edit and does nothing else", async () => {
    tableResults["threads.update"] = { data: null, error: null };
    const result = await updateThreadAction(9, form({ removeImageIds: "1" }, [webp()]));
    expect(result).toEqual({ error: "You are not allowed to edit this thread." });
    expect(rpc).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(dbCalls("thread_images", "delete")).toHaveLength(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("replaces an image on a full thread: check, upload, delete, insert, refresh", async () => {
    await expect(updateThreadAction(9, form({ removeImageIds: "2" }, [webp()]))).rejects.toThrow(
      "NEXT_REDIRECT /t/where-to-find-a-flat",
    );
    expect(events).toEqual([
      "db:thread_images.select",
      "db:threads.update",
      "revalidate",
      "rpc:check_image_upload",
      "db:thread_images.delete",
      "db:thread_images.insert",
      "redirect",
    ]);
    expect(rpcArgs("check_image_upload")).toMatchObject({ p_thread_id: 9, p_count: 1, p_removed_ids: [2] });
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.invocationCallOrder[0]).toBeGreaterThan(rpc.mock.invocationCallOrder[0]);

    const del = dbCalls("thread_images", "delete")[0];
    expect(del.filters).toEqual([
      ["eq", ["thread_id", 9]],
      ["in", ["id", [2]]],
    ]);
    expect(removeMany).toHaveBeenCalledWith(["old/1.webp", "old/2.webp"]);

    const rows = dbCalls("thread_images", "insert")[0].args[0] as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ thread_id: 9, content_type: "image/webp", alt_text: "alt a.webp" });
    expect(rows[0]).not.toHaveProperty("position");
    expect(rows[0].storage_key).toBe(put.mock.calls[0][0]);
  });

  it("removes the uploaded files and keeps the text message when the insert fails", async () => {
    tableResults["thread_images.insert"] = { data: null, error: { message: "boom" } };
    const result = await updateThreadAction(9, form({ removeImageIds: "2" }, [webp()]));
    expect(result.error).toBe("Your text was saved, but the new images were not added. Something went wrong. Please try again.");
    expect(removeMany).toHaveBeenCalledWith([put.mock.calls[0][0]]);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(events).not.toContain("redirect");
  });

  it("changes nothing when the upload check fails", async () => {
    rpcResults.check_image_upload = { data: null, error: { message: "rate limit: You can add up to 6 images a day." } };
    const result = await updateThreadAction(9, form({ removeImageIds: "2" }, [webp()]));
    expect(result.error).toBe("Your text was saved, but the images were not changed. You can add up to 6 images a day.");
    expect(put).not.toHaveBeenCalled();
    expect(dbCalls("thread_images", "delete")).toHaveLength(0);
    expect(dbCalls("thread_images", "insert")).toHaveLength(0);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("keeps the new files out of storage when removing the old rows fails", async () => {
    tableResults["thread_images.delete"] = { data: null, error: { code: "42501", message: "denied" } };
    const result = await updateThreadAction(9, form({ removeImageIds: "2" }, [webp()]));
    expect(result.error).toBe("Your text was saved, but the images were not changed. You don't have permission to do that.");
    expect(removeMany).toHaveBeenCalledWith([put.mock.calls[0][0]]);
    expect(dbCalls("thread_images", "insert")).toHaveLength(0);
  });

  it("removes images without checking the upload limits", async () => {
    await expect(updateThreadAction(9, form({ removeImageIds: "1" }))).rejects.toThrow("NEXT_REDIRECT /t/where-to-find-a-flat");
    expect(rpc).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    expect(dbCalls("thread_images", "delete")).toHaveLength(1);
    expect(dbCalls("thread_images", "insert")).toHaveLength(0);
    expect(removeMany).toHaveBeenCalledWith(["old/1.webp", "old/2.webp"]);
  });

  it("leaves images alone on a text-only edit", async () => {
    await expect(updateThreadAction(9, form())).rejects.toThrow("NEXT_REDIRECT");
    expect(dbCalls("thread_images", "delete")).toHaveLength(0);
    expect(removeMany).not.toHaveBeenCalled();
  });

  it("refuses a fourth image counting the ones kept", async () => {
    const result = await updateThreadAction(9, form({}, [webp()]));
    expect(result).toEqual({ error: "A thread can have at most 3 images." });
    expect(dbCalls("threads", "update")).toHaveLength(0);
  });

  describe("placement", () => {
    it("sends only title and body when category and city are unchanged", async () => {
      await expect(
        updateThreadAction(9, form({ initialCategoryId: "4", initialCity: "erlangen" })),
      ).rejects.toThrow("NEXT_REDIRECT");
      expect(threadUpdate()).toEqual({ title: "Where to find a flat?", body: "Looking for a room near the Südgelände." });
    });

    it("includes a changed category", async () => {
      await expect(updateThreadAction(9, form({ initialCategoryId: "2", initialCity: "erlangen" }))).rejects.toThrow();
      expect(threadUpdate()).toMatchObject({ category_id: 4 });
      expect(threadUpdate()).not.toHaveProperty("city");
    });

    it("includes a changed city, including clearing it", async () => {
      await expect(updateThreadAction(9, form({ initialCategoryId: "4", initialCity: "both" }))).rejects.toThrow();
      expect(threadUpdate()).toMatchObject({ city: "erlangen" });
      expect(threadUpdate()).not.toHaveProperty("category_id");

      fromCalls.length = 0;
      await expect(updateThreadAction(9, form({ city: "", initialCategoryId: "4", initialCity: "both" }))).rejects.toThrow();
      expect(threadUpdate()).toMatchObject({ city: null });
    });

    it("includes both when the hidden fields are missing", async () => {
      await expect(updateThreadAction(9, form())).rejects.toThrow();
      expect(threadUpdate()).toMatchObject({ category_id: 4, city: "erlangen" });
    });

    it("treats an empty initial city as no city", async () => {
      await expect(
        updateThreadAction(9, form({ city: "", initialCategoryId: "4", initialCity: "" })),
      ).rejects.toThrow();
      expect(threadUpdate()).not.toHaveProperty("city");
    });
  });
});
