"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useId, useRef, useState, useTransition } from "react";

import { SimilarThreads } from "@/components/duplicates/similar-threads";
import { Markdown } from "@/components/markdown";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Select } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cityLabels } from "@/lib/labels";
import type { FormState } from "./actions";

export type ThreadFormValues = {
  title: string;
  body: string;
  categoryId: number | null;
  city: "erlangen" | "nuremberg" | "both" | null;
};

type Props = {
  categories: { id: number; name: string }[];
  initial: ThreadFormValues;
  submitLabel: string;
  /** Suggests existing threads while the title is typed; meant for new threads only. */
  suggestSimilar?: boolean;
  action: (formData: FormData) => Promise<FormState>;
};

const editorModes = [
  { value: "write", label: "Write" },
  { value: "preview", label: "Preview" },
] as const;

const TITLE_MAX = 150;
const BODY_MAX = 20000;

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={cn("shrink-0 text-meta tabular-nums", value > max * 0.95 ? "text-warning" : "text-subtle")}>
      {value.toLocaleString("en")}/{max.toLocaleString("en")}
    </span>
  );
}

export function ThreadForm({ categories, initial, submitLabel, suggestSimilar = false, action }: Props) {
  const id = useId();
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [categoryId, setCategoryId] = useState(initial.categoryId?.toString() ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [preview, setPreview] = useState(false);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setState({});
    startTransition(async () => {
      // A successful action redirects, so only failures return here.
      const result = await action(formData);
      setState(result);
      if (result.fieldErrors) {
        setPreview(false);
        // Wait for the invalid state to render before looking for the field.
        requestAnimationFrame(() => {
          formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        });
      }
    });
  }

  const fe = state.fieldErrors ?? {};
  const describe = (field: string, message?: string, hint?: string) =>
    [message ? `${id}-${field}-error` : null, hint].filter(Boolean).join(" ") || undefined;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger/10 p-3 text-meta text-danger"
        >
          <AlertCircle aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={`${id}-title`}>Title</Label>
          <Counter value={title.length} max={TITLE_MAX} />
        </div>
        <Input
          id={`${id}-title`}
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={8}
          maxLength={TITLE_MAX}
          aria-invalid={fe.title ? true : undefined}
          aria-describedby={describe("title", fe.title, `${id}-title-hint`)}
        />
        <p id={`${id}-title-hint`} className="text-meta text-muted">
          8 to 150 characters. Be specific so others can find it.
        </p>
        <FieldError id={`${id}-title-error`} message={fe.title} />
        {suggestSimilar ? <SimilarThreads title={title} /> : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-category`}>Category</Label>
          <Select
            id={`${id}-category`}
            name="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            aria-invalid={fe.categoryId ? true : undefined}
            aria-describedby={describe("category", fe.categoryId)}
          >
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <FieldError id={`${id}-category-error`} message={fe.categoryId} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-city`}>City (optional)</Label>
          <Select
            id={`${id}-city`}
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value as typeof city)}
            aria-invalid={fe.city ? true : undefined}
            aria-describedby={describe("city", fe.city)}
          >
            <option value="">Not city-specific</option>
            {(Object.keys(cityLabels) as (keyof typeof cityLabels)[]).map((key) => (
              <option key={key} value={key}>
                {cityLabels[key]}
              </option>
            ))}
          </Select>
          <FieldError id={`${id}-city-error`} message={fe.city} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-body`}>Text</Label>
          <SegmentedControl
            label="Editor mode"
            value={preview ? "preview" : "write"}
            options={editorModes}
            onChange={(mode) => setPreview(mode === "preview")}
          />
        </div>
        {/* Kept mounted while previewing so the value is still submitted. */}
        <MentionTextarea
          id={`${id}-body`}
          name="body"
          value={body}
          onValueChange={setBody}
          required
          maxLength={BODY_MAX}
          rows={12}
          hidden={preview}
          className="min-h-56"
          aria-invalid={fe.body ? true : undefined}
          aria-describedby={describe("body", fe.body, `${id}-body-hint`)}
        />
        {preview ? (
          <div className="min-h-56 rounded-md border border-border bg-background p-3 text-body">
            {body.trim() ? <Markdown>{body}</Markdown> : <p className="text-muted">Nothing to preview yet.</p>}
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <p id={`${id}-body-hint`} className="text-meta text-muted">
            Markdown: <code className="font-mono">**bold**</code>, <code className="font-mono">*italic*</code>,{" "}
            <code className="font-mono">[link](https://…)</code>, lists with <code className="font-mono">-</code>,
            quotes with <code className="font-mono">&gt;</code>. Type @ to mention someone.
          </p>
          <Counter value={body.length} max={BODY_MAX} />
        </div>
        <FieldError id={`${id}-body-error`} message={fe.body} />
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
