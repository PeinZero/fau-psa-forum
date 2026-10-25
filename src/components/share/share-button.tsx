"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/field";

type Status = "idle" | "copied" | "manual";

const COPIED_MS = 2000;

// Desktop browsers also expose navigator.share, but there a copied link is what people expect.
function prefersShareSheet(): boolean {
  return typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches;
}

/** Native share sheet on touch devices, otherwise copies the canonical URL. */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const copied = status === "copied";

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (status === "manual") input.current?.select();
  }, [status]);

  async function share() {
    if (prefersShareSheet()) {
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

  const label = "col-start-1 row-start-1 transition-opacity duration-150 ease-out";

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={share} className={cn(copied && "text-foreground")}>
        {copied ? (
          <Check aria-hidden strokeWidth={1.75} className="animate-fade-in text-accent" />
        ) : (
          <Share2 aria-hidden strokeWidth={1.75} />
        )}
        {/* Both labels share one grid cell so the button keeps the wider width and nothing beside it moves. */}
        <span className="grid text-left">
          <span aria-hidden={copied} className={cn(label, copied && "opacity-0")}>
            Share
          </span>
          <span aria-hidden={!copied} className={cn(label, !copied && "opacity-0")}>
            Copied
          </span>
        </span>
      </Button>
      {status === "manual" && (
        <Input
          ref={input}
          readOnly
          value={url}
          aria-label="Thread link"
          onFocus={(event) => event.currentTarget.select()}
          className="w-44 min-w-0 text-meta sm:w-64"
        />
      )}
      <span role="status" className="sr-only">
        {copied ? "Link copied" : status === "manual" ? "Copy the thread link from the field" : ""}
      </span>
    </div>
  );
}
