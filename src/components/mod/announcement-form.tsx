"use client";

import { useActionState, useId, useState } from "react";

import { ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX, ANNOUNCEMENT_TITLE_MIN } from "@/components/announcements/limits";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Input, Label, Textarea } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";

import { saveAnnouncement, type ActionState } from "./actions";

type Announcement = { id: number; title: string; body: string; is_pinned: boolean };

const editorModes = [
  { value: "write", label: "Write" },
  { value: "preview", label: "Preview" },
] as const;

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span className={cn("shrink-0 text-meta tabular-nums", value > max * 0.95 ? "text-warning" : "text-subtle")}>
      {value.toLocaleString("en")}/{max.toLocaleString("en")}
    </span>
  );
}

/** Creates an announcement, or edits `announcement` when given. */
export function AnnouncementForm({ announcement }: { announcement?: Announcement }) {
  const uid = useId();
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [pinned, setPinned] = useState(announcement?.is_pinned ?? false);
  const [preview, setPreview] = useState(false);

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveAnnouncement(prev, formData);
    if (result?.ok && !announcement) {
      setTitle("");
      setBody("");
      setPinned(false);
      setPreview(false);
    }
    return result;
  }, null);

  const msgId = `${uid}-msg`;

  return (
    <form action={formAction} noValidate className="grid gap-4" aria-describedby={state ? msgId : undefined}>
      {announcement && <input type="hidden" name="announcementId" value={announcement.id} />}

      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={`${uid}-title`}>Title</Label>
          <Counter value={title.length} max={ANNOUNCEMENT_TITLE_MAX} />
        </div>
        <Input
          id={`${uid}-title`}
          name="title"
          required
          minLength={ANNOUNCEMENT_TITLE_MIN}
          maxLength={ANNOUNCEMENT_TITLE_MAX}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${uid}-body`}>Text</Label>
          <SegmentedControl
            label="Editor mode"
            value={preview ? "preview" : "write"}
            options={editorModes}
            onChange={(mode) => setPreview(mode === "preview")}
          />
        </div>
        {/* Kept mounted while previewing so the value is still submitted. */}
        <Textarea
          id={`${uid}-body`}
          name="body"
          required
          maxLength={ANNOUNCEMENT_BODY_MAX}
          rows={8}
          hidden={preview}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-describedby={`${uid}-body-hint`}
          className="min-h-40"
        />
        {preview && (
          <div className="min-h-40 rounded-md border border-border bg-background p-3">
            {body.trim() ? <Markdown>{body}</Markdown> : <p className="text-meta text-muted">Nothing to preview yet.</p>}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <p id={`${uid}-body-hint`} className="text-meta text-muted">
            Markdown: <code className="font-mono">**bold**</code>, <code className="font-mono">[link](https://…)</code>,
            lists with <code className="font-mono">-</code>.
          </p>
          <Counter value={body.length} max={ANNOUNCEMENT_BODY_MAX} />
        </div>
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 sm:min-h-0">
        <input
          type="checkbox"
          name="isPinned"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-(--accent)"
        />
        <span className="grid gap-0.5">
          <span className="text-meta font-medium text-foreground">Pin this announcement</span>
          <span className="text-meta text-muted">Pinned announcements stay on top; the newest one shows on the home page.</span>
        </span>
      </label>

      <div>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? (announcement ? "Saving..." : "Posting...") : announcement ? "Save changes" : "Post announcement"}
        </Button>
      </div>
      {!announcement && (
        <p className="-mt-2 text-meta text-subtle">Posting notifies every member of the forum.</p>
      )}
      {state && (
        <p id={msgId} role={state.ok ? "status" : "alert"} className={state.ok ? "text-meta text-muted" : "text-meta text-danger"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
