"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = { next: string; initialError?: string };

// Created lazily so the page still renders before Supabase env vars are configured.
let browserClient: ReturnType<typeof createClient> | undefined;
function getClient() {
  return (browserClient ??= createClient());
}

export default function LoginForm({ next, initialError }: Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [pending, setPending] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const switched = useRef(false);

  useEffect(() => {
    if (!switched.current) return;
    if (sent) headingRef.current?.focus();
    else emailRef.current?.focus();
  }, [sent]);

  function callbackUrl() {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const { error } = await getClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setPending(false);
    if (error) setError(error.message);
    else {
      switched.current = true;
      setSent(true);
    }
  }

  async function signInWithGoogle() {
    setError("");
    const { error } = await getClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="space-y-4">
      <div role="status">
        {sent && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            We sent a sign-in link to <strong className="break-all">{email}</strong>. Open it on
            this device to continue.
          </p>
        )}
      </div>

      {sent ? (
        <div className="space-y-2">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
            Check your inbox
          </h2>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="inline-flex min-h-11 items-center text-sm underline underline-offset-2"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={sendMagicLink} className="space-y-3">
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              ref={emailRef}
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 w-full rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              {pending ? "Sending..." : "Email me a sign-in link"}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
            or
            <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
          </div>

          <button
            type="button"
            onClick={signInWithGoogle}
            className="min-h-11 w-full rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Continue with Google
          </button>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
