import { describe, expect, it } from "vitest";

import { friendlyAuthError } from "./auth-errors";

describe("friendlyAuthError", () => {
  it("maps Supabase error codes", () => {
    expect(friendlyAuthError({ code: "otp_expired" })).toMatch(/expired/);
    expect(friendlyAuthError({ code: "over_email_send_rate_limit" })).toMatch(/Too many/);
  });

  it("treats fetch failures and a missing status as a network problem", () => {
    const network = friendlyAuthError({ name: "AuthRetryableFetchError" });
    expect(network).toMatch(/reach/);
    expect(friendlyAuthError({ status: 0 })).toBe(network);
    expect(friendlyAuthError({})).toBe(network);
  });

  it("maps HTTP 429 to the rate-limit message and everything else to the generic one", () => {
    expect(friendlyAuthError({ status: 429 })).toMatch(/Too many/);
    expect(friendlyAuthError({ status: 500, code: "unexpected" })).toMatch(/couldn't sign you in/);
  });
});
