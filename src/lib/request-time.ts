import "server-only";

import { connection } from "next/server";

/**
 * The clock for this request. Waiting on `connection()` first tells Next the value belongs to the
 * request, so prerendering skips it instead of failing on an unstable `Date.now()`.
 */
export async function requestNow(): Promise<number> {
  await connection();
  return Date.now();
}
