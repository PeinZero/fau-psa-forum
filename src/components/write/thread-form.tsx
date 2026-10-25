"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useId, useRef, useState, useTransition } from "react";

import { useIsApple } from "@/components/command/platform";
import { SimilarThreads } from "@/components/duplicates/similar-threads";
import { Markdown } from "@/components/markdown";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import { Button, buttonClasses } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useResetAfterRedirect, useSyncedState } from "@/lib/form-sync";
import { cityOptionLabels, NO_CITY_LABEL } from "@/lib/labels";
import type { FormState } from "./actions";
import { CategoryPicker, type CategoryOption } from "./category-picker";
import { CharCounter } from "./char-counter";
import { ChoiceGroup } from "./choice-group";
import { MarkdownHint } from "./markdown-hint";
import { SubmitHint } from "./submit-hint";

export type ThreadFormValues = {
  title: string;
  body: string;
  categoryId: number | null;
  city: "erlangen" | "nuremberg" | "both" | null;
};

type Props = {
  categories: readonly CategoryOption[];
  initial: ThreadFormValues;
  submitLabel: string;
  pendingLabel: string;
  /** Suggests existing threads while the title is typed; meant for new threads only. */
  suggestSimilar?: boolean;
  /** Shown beside the submit button, e.g. what happens after submitting. */
  footnote?: ReactNode;
  cancelHref?: string;
  action: (formData: FormData) => Promise<FormState>;
};

const editorModes = [
  { value: "write", label: "Write" },
  { value: "preview", label: "Preview" },
] as const;

export const TITLE_MIN = 8;
export const TITLE_MAX = 150;
export const BODY_MAX = 20000;

const cityChoices = [
  { value: "", label: NO_CITY_LABEL },
  ...(Object.keys(cityOptionLabels) as (keyof typeof cityOptionLabels)[]).map((key) => ({
    value: key,
    label: cityOptionLabels[key],
  })),
];

/** The first invalid control; a radio group points at its checked (or first) option. */
export function firstInvalidControl(form: HTMLFormElement): HTMLElement | null {
  const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!(invalid instanceof HTMLFieldSetElement)) return invalid;
  return invalid.querySelector<HTMLElement>("input:checked") ?? invalid.querySelector<HTMLElement>("input");
}

