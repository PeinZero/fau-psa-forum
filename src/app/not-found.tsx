import { Compass, Home, Search } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";

import { StatusPage } from "./_components/status-page";

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="Error 404"
      icon={<Compass />}
      title="We couldn't find that page"
      actions={
        <>
          <Link href="/search" className={buttonClasses()}>
            <Search strokeWidth={1.75} />
            Search threads
          </Link>
          <Link href="/" className={buttonClasses({ variant: "secondary" })}>
            <Home strokeWidth={1.75} />
            Back to home
          </Link>
        </>
      }
    >
      The link may be broken, or the thread was removed or is still waiting for review. Searching usually finds
      what you were after.
    </StatusPage>
  );
}
