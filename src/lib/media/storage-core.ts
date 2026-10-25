import { AwsClient } from "aws4fetch";
import { isImageKey } from "./keys";

export type MediaStorageConfig = {
  region: string;
  bucket: string;
  keyId: string;
  applicationKey: string;
};

export class MediaStorageError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "MediaStorageError";
  }
}

export type MediaStorage = ReturnType<typeof createMediaStorage>;

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Backblaze explains a refusal in an XML <Code>; only that goes into logs, never key material. */
async function failure(action: string, response: Response): Promise<MediaStorageError> {
  const code = (await response.text().catch(() => "")).match(/<Code>([^<]{1,64})<\/Code>/)?.[1];
  return new MediaStorageError(
    `Storage ${action} failed with status ${response.status}${code ? ` (${code})` : ""}.`,
    response.status,
  );
}

export function createMediaStorage(config: MediaStorageConfig, fetchImpl: typeof fetch = fetch) {
  const client = new AwsClient({
    accessKeyId: config.keyId,
    secretAccessKey: config.applicationKey,
    service: "s3",
    region: config.region,
  });
  const urlFor = (key: string) =>
    `https://s3.${config.region}.backblazeb2.com/${config.bucket}/${key}`;

  async function send(method: "PUT" | "DELETE", key: string, init: RequestInit = {}) {
    if (!isImageKey(key)) throw new MediaStorageError("Refusing to touch an unexpected storage key.");
    const request = await client.sign(urlFor(key), { ...init, method });
    try {
      return await fetchImpl(request);
    } catch {
      throw new MediaStorageError(`Storage ${method} request failed.`);
    }
  }

  return {
    async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
      // A signed payload hash instead of aws4fetch's UNSIGNED-PAYLOAD, which not every S3-compatible store accepts.
      const response = await send("PUT", key, {
        body: bytes as unknown as BodyInit,
        headers: { "Content-Type": contentType, "X-Amz-Content-Sha256": await sha256Hex(bytes) },
      });
      if (!response.ok) throw await failure("upload", response);
    },

    async remove(key: string): Promise<void> {
      const response = await send("DELETE", key);
      if (!response.ok && response.status !== 404) throw await failure("delete", response);
    },

    /** Best effort: returns the keys that could not be deleted. */
    async removeMany(keys: string[]): Promise<string[]> {
      const results = await Promise.allSettled(keys.map((key) => this.remove(key)));
      return keys.filter((_, i) => results[i].status === "rejected");
    },
  };
}
