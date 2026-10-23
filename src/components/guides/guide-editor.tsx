"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Input, Label, Textarea } from "@/components/ui/field";

import { saveGuide, type SaveGuideState } from "./actions";
import {
  GUIDE_SLUG_MAX,
  GUIDE_STEPS_MAX,
  GUIDE_SUMMARY_MAX,
  GUIDE_TITLE_MAX,
  GUIDE_TITLE_MIN,
  slugify,
  STEP_BODY_MAX,
  STEP_TITLE_MAX,
  STEP_TITLE_MIN,
} from "./limits";
import { type LinkedThread, ThreadPicker } from "./thread-picker";

export type EditorGuide = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  is_featured: boolean;
  sort_order: number;
  steps: { id: number; title: string; body: string | null; thread: LinkedThread | null }[];
};

type DraftStep = { key: string; id: number | null; title: string; body: string; thread: LinkedThread | null };

function emptyStep(): DraftStep {
  return { key: crypto.randomUUID(), id: null, title: "", body: "", thread: null };
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={cn("shrink-0 text-meta tabular-nums", value > max * 0.95 ? "text-warning" : "text-subtle")}>
      {value.toLocaleString("en")}/{max.toLocaleString("en")}
    </span>
  );
}

/** Creates a guide, or edits `guide` when given. Steps are saved together with the guide. */
export function GuideEditor({ guide }: { guide?: EditorGuide }) {
  const uid = useId();
  const [title, setTitle] = useState(guide?.title ?? "");
  const [slug, setSlug] = useState(guide?.slug ?? "");
  // New guides follow the title until the moderator edits the address; published links never change by accident.
  const [slugTouched, setSlugTouched] = useState(Boolean(guide));
  const [summary, setSummary] = useState(guide?.summary ?? "");
  const [steps, setSteps] = useState<DraftStep[]>(() =>
    guide && guide.steps.length > 0
      ? guide.steps.map((step) => ({
          key: `step-${step.id}`,
          id: step.id,
          title: step.title,
          body: step.body ?? "",
          thread: step.thread,
        }))
      : [emptyStep()],
  );
  const [announcement, setAnnouncement] = useState("");
  const focusTarget = useRef<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  const [state, formAction, pending] = useActionState(async (prev: SaveGuideState, formData: FormData) => {
    const result = await saveGuide(prev, formData);
    // New steps learn their ids, so the next save updates them instead of adding them again.
    const saved = new Map(result?.savedSteps?.map((step) => [step.key, step.id]));
    if (saved.size > 0) setSteps((current) => current.map((step) => ({ ...step, id: saved.get(step.key) ?? step.id })));
    return result;
  }, null);

  useEffect(() => {
    if (!focusTarget.current) return;
    const target = listRef.current?.querySelector<HTMLElement>(focusTarget.current);
    focusTarget.current = null;
    target?.focus();
  }, [steps]);

  function updateStep(key: string, patch: Partial<DraftStep>) {
    setSteps((current) => current.map((step) => (step.key === key ? { ...step, ...patch } : step)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    const moved = steps[index];
    // Keep focus on the arrow that was pressed; at the edge it is disabled, so use the other one.
    const atEdge = target === 0 || target === steps.length - 1;
    const arrow = atEdge ? (direction === -1 ? "down" : "up") : direction === -1 ? "up" : "down";
    focusTarget.current = `[data-step="${moved.key}"] [data-move="${arrow}"]`;
    setSteps(next);
    setAnnouncement(`Step moved to position ${target + 1} of ${steps.length}.`);
  }

  function remove(index: number) {
    const next = steps.filter((_, i) => i !== index);
    const neighbour = next[Math.min(index, next.length - 1)];
    focusTarget.current = neighbour ? `[data-step="${neighbour.key}"] input` : null;
    setSteps(next);
    setAnnouncement(`Step ${index + 1} removed.`);
  }

  function add() {
    const step = emptyStep();
    focusTarget.current = `[data-step="${step.key}"] input`;
    setSteps((current) => [...current, step]);
  }

  const payload = JSON.stringify(
    steps.map((step) => ({
      key: step.key,
      id: step.id,
      title: step.title,
      body: step.body,
      threadSlug: step.thread?.slug ?? null,
    })),
  );
  const msgId = `${uid}-msg`;

  return (
    <form action={formAction} noValidate className="grid gap-6" aria-describedby={state ? msgId : undefined}>
      {guide && <input type="hidden" name="guideId" value={guide.id} />}
      <input type="hidden" name="steps" value={payload} />

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor={`${uid}-title`}>Title</Label>
            <Counter value={title.length} max={GUIDE_TITLE_MAX} />
          </div>
          <Input
            id={`${uid}-title`}
            name="title"
            required
            minLength={GUIDE_TITLE_MIN}
            maxLength={GUIDE_TITLE_MAX}
            placeholder="Arriving in Erlangen"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${uid}-slug`}>Address</Label>
          <div className="flex min-w-0 items-center gap-2">
            <span aria-hidden className="shrink-0 text-meta text-subtle">
              /guides/
            </span>
            <Input
              id={`${uid}-slug`}
              name="slug"
              required
              maxLength={GUIDE_SLUG_MAX}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value.toLowerCase());
              }}
              aria-describedby={`${uid}-slug-hint`}
              className="min-w-0 font-mono"
            />
          </div>
          <p id={`${uid}-slug-hint`} className="text-meta text-muted">
            Lowercase letters, digits and dashes. Changing it breaks links that were already shared.
          </p>
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor={`${uid}-summary`}>Summary</Label>
            <Counter value={summary.length} max={GUIDE_SUMMARY_MAX} />
          </div>
          <Textarea
            id={`${uid}-summary`}
            name="summary"
            maxLength={GUIDE_SUMMARY_MAX}
            rows={2}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className="min-h-16"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
          <div className="grid gap-1.5">
            <Label htmlFor={`${uid}-order`}>Sort order</Label>
            <Input
              id={`${uid}-order`}
              name="sortOrder"
              type="number"
              inputMode="numeric"
              min={-1000}
              max={1000}
              step={1}
              defaultValue={guide?.sort_order ?? 0}
              aria-describedby={`${uid}-order-hint`}
            />
            <p id={`${uid}-order-hint`} className="text-meta text-muted">
              Lower numbers come first.
            </p>
          </div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 sm:mt-7 sm:min-h-0">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={guide?.is_featured ?? false}
              className="mt-0.5 size-4 shrink-0 accent-(--accent)"
            />
            <span className="grid gap-0.5">
              <span className="text-meta font-medium text-foreground">Feature for newcomers</span>
              <span className="text-meta text-muted">Featured guides come first and show on the home page (up to three).</span>
            </span>
          </label>
        </div>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-3 flex w-full items-baseline justify-between gap-2">
          <span className="text-sm font-semibold tracking-tight text-foreground">Steps</span>
          <span className="text-meta tabular-nums text-subtle">
            {steps.length}/{GUIDE_STEPS_MAX}
          </span>
        </legend>

        <ol ref={listRef} className="grid gap-3">
          {steps.map((step, index) => {
            const base = `${uid}-step-${step.key}`;
            return (
              <li
                key={step.key}
                data-step={step.key}
                className="grid gap-3 rounded-xl border border-border bg-background p-3 sm:p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong text-[11px] font-semibold tabular-nums text-muted">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-meta font-medium text-muted">
                    {step.title.trim() || "Untitled step"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-move="up"
                    aria-label={`Move step ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp strokeWidth={1.75} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-move="down"
                    aria-label={`Move step ${index + 1} down`}
                    disabled={index === steps.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown strokeWidth={1.75} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove step ${index + 1}`}
                    disabled={steps.length === 1}
                    onClick={() => remove(index)}
                    className="hover:text-danger"
                  >
                    <Trash2 strokeWidth={1.75} />
                  </Button>
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor={`${base}-title`}>Step title</Label>
                    <Counter value={step.title.length} max={STEP_TITLE_MAX} />
                  </div>
                  <Input
                    id={`${base}-title`}
                    required
                    minLength={STEP_TITLE_MIN}
                    maxLength={STEP_TITLE_MAX}
                    value={step.title}
                    onChange={(event) => updateStep(step.key, { title: event.target.value })}
                  />
                </div>

                <div className="grid gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor={`${base}-body`}>Instructions (optional)</Label>
                    <Counter value={step.body.length} max={STEP_BODY_MAX} />
                  </div>
                  <Textarea
                    id={`${base}-body`}
                    maxLength={STEP_BODY_MAX}
                    rows={4}
                    value={step.body}
                    onChange={(event) => updateStep(step.key, { body: event.target.value })}
                    aria-describedby={`${uid}-markdown-hint`}
                    className="min-h-24"
                  />
                </div>

                <div className="grid gap-1.5">
                  <span className="text-meta font-medium text-foreground">Linked thread (optional)</span>
                  <ThreadPicker
                    label={`Linked thread for step ${index + 1}`}
                    value={step.thread}
                    onChange={(thread) => updateStep(step.key, { thread })}
                  />
                </div>
              </li>
            );
          })}
        </ol>

        <p id={`${uid}-markdown-hint`} className="text-meta text-muted">
          Instructions support Markdown: <code className="font-mono">**bold**</code>,{" "}
          <code className="font-mono">[link](https://…)</code>, lists with <code className="font-mono">-</code>.
        </p>

        <div>
          <Button variant="secondary" onClick={add} disabled={steps.length >= GUIDE_STEPS_MAX}>
            <Plus aria-hidden strokeWidth={1.75} />
            Add step
          </Button>
        </div>
        <p role="status" className="sr-only">
          {announcement}
        </p>
      </fieldset>

      <div className="flex flex-col gap-2 border-t border-border pt-5">
        <div>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? (guide ? "Saving..." : "Creating...") : guide ? "Save guide" : "Create guide"}
          </Button>
        </div>
        {state && (
          <p id={msgId} role={state.ok ? "status" : "alert"} className={state.ok ? "text-meta text-muted" : "text-meta text-danger"}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
