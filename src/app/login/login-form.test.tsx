import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginForm from "./login-form";

const { signInWithOtp, signInWithOAuth } = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOtp, signInWithOAuth } }),
}));

async function sendLink(email: string) {
  await userEvent.type(screen.getByLabelText("Email"), email);
  await userEvent.click(screen.getByRole("button", { name: "Email me a sign-in link" }));
}

describe("LoginForm", () => {
  beforeEach(() => {
    signInWithOtp.mockReset().mockResolvedValue({ error: null });
    signInWithOAuth.mockReset().mockResolvedValue({ error: null });
  });

  it("shows the initial error as an alert", () => {
    render(<LoginForm next="/" initialError="That sign-in link has expired." />);
    expect(screen.getByRole("alert")).toHaveTextContent("That sign-in link has expired.");
  });

  it("requests a magic link and confirms with the address", async () => {
    render(<LoginForm next="/t/abc" />);
    await sendLink("someone@uni.example");
    expect(signInWithOtp).toHaveBeenCalledTimes(1);
    expect(signInWithOtp.mock.calls[0][0].email).toBe("someone@uni.example");
    expect(signInWithOtp.mock.calls[0][0].options.emailRedirectTo).toContain(
      `/auth/callback?next=${encodeURIComponent("/t/abc")}`,
    );
    expect(await screen.findByRole("heading", { name: "Check your inbox" })).toBeInTheDocument();
    expect(screen.getByText("someone@uni.example")).toBeInTheDocument();
  });

  it("links to Gmail in a new tab for gmail addresses", async () => {
    render(<LoginForm next="/" />);
    await sendLink("me@gmail.com");
    const link = await screen.findByRole("link", { name: /Open Gmail/ });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/mail\.google\.com/);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("offers no inbox link for an unknown domain", async () => {
    render(<LoginForm next="/" />);
    await sendLink("me@uni.example");
    await screen.findByRole("heading", { name: "Check your inbox" });
    expect(screen.queryByRole("link", { name: /Open / })).not.toBeInTheDocument();
  });

  it("blocks resending during the cooldown", async () => {
    render(<LoginForm next="/" />);
    await sendLink("me@uni.example");
    const resend = await screen.findByRole("button", { name: /Resend link in 60s/ });
    expect(resend).toBeDisabled();
  });

  it("returns to the form with a different email", async () => {
    render(<LoginForm next="/" />);
    await sendLink("me@uni.example");
    await userEvent.click(await screen.findByRole("button", { name: "Use a different email" }));
    expect(screen.getByRole("heading", { name: "Sign in to the forum" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows a friendly message for a Supabase error code, never the raw one", async () => {
    signInWithOtp.mockResolvedValue({
      error: { code: "over_email_send_rate_limit", message: "email rate limit exceeded", status: 429 },
    });
    render(<LoginForm next="/" />);
    await sendLink("me@uni.example");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Too many sign-in emails were sent in the last hour.");
    expect(alert).not.toHaveTextContent("email rate limit exceeded");
    expect(screen.queryByRole("heading", { name: "Check your inbox" })).not.toBeInTheDocument();
  });

  it("starts Google sign-in", async () => {
    render(<LoginForm next="/" />);
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(signInWithOAuth).toHaveBeenCalledWith(expect.objectContaining({ provider: "google" }));
    expect(await screen.findByRole("button", { name: "Opening Google…" })).toBeDisabled();
  });
});
