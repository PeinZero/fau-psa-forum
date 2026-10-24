"use client";

import { AlertCircle, ArrowLeft, Loader2, MailCheck, RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "./auth-errors";

type Props = { next: string; initialError?: string };

// Supabase allows one email per address per 60 s by default; waiting avoids a rate-limit error.
const RESEND_COOLDOWN_SECONDS = 60;

// Created lazily so the page still renders before Supabase env vars are configured.
let browserClient: ReturnType<typeof createClient> | undefined;
function getClient() {
  return (browserClient ??= createClient());
}

function LogoMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-10 shrink-0">
      <rect width="24" height="24" rx="6" className="fill-accent" />
      <rect x="0.5" y="0.5" width="23" height="23" rx="5.5" className="fill-none stroke-white/20" />
      <path
        d="M9 17.5V6.5h4a3.25 3.25 0 0 1 0 6.5H9"
        className="fill-none stroke-accent-foreground"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export default function LoginForm({ next, initialError }: Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const switched = useRef(false);

  useEffect(() => {
    if (!switched.current) return;
    if (sent) headingRef.current?.focus();
    else emailRef.current?.focus();
  }, [sent]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function callbackUrl() {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function requestLink(): Promise<boolean> {
    setPending(true);
    setError("");
    try {
      const { error } = await getClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callbackUrl() },
      });
      if (error) {
        setError(friendlyAuthError(error));
        return false;
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
      return true;
    } catch (e) {
      setError(friendlyAuthError(e instanceof Error ? { name: e.name } : {}));
      return false;
    } finally {
      setPending(false);
    }
  }

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    if (await requestLink()) {
      switched.current = true;
      setResent(false);
      setSent(true);
    }
  }

  async function resendLink() {
    setResent(false);
    if (await requestLink()) setResent(true);
  }

  function changeEmail() {
    switched.current = true;
    setError("");
    setResent(false);
    setSent(false);
  }

  async function signInWithGoogle() {
    setError("");
    setGooglePending(true);
    try {
      const { error } = await getClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl() },
      });
      if (error) {
        setError(friendlyAuthError(error));
        setGooglePending(false);
      }
    } catch (e) {
      setError(friendlyAuthError(e instanceof Error ? { name: e.name } : {}));
      setGooglePending(false);
    }
  }

  return (
    <Card className="animate-fade-up flex flex-col gap-6 p-5 sm:p-7">
      {sent ? (
        <div className="animate-fade-in flex flex-col items-center gap-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <MailCheck aria-hidden strokeWidth={1.75} className="size-6" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
              Check your inbox
            </h1>
            <p role="status" className="text-body text-muted">
              We sent a sign-in link to <strong className="break-all font-medium text-foreground">{email}</strong>. Open
              it on this device to continue.
            </p>
            <p className="text-meta text-muted">
              Nothing after a few minutes? Check your spam or junk folder, or the Promotions tab in Gmail.
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger/10 p-3 text-left text-meta text-danger"
            >
              <AlertCircle aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : resent ? (
            <p role="status" className="text-meta text-accent">
              We sent a new link. Use the newest email.
            </p>
          ) : null}

          <div className="flex w-full flex-col gap-2">
            <Button
              variant="secondary"
              onClick={resendLink}
              disabled={pending || cooldown > 0}
              className="w-full"
            >
              {pending ? <Loader2 aria-hidden className="animate-spin" /> : <RotateCw aria-hidden strokeWidth={1.75} />}
              {pending ? "Sending…" : cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend link"}
            </Button>
            <Button variant="ghost" onClick={changeEmail} className="w-full">
              <ArrowLeft aria-hidden strokeWidth={1.75} />
              Use a different email
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <LogoMark />
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight">Sign in to PSA Forum</h1>
              <p className="text-meta text-muted">
                You only need an account to post or comment. Reading is open to everyone.
              </p>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger/10 p-3 text-meta text-danger"
            >
              <AlertCircle aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-4">
            <Button variant="primary" onClick={signInWithGoogle} disabled={googlePending} className="w-full">
              {googlePending ? <Loader2 aria-hidden className="animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </Button>

            <div className="flex items-center gap-3 text-meta text-subtle" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  ref={emailRef}
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <Button type="submit" variant="secondary" disabled={pending} className="w-full">
                {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
                {pending ? "Sending…" : "Email me a sign-in link"}
              </Button>
            </form>
          </div>
        </>
      )}
    </Card>
  );
}
