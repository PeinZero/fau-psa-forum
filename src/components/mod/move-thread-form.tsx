"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useId } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { CategoryPicker, type CategoryOption } from "@/components/write/category-picker";
import { ChoiceGroup } from "@/components/write/choice-group";
import { cityOptionLabels, NO_CITY_LABEL } from "@/lib/labels";
import { submitWithoutReset, useSyncedState } from "@/lib/form-sync";

import { type ActionState, moveThread } from "./actions";

const cityChoices = [
  { value: "", label: NO_CITY_LABEL },
  ...(Object.keys(cityOptionLabels) as (keyof typeof cityOptionLabels)[]).map((key) => ({
    value: key,
    label: cityOptionLabels[key],
  })),
];

/** Moderators file someone else's thread under another category or city; the author's text stays untouched. */
export function MoveThreadForm({
  threadId,
  title,
  categories,
  categoryId,
  city,
  cancelHref,
}: {
  threadId: number;
  title: string;
  categories: readonly CategoryOption[];
  categoryId: number | null;
  city: "erlangen" | "nuremberg" | "both" | null;
  cancelHref: string;
}) {
  const uid = useId();
  const [category, setCategory] = useSyncedState(categoryId?.toString() ?? "");
  const [cityValue, setCityValue] = useSyncedState<string>(city ?? "");
  // A successful move redirects, so only failures come back here.
  const [state, formAction, pending] = useActionState(moveThread, null as ActionState);
  const msgId = `${uid}-msg`;

  return (
    <form onSubmit={submitWithoutReset(formAction)} className="flex flex-col gap-6" aria-busy={pending} aria-describedby={state ? msgId : undefined}>
      <input type="hidden" name="threadId" value={threadId} />
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6 disabled:opacity-70">
        <div className="flex flex-col gap-1">
          <span className="text-meta font-medium text-foreground">Thread</span>
          <p className="text-body text-foreground">{title}</p>
          <p className="text-meta text-muted">Only the author can change the title, text and images.</p>
        </div>
        <CategoryPicker name="categoryId" categories={categories} value={category} onChange={setCategory} />
        <ChoiceGroup name="city" legend="City" value={cityValue} options={cityChoices} onChange={setCityValue} />
      </fieldset>
      <p role="status" className="sr-only">
        {pending ? "Saving…" : ""}
      </p>
      {state && !state.ok && (
        <p id={msgId} role="alert" className="text-meta text-danger">
          {state.message}
        </p>
      )}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-5">
        <Link href={cancelHref} className={buttonClasses({ variant: "ghost" })}>
          Cancel
        </Link>
        <Button type="submit" disabled={pending} className="flex-1 sm:flex-none">
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
