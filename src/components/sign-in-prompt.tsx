import Link from "next/link";

export function SignInPrompt({ next, purpose }: { next: string; purpose: string }) {
  return (
    <p>
      Please{" "}
      <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-accent underline">
        sign in
      </Link>{" "}
      {purpose}
    </p>
  );
}
