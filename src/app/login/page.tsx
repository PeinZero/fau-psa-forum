import { Suspense } from "react";
import { safeNextPath } from "@/lib/safe-next";
import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: "Sign-in failed or the link has expired. Please try again.",
};
const GENERIC_ERROR = "Something went wrong signing you in. Please try again.";

export const metadata = { title: "Sign in" };

async function LoginContent({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  const code = typeof params.error === "string" ? params.error : undefined;
  const error = code ? (ERROR_MESSAGES[code] ?? GENERIC_ERROR) : undefined;

  return <LoginForm next={next} initialError={error} />;
}

export default function LoginPage(props: LoginPageProps) {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-12">
      <h1 className="mb-1 text-2xl font-semibold">Sign in</h1>
      <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
        You only need an account to post or comment. Reading is open to everyone.
      </p>
      <Suspense>
        <LoginContent {...props} />
      </Suspense>
    </div>
  );
}
