import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted">
        The page you are looking for does not exist or has moved.
      </p>
      <Link href="/" className="text-accent underline">
        Back to home
      </Link>
    </div>
  );
}
