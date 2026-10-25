"use client";

import { Play } from "lucide-react";
import { type ReactNode, useState } from "react";

import { cn } from "@/components/ui/cn";
import { buttonClasses } from "@/components/ui/button";
import { type IntroVideo as IntroVideoConfig, introVideo } from "@/lib/site";

export const INTRO_VIDEO_ID = "intro-video";

function Player({ video }: { video: IntroVideoConfig }) {
  const { source } = video;
  if (source.kind === "youtube") {
    return (
      <iframe
        title={video.title}
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(source.id)}?autoplay=1&rel=0`}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full border-0"
      />
    );
  }
  return (
    <video
      controls
      autoPlay
      playsInline
      preload="none"
      poster={video.poster}
      className="absolute inset-0 size-full bg-black object-contain"
    >
      {source.webm ? <source src={source.webm} type="video/webm" /> : null}
      <source src={source.mp4} type="video/mp4" />
      {/* Off by default: the film's story lines are already in the picture; the track describes the sound. */}
      {video.captions ? <track kind="captions" srcLang="en" label="English" src={video.captions} /> : null}
    </video>
  );
}

/** Sits after "How it works"; the hero links down to it. Renders nothing while no video is configured. */
export function IntroVideo({ video = introVideo }: { video?: IntroVideoConfig | null }) {
  const [playing, setPlaying] = useState(false);
  if (!video) return null;

  return (
    <section
      id={INTRO_VIDEO_ID}
      aria-label="Intro video"
      className="mx-auto w-full max-w-[960px] scroll-mt-20"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-surface shadow-[0_1px_2px_var(--shadow-color),0_12px_32px_-12px_var(--shadow-color)] sm:rounded-2xl">
        {playing ? (
          <Player video={video} />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- poster is a plain static asset */}
            <img src={video.poster} alt="" className="absolute inset-0 size-full object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <button
              type="button"
              aria-label={`Play intro video: ${video.title}`}
              onClick={() => setPlaying(true)}
              className="group absolute inset-0 flex flex-col items-center justify-center gap-3 text-white"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-[background-color,scale] duration-200 ease-out group-hover:bg-white motion-safe:group-hover:scale-105 sm:size-20">
                <Play aria-hidden strokeWidth={0} fill="currentColor" className="ml-1 size-6 sm:size-7" />
              </span>
            </button>
            <p className="pointer-events-none absolute right-4 bottom-3 left-4 flex items-baseline justify-between gap-3 text-left text-white sm:right-6 sm:bottom-5 sm:left-6">
              <span className="min-w-0 truncate text-small font-medium sm:text-body">{video.title}</span>
              <span className="shrink-0 text-meta tabular-nums text-white/80">{video.durationLabel}</span>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/** Hero shortcut that scrolls to the video section. */
export function WatchIntroLink({
  durationLabel,
  className,
  children,
}: {
  durationLabel: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={`#${INTRO_VIDEO_ID}`}
      onClick={(event) => {
        const target = document.getElementById(INTRO_VIDEO_ID);
        if (!target) return;
        event.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        history.replaceState(null, "", `#${INTRO_VIDEO_ID}`);
      }}
      className={cn(buttonClasses({ variant: "ghost", className: "min-h-11 px-4 text-body" }), className)}
    >
      <Play aria-hidden strokeWidth={1.75} />
      {children ?? `Watch the intro (${durationLabel})`}
    </a>
  );
}
