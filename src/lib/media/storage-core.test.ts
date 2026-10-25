import { describe, expect, it, vi } from "vitest";
import { MediaStorageError, createMediaStorage } from "./storage-core";

const config = { region: "eu-central-003", bucket: "test-bucket", keyId: "KEYID123", applicationKey: "secret-value" };
const KEY = "threads/0b9a1f5e-3c1d-4a7e-8b2f-5d6c7e8f9a0b.webp";
const KEY2 = "threads/1b9a1f5e-3c1d-4a7e-8b2f-5d6c7e8f9a0b.jpg";

function setup(status: number | ((req: Request) => number) = 200) {
  const calls: Request[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const req = input as Request;
    calls.push(req);
    return new Response(null, { status: typeof status === "function" ? status(req) : status });
  }) as unknown as typeof fetch;
  return { storage: createMediaStorage(config, fetchImpl), calls, fetchImpl };
}

describe("put", () => {
  it("sends a signed path-style PUT with the content type", async () => {
    const { storage, calls } = setup();
    await storage.put(KEY, new Uint8Array([1, 2, 3]), "image/webp");
    const req = calls[0];
    expect(req.method).toBe("PUT");
    expect(req.url).toBe(`https://s3.eu-central-003.backblazeb2.com/test-bucket/${KEY}`);
    expect(req.headers.get("Authorization")).toMatch(/^AWS4-HMAC-SHA256 /);
    expect(req.headers.get("Content-Type")).toBe("image/webp");
    expect([...req.headers.keys()].some((h) => h.startsWith("x-amz-checksum"))).toBe(false);
    expect(new Uint8Array(await req.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("signs the real payload hash instead of UNSIGNED-PAYLOAD", async () => {
    const { storage, calls } = setup();
    await storage.put(KEY, new Uint8Array([1, 2, 3]), "image/webp");
    // sha256 of the bytes 01 02 03
    expect(calls[0].headers.get("X-Amz-Content-Sha256")).toBe(
      "039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81",
    );
    expect(calls[0].headers.get("Authorization")).toContain("x-amz-content-sha256");
  });

  it("names Backblaze's error code in the message", async () => {
    const fetchImpl = (async () =>
      new Response("<Error><Code>AccessDenied</Code><Message>not entitled</Message></Error>", {
        status: 403,
      })) as unknown as typeof fetch;
    const error = await createMediaStorage(config, fetchImpl)
      .put(KEY, new Uint8Array([1]), "image/webp")
      .catch((e) => e);
    expect(error.message).toBe("Storage upload failed with status 403 (AccessDenied).");
  });

  it("maps failures to MediaStorageError without secrets", async () => {
    const { storage } = setup(403);
    const error = await storage.put(KEY, new Uint8Array([1]), "image/webp").catch((e) => e);
    expect(error).toBeInstanceOf(MediaStorageError);
    expect(error.status).toBe(403);
    expect(error.message).not.toContain(config.applicationKey);
    expect(error.message).not.toContain(config.keyId);
  });

  it("wraps network errors", async () => {
    const storage = createMediaStorage(config, (async () => {
      throw new Error("boom with secret-value");
    }) as unknown as typeof fetch);
    const error = await storage.put(KEY, new Uint8Array([1]), "image/webp").catch((e) => e);
    expect(error).toBeInstanceOf(MediaStorageError);
    expect(error.message).not.toContain("secret-value");
  });

  it("refuses keys that are not image keys", async () => {
    const { storage, fetchImpl } = setup();
    await expect(storage.put("threads/../x.webp", new Uint8Array([1]), "image/webp")).rejects.toBeInstanceOf(
      MediaStorageError,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("remove", () => {
  it("sends a signed DELETE", async () => {
    const { storage, calls } = setup(204);
    await storage.remove(KEY);
    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].url).toContain(`/test-bucket/${KEY}`);
    expect(calls[0].headers.get("Authorization")).toMatch(/^AWS4-HMAC-SHA256 /);
  });

  it("treats 404 as success and other errors as failures", async () => {
    await expect(setup(404).storage.remove(KEY)).resolves.toBeUndefined();
    const error = await setup(500).storage.remove(KEY).catch((e) => e);
    expect(error).toBeInstanceOf(MediaStorageError);
    expect(error.status).toBe(500);
  });

  it("refuses bad keys", async () => {
    await expect(setup().storage.remove("nope")).rejects.toBeInstanceOf(MediaStorageError);
  });
});

describe("removeMany", () => {
  it("returns the keys that failed", async () => {
    const { storage, calls } = setup((req) => (req.url.endsWith(".jpg") ? 500 : 204));
    expect(await storage.removeMany([KEY, KEY2])).toEqual([KEY2]);
    expect(calls).toHaveLength(2);
  });

  it("reports bad keys as failed and handles an empty list", async () => {
    const { storage } = setup();
    expect(await storage.removeMany(["bad", KEY])).toEqual(["bad"]);
    expect(await storage.removeMany([])).toEqual([]);
  });
});
