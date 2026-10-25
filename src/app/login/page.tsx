import { Suspense } from "react";
import { safeNextPath } from "@/lib/safe-next";
import { AUTH_FAILED_MESSAGE } from "./auth-errors";
import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: AUTH_FAILED_MESSAGE,
};
const GENERIC_ERROR = "We couldn't sign you in. Please try again.";

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
    <div className="mx-auto flex w-full max-w-sm flex-col pt-2 sm:pt-10">
      <Suspense>
        <LoginContent {...props} />
      </Suspense>
    </div>
  );
}
