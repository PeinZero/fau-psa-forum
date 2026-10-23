"use client";

import { Check, CircleCheck } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  startTransition,
  use,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { cn } from "@/components/ui/cn";

import { importGuideProgress, setGuideStepDone } from "./actions";
import { ProgressBar } from "./progress-bar";

// Signed-out visitors keep their ticks in this browser only.
const STORAGE_PREFIX = "psa-guide-progress:";
const CHANGE_EVENT = "psa-guide-progress-changed";

function storageKey(guideId: number): string {
  return `${STORAGE_PREFIX}${guideId}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// Storage can be unavailable (private mode, blocked site data); progress then lasts until reload.
function readStored(guideId: number): string | null {
  try {
    return window.localStorage.getItem(storageKey(guideId));
  } catch {
    return null;
  }
}

function parseStored(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is number => Number.isInteger(id)) : [];
  } catch {
    return [];
  }
}

function writeStored(guideId: number, stepIds: number[] | null) {
  try {
    if (stepIds === null) window.localStorage.removeItem(storageKey(guideId));
    else window.localStorage.setItem(storageKey(guideId), JSON.stringify(stepIds));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return true;
}

type StepChange = { stepId: number; done: boolean };

function applyChange(state: ReadonlySet<number>, { stepId, done }: StepChange): ReadonlySet<number> {
  const next = new Set(state);
  if (done) next.add(stepId);
  else next.delete(stepId);
  return next;
}

type ProgressContext = {
  done: ReadonlySet<number>;
  doneCount: number;
  total: number;
  signedIn: boolean;
  error: string | null;
  storageFailed: boolean;
  guideSlug: string;
  toggle: (change: StepChange) => void;
};

const Context = createContext<ProgressContext | null>(null);

function useProgress(): ProgressContext {
  const value = use(Context);
  if (!value) throw new Error("Guide progress components must sit inside <GuideProgressProvider>.");
  return value;
}

export function GuideProgressProvider({
  guideId,
  guideSlug,
  stepIds,
  signedIn,
  initialDone,
  children,
}: {
  guideId: number;
  guideSlug: string;
  stepIds: number[];
  signedIn: boolean;
  initialDone: number[];
  children: ReactNode;
}) {
  // The server's ticks are the truth; each save re-renders the page with them.
  const doneKey = initialDone.join(",");
  const confirmed = useMemo<ReadonlySet<number>>(
    () => new Set(doneKey ? doneKey.split(",").map(Number) : []),
    [doneKey],
  );
  const [optimistic, applyOptimistic] = useOptimistic(confirmed, applyChange);
  const [error, setError] = useState<string | null>(null);
  const [memoryOnly, setMemoryOnly] = useState<ReadonlySet<number> | null>(null);

  const stored = useSyncExternalStore(subscribe, () => readStored(guideId), () => null);
  const local = useMemo<ReadonlySet<number>>(() => new Set(parseStored(stored)), [stored]);

  // Ticks made while signed out move into the account on the first signed-in visit.
  const synced = useRef(false);
  useEffect(() => {
    if (!signedIn || synced.current) return;
    synced.current = true;
    const pending = parseStored(readStored(guideId)).filter(
      (id) => stepIds.includes(id) && !initialDone.includes(id),
    );
    if (pending.length === 0) {
      writeStored(guideId, null);
      return;
    }
    startTransition(async () => {
      const result = await importGuideProgress(pending);
      if (result?.ok) writeStored(guideId, null);
    });
  }, [signedIn, guideId, stepIds, initialDone]);

  const done = signedIn ? optimistic : (memoryOnly ?? local);

  function toggle(change: StepChange) {
    setError(null);
    if (!signedIn) {
      const next = applyChange(done, change);
      if (!writeStored(guideId, [...next])) setMemoryOnly(next);
      return;
    }
    startTransition(async () => {
      applyOptimistic(change);
      const result = await setGuideStepDone(change.stepId, change.done);
      if (!result?.ok) setError(result?.message ?? "Could not save your progress. Please try again.");
    });
  }

  const value: ProgressContext = {
    done,
    doneCount: stepIds.filter((id) => done.has(id)).length,
    total: stepIds.length,
    signedIn,
    error,
    storageFailed: memoryOnly !== null,
    guideSlug,
    toggle,
  };

  return <Context value={value}>{children}</Context>;
}

export function GuideProgressSummary({ className }: { className?: string }) {
  const { doneCount, total, signedIn, error, storageFailed, guideSlug } = useProgress();
  const finished = total > 0 && doneCount === total;

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-center justify-between gap-3 text-meta">
        <span className="font-medium text-foreground tabular-nums" aria-hidden>
          {doneCount} of {total} done
        </span>
        {finished && (
          <span className="inline-flex items-center gap-1 font-medium text-accent">
            <CircleCheck aria-hidden strokeWidth={1.75} className="size-3.5" />
            All steps done
          </span>
        )}
      </div>
      <ProgressBar done={doneCount} total={total} label="Your progress" />
      {!signedIn && (
        <p className="text-meta text-muted">
          {storageFailed
            ? "This browser blocks saving, so your ticks last until you leave the page. "
            : "Your progress is saved in this browser. "}
          <Link
            href={`/login?next=${encodeURIComponent(`/guides/${guideSlug}`)}`}
            className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
          >
            Sign in
          </Link>{" "}
          to keep it on every device.
        </p>
      )}
      {error && (
        <p role="alert" className="text-meta text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function StepCheckbox({ stepId, number, title }: { stepId: number; number: number; title: string }) {
  const { done, toggle } = useProgress();
  const checked = done.has(stepId);

  return (
    <label className="relative -m-2.5 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => toggle({ stepId, done: event.target.checked })}
        aria-label={`Step ${number} done: ${title}`}
        className={cn(
          "peer size-6 cursor-pointer appearance-none rounded-full border-[1.5px] border-border-strong bg-surface",
          "transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-muted",
          "checked:border-accent checked:bg-accent checked:hover:border-accent-hover checked:hover:bg-accent-hover",
          "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        )}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute text-[11px] font-semibold tabular-nums text-muted transition-opacity duration-150 peer-checked:opacity-0"
      >
        {number}
      </span>
      <Check
        aria-hidden
        strokeWidth={2.5}
        className="pointer-events-none absolute size-3.5 text-accent-foreground opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
      />
    </label>
  );
}

export function StepTitle({ stepId, id, children }: { stepId: number; id: string; children: ReactNode }) {
  const { done } = useProgress();
  return (
    <h2
      id={id}
      className={cn(
        "text-base font-medium tracking-tight break-words transition-colors duration-150",
        done.has(stepId) ? "text-muted line-through decoration-subtle" : "text-foreground",
      )}
    >
      {children}
    </h2>
  );
}