export function ThreadForm({
  categories,
  initial,
  submitLabel,
  pendingLabel,
  suggestSimilar = false,
  footnote,
  cancelHref,
  action,
}: Props) {
  const id = useId();
  const isApple = useIsApple();
  // Editing follows the stored thread, so a later visit shows its current text.
  const [title, setTitle] = useSyncedState(initial.title);
  const [body, setBody] = useSyncedState(initial.body);
  const [categoryId, setCategoryId] = useSyncedState(initial.categoryId?.toString() ?? "");
  const [city, setCity] = useSyncedState<string>(initial.city ?? "");
  const [preview, setPreview] = useState(false);
  const [state, setState] = useState<FormState>({});
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const focusInvalidRef = useRef(false);
  const leftAfterSubmitRef = useResetAfterRedirect(() => {
    setTitle(initial.title);
    setBody(initial.body);
    setCategoryId(initial.categoryId?.toString() ?? "");
    setCity(initial.city ?? "");
    setPreview(false);
    setState({});
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    setState({});
    leftAfterSubmitRef.current = true;
    startTransition(async () => {
      // A successful action redirects, so only failures return here.
      const result = await action(formData);
      leftAfterSubmitRef.current = false;
      setState(result);
      if (result.fieldErrors) {
        setPreview(false);
        focusInvalidRef.current = true;
      }
    });
  }

  // Runs once the fields are enabled again, since a disabled control can't take focus.
  useEffect(() => {
    if (pending || !focusInvalidRef.current || !formRef.current) return;
    focusInvalidRef.current = false;
    firstInvalidControl(formRef.current)?.focus();
  }, [pending, state]);

  // Clearing a field's error as soon as it is edited keeps the form from scolding a fixed field.
  function clearError(field: keyof NonNullable<FormState["fieldErrors"]>) {
    if (!state.fieldErrors?.[field]) return;
    setState((current) => ({ ...current, fieldErrors: { ...current.fieldErrors, [field]: undefined } }));
  }

  const fe = state.fieldErrors ?? {};
  const describe = (...ids: (string | false | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;
  const errorId = (field: string) => `${id}-${field}-error`;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-7" noValidate>
      {state.error ? (
        <p
          role="alert"
          className="flex animate-fade-in items-start gap-2 rounded-md border border-danger/25 bg-danger/10 p-3 text-meta text-danger"
        >
          <AlertCircle aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <fieldset disabled={pending} className="contents">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-title`}>Title</Label>
          <Input
            id={`${id}-title`}
            name="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearError("title");
            }}
            required
            minLength={TITLE_MIN}
            maxLength={TITLE_MAX}
            autoComplete="off"
            placeholder="e.g. What do I need for the Anmeldung?"
            aria-invalid={fe.title ? true : undefined}
            aria-describedby={describe(fe.title && errorId("title"), `${id}-title-hint`)}
            className="min-h-10 sm:text-body"
          />
          <div className="flex min-h-5 items-start justify-between gap-3">
            <p id={`${id}-title-hint`} className="text-meta text-muted">
              Write it the way you would search for it.
            </p>
            <CharCounter length={title.length} max={TITLE_MAX} />
          </div>
          <FieldError id={errorId("title")} message={fe.title} />
          {suggestSimilar ? <SimilarThreads title={title} /> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <CategoryPicker
            name="categoryId"
            categories={categories}
            value={categoryId}
            onChange={(value) => {
              setCategoryId(value);
              clearError("categoryId");
            }}
            invalid={Boolean(fe.categoryId)}
            describedBy={describe(fe.categoryId && errorId("category"))}
          />
          <FieldError id={errorId("category")} message={fe.categoryId} />
        </div>

        <div className="flex flex-col gap-1.5">
          <ChoiceGroup
            name="city"
            legend="City"
            value={city}
            options={cityChoices}
            onChange={(value) => {
              setCity(value);
              clearError("city");
            }}
            invalid={Boolean(fe.city)}
            describedBy={describe(fe.city && errorId("city"))}
          />
          <FieldError id={errorId("city")} message={fe.city} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-end justify-between gap-2">
            <Label htmlFor={`${id}-body`}>Details</Label>
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
            onValueChange={(value) => {
              setBody(value);
              clearError("body");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            required
            maxLength={BODY_MAX}
            rows={10}
            hidden={preview}
            placeholder="What have you tried, what is your situation, and what exactly do you need to know?"
            className="min-h-56 max-h-[70vh] [field-sizing:content]"
            aria-invalid={fe.body ? true : undefined}
            aria-describedby={describe(fe.body && errorId("body"), `${id}-body-hint`)}
          />
          {preview ? (
            <div
              aria-label="Preview"
              className="min-h-56 animate-fade-in rounded-md border border-border bg-background px-3 py-2.5"
            >
              {body.trim() ? (
                <Markdown size="reading">{body}</Markdown>
              ) : (
                <p className="text-body text-subtle">Nothing to preview yet.</p>
              )}
            </div>
          ) : null}
          <div className="flex min-h-5 items-start justify-between gap-3">
            <MarkdownHint id={`${id}-body-hint`} />
            <CharCounter length={body.length} max={BODY_MAX} />
          </div>
          <FieldError id={errorId("body")} message={fe.body} />
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        {footnote ? <p className="text-meta text-muted sm:max-w-sm">{footnote}</p> : <span />}
        <div className="flex items-center gap-2 sm:shrink-0">
          <SubmitHint isApple={isApple} />
          {cancelHref ? (
            <Link href={cancelHref} className={buttonClasses({ variant: "ghost" })}>
              Cancel
            </Link>
          ) : null}
          <Button type="submit" disabled={pending} className="flex-1 sm:flex-none">
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {pending ? pendingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
