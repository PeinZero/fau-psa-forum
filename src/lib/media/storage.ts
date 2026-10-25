import "server-only";
import { createMediaStorage, type MediaStorage } from "./storage-core";

const VARIABLES = {
  region: "MEDIA_B2_REGION",
  bucket: "MEDIA_B2_BUCKET",
  keyId: "MEDIA_B2_KEY_ID",
  applicationKey: "MEDIA_B2_APPLICATION_KEY",
} as const;

export function mediaStorage(): MediaStorage {
  const config = {} as Record<keyof typeof VARIABLES, string>;
  for (const [field, name] of Object.entries(VARIABLES) as [keyof typeof VARIABLES, string][]) {
    const value = process.env[name];
    if (!value) throw new Error(`Image storage is not configured: ${name} is missing.`);
    config[field] = value;
  }
  return createMediaStorage(config);
}
