import "server-only";

import { requestNow } from "@/lib/request-time";

import { needsVerificationHint, UnverifiedHint, type VerifiableThread } from "./verified";

/** The stale hint for a thread page, judged against this request's clock. */
export async function StaleThreadHint({ thread }: { thread: VerifiableThread }) {
  return needsVerificationHint(thread, await requestNow()) ? <UnverifiedHint /> : null;
}
