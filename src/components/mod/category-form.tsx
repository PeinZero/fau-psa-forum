"use client";

import { useActionState, useId, useState } from "react";

import { saveCategory } from "./actions";

type Category = { id: number; name: string; slug: string; description: string | null; sort_order: number };

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const inputClass = "min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm";

export function CategoryForm({ category }: { category?: Category }) {
  const [state, formAction, pending] = useActionState(saveCategory, null);
  const uid = useId();
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  // New categories derive the slug from the name until the moderator edits it by hand.
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const msgId = `${uid}-msg`;

  return (
    <form action={formAction} className="grid gap-3" aria-describedby={state ? msgId : undefined}>
      {category && <input type="hidden" name="categoryId" value={category.id} />}
      <div className="grid gap-1">
        <label htmlFor={`${uid}-name`} className="text-sm font-medium">Name</label>
        <input
          id={`${uid}-name`}
          name="name"
          required
          minLength={2}
          maxLength={60}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          className={inputClass}
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${uid}-slug`} className="text-sm font-medium">Slug</label>
        <input
          id={`${uid}-slug`}
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          className={inputClass}
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${uid}-desc`} className="text-sm font-medium">Description (optional)</label>
        <textarea
          id={`${uid}-desc`}
          name="description"
          maxLength={300}
          rows={2}
          defaultValue={category?.description ?? ""}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor={`${uid}-order`} className="text-sm font-medium">Sort order</label>
        <input
          id={`${uid}-order`}
          name="sortOrder"
          type="number"
          step={1}
          defaultValue={category?.sort_order ?? 0}
          className={`${inputClass} sm:max-w-32`}
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Saving..." : category ? "Save changes" : "Create category"}
        </button>
      </div>
      {state && (
        <p id={msgId} role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-muted" : "text-sm text-red-700 dark:text-red-400"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
