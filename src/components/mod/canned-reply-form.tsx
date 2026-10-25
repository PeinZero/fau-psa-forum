"use client";

import { useActionState, useId } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { submitWithoutReset, useSyncedState } from "@/lib/form-sync";
import { CANNED_BODY_MAX, CANNED_LABEL_MAX } from "@/lib/restrictions";

import { type ActionState, saveCannedReply } from "./actions";

type CannedReply = { id: number; label: string; body: string; sort_order: number };

function fieldsOf(reply?: CannedReply) {
  return { label: reply?.label ?? "", body: reply?.body ?? "", sortOrder: String(reply?.sort_order ?? 0) };
}

/** Creates a canned reply, or edits `reply` when given; the fields follow the saved values. */
export function CannedReplyForm({ reply }: { reply?: CannedReply }) {
  const uid = useId();
  const [fields, setFields] = useSyncedState(fieldsOf(reply));
  const set = (patch: Partial<typeof fields>) => setFields((current) => ({ ...current, ...patch }));

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveCannedReply(prev, formData);
    if (result?.ok && !reply) setFields(fieldsOf());
    return result;
  }, null);
  const msgId = `${uid}-msg`;

  return (
    <form onSubmit={submitWithoutReset(formAction)} className="grid gap-3" aria-describedby={state ? msgId : undefined}>
      {reply && <input type="hidden" name="replyId" value={reply.id} />}
      <div className="grid gap-1.5">
        <Label htmlFor={`${uid}-label`}>Label</Label>
        <Input
          id={`${uid}-label`}
          name="label"
          required
          maxLength={CANNED_LABEL_MAX}
          value={fields.label}
          onChange={(e) => set({ label: e.target.value })}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${uid}-body`}>Text</Label>
        <Textarea
          id={`${uid}-body`}
          name="body"
          required
          maxLength={CANNED_BODY_MAX}
          rows={4}
          value={fields.body}
          onChange={(e) => set({ body: e.target.value })}
          className="min-h-24"
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
          {pending ? "Saving…" : reply ? "Save changes" : "Add reply"}
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
