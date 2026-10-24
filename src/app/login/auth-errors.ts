const GENERIC = "We couldn't sign you in. Please try again, or continue with Google.";
const NETWORK = "We couldn't reach the sign-in service. Check your connection and try again.";

const RATE_LIMIT =
  "Too many sign-in emails were sent in the last hour. Please try again later or continue with Google.";
const SIGN_IN_UNAVAILABLE = "This sign-in method isn't available right now. Please try another one.";

const BY_CODE: Record<string, string> = {
  over_email_send_rate_limit: RATE_LIMIT,
  over_request_rate_limit: "Too many attempts. Please wait a moment and try again.",
  email_address_invalid: "That email address doesn't look right. Please check it and try again.",
  email_address_not_authorized: "Sign-in emails can't be sent to that address. Please use a different email or Google.",
  validation_failed: "That email address doesn't look right. Please check it and try again.",
  otp_expired: "That sign-in link has expired or was already used. Request a new one.",
  flow_state_expired: "That sign-in link has expired or was already used. Request a new one.",
  flow_state_not_found: "That sign-in link has expired or was already used. Request a new one.",
  bad_code_verifier: "That sign-in link has expired or was already used. Request a new one.",
  signup_disabled: "New accounts can't be created right now. Please try again later.",
  user_banned: "This account can't sign in. Please contact a moderator.",
  provider_disabled: SIGN_IN_UNAVAILABLE,
  email_provider_disabled: SIGN_IN_UNAVAILABLE,
  oauth_provider_not_supported: SIGN_IN_UNAVAILABLE,
  captcha_failed: "We couldn't verify you're human. Please try again.",
  request_timeout: NETWORK,
};

export const AUTH_FAILED_MESSAGE = "That sign-in link has expired or was already used. Request a new one.";

/** Raw Supabase messages never reach the UI; unknown errors get one generic text. */
export function friendlyAuthError(error: { code?: string; status?: number; name?: string }): string {
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  if (error.name === "AuthRetryableFetchError" || error.status === 0 || error.status === undefined) return NETWORK;
  if (error.status === 429) return RATE_LIMIT;
  return GENERIC;
}
