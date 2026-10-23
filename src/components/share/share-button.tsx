"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Status = "idle" | "copied" | "manual";

const COPIED_MS = 2000;

/** Native share sheet where available (mobile), otherwise copies the canonical URL. */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (status === "manual") input.current?.select();
  }, [status]);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setStatus("manual");
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), COPIED_MS);
    } catch {
      setStatus("manual");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={share}>
        {status === "copied" ? <Check strokeWidth={1.75} /> : <Share2 strokeWidth={1.75} />}
        {status === "copied" ? "Copied" : "Share"}
      </Button>
      {status === "manual" && (
        <input
          ref={input}
          readOnly
          value={url}
          aria-label="Thread link"
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-8 w-44 min-w-0 rounded-md border border-border bg-background px-2 text-meta text-foreground sm:w-64"
        />
      )}
      <span role="status" className="sr-only">
        {status === "copied" ? "Link copied" : ""}
      </span>
    </div>
  );
}
