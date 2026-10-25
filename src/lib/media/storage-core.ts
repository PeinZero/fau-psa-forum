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
      const response = await send("PUT", key, {
        body: bytes as unknown as BodyInit,
        headers: { "Content-Type": contentType },
      });
      if (!response.ok) {
        throw new MediaStorageError(`Storage upload failed with status ${response.status}.`, response.status);
      }
    },

    async remove(key: string): Promise<void> {
      const response = await send("DELETE", key);
      if (!response.ok && response.status !== 404) {
        throw new MediaStorageError(`Storage delete failed with status ${response.status}.`, response.status);
      }
    },

    /** Best effort: returns the keys that could not be deleted. */
    async removeMany(keys: string[]): Promise<string[]> {
      const results = await Promise.allSettled(keys.map((key) => this.remove(key)));
      return keys.filter((_, i) => results[i].status === "rejected");
    },
  };
}
