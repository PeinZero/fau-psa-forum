"use client";

import { useActionState, useId, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { submitWithoutReset, useSyncedState } from "@/lib/form-sync";

import { type ActionState, saveCategory } from "./actions";

type Category = { id: number; name: string; slug: string; description: string | null; sort_order: number };

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function fieldsOf(category?: Category) {
  return {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? "",
    sortOrder: String(category?.sort_order ?? 0),
  };
}

/** Creates a category, or edits `category` when given; the fields follow the saved values. */
export function CategoryForm({ category }: { category?: Category }) {
  const uid = useId();
  const [fields, setFields] = useSyncedState(fieldsOf(category));
  // New categories derive the slug from the name until the moderator edits it by hand.
  const slugTouched = useRef(Boolean(category));
  const set = (patch: Partial<typeof fields>) => setFields((current) => ({ ...current, ...patch }));

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveCategory(prev, formData);
    if (result?.ok && !category) {
      setFields(fieldsOf());
      slugTouched.current = false;
    }
    return result;
  }, null);
  const msgId = `${uid}-msg`;

  return (
    <form onSubmit={submitWithoutReset(formAction)} className="grid gap-3" aria-describedby={state ? msgId : undefined}>
      {category && <input type="hidden" name="categoryId" value={category.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor={`${uid}-name`}>Name</Label>
        <Input
          id={`${uid}-name`}
          name="name"
          required
          minLength={2}
          maxLength={60}
          value={fields.name}
          onChange={(e) =>
            set(slugTouched.current ? { name: e.target.value } : { name: e.target.value, slug: slugify(e.target.value) })
          }
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${uid}-slug`}>Slug</Label>
        <Input
          id={`${uid}-slug`}
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          value={fields.slug}
          onChange={(e) => {
            slugTouched.current = true;
            set({ slug: e.target.value });
          }}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${uid}-desc`}>Description (optional)</Label>
        <Textarea
          id={`${uid}-desc`}
          name="description"
          maxLength={300}
          rows={2}
          value={fields.description}
          onChange={(e) => set({ description: e.target.value })}
          className="min-h-16"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${uid}-order`}>Sort order</Label>
        <Input
          id={`${uid}-order`}
          name="sortOrder"
          type="number"
          step={1}
          value={fields.sortOrder}
          onChange={(e) => set({ sortOrder: e.target.value })}
          className="sm:max-w-32"
        />
      </div>
      <div>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving..." : category ? "Save changes" : "Create category"}
        </Button>
      </div>
      {state && (
        <p id={msgId} role={state.ok ? "status" : "alert"} className={state.ok ? "text-meta text-muted" : "text-meta text-danger"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
