"use client";

import { useId, useRef, useState, useTransition } from "react";

import { Markdown } from "@/components/markdown";
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
  action: (formData: FormData) => Promise<FormState>;
};

const inputClass = "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

export function ThreadForm({ categories, initial, submitLabel, action }: Props) {
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
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-md border border-red-600 p-3 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-title`} className="text-sm font-medium">
          Title
        </label>
        <input
          id={`${id}-title`}
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={8}
          maxLength={150}
          aria-invalid={fe.title ? true : undefined}
          aria-describedby={describe("title", fe.title, `${id}-title-hint`)}
          className={inputClass}
        />
        <p id={`${id}-title-hint`} className="text-xs text-muted">
          8 to 150 characters. Be specific so others can find it.
        </p>
        <FieldError id={`${id}-title-error`} message={fe.title} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-category`} className="text-sm font-medium">
          Category
        </label>
        <select
          id={`${id}-category`}
          name="categoryId"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          aria-invalid={fe.categoryId ? true : undefined}
          aria-describedby={describe("category", fe.categoryId)}
          className={inputClass}
        >
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <FieldError id={`${id}-category-error`} message={fe.categoryId} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-city`} className="text-sm font-medium">
          City (optional)
        </label>
        <select
          id={`${id}-city`}
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value as typeof city)}
          aria-invalid={fe.city ? true : undefined}
          aria-describedby={describe("city", fe.city)}
          className={inputClass}
        >
          <option value="">Not city-specific</option>
          {(Object.keys(cityLabels) as (keyof typeof cityLabels)[]).map((key) => (
            <option key={key} value={key}>
              {cityLabels[key]}
            </option>
          ))}
        </select>
        <FieldError id={`${id}-city-error`} message={fe.city} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${id}-body`} className="text-sm font-medium">
            Text
          </label>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="min-h-11 rounded-md px-2 text-sm text-muted underline"
          >
            {preview ? "Back to editing" : "Preview"}
          </button>
        </div>
        {/* Kept mounted while previewing so the value is still submitted. */}
        <textarea
          id={`${id}-body`}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={20000}
          rows={12}
          hidden={preview}
          aria-invalid={fe.body ? true : undefined}
          aria-describedby={describe("body", fe.body, `${id}-body-hint`)}
          className={inputClass}
        />
        {preview ? (
          <div className="min-h-32 rounded-md border border-border p-3">
            {body.trim() ? <Markdown>{body}</Markdown> : <p className="text-muted">Nothing to preview yet.</p>}
          </div>
        ) : null}
        <p id={`${id}-body-hint`} className="text-xs text-muted">
          Markdown: **bold**, *italic*, [link](https://example.com), lists with - and quotes with &gt;.{" "}
          {body.length}/20000
        </p>
        <FieldError id={`${id}-body-error`} message={fe.body} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 self-start rounded-md bg-accent px-5 text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
