"use client";

import { useActionState, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

import { saveCategory } from "./actions";

type Category = { id: number; name: string; slug: string; description: string | null; sort_order: number };

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

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
      <div className="grid gap-1.5">
        <Label htmlFor={`${uid}-name`}>Name</Label>
        <Input
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
          
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${uid}-slug`}>Slug</Label>
        <Input
          id={`${uid}-slug`}
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
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
          defaultValue={category?.description ?? ""}
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
          defaultValue={category?.sort_order ?? 0}
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
