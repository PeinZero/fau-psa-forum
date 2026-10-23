"use client";

import { Reply } from "lucide-react";
import { createContext, type ReactNode, use, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { CommentForm } from "@/components/write/comment-form";

type StartReply = (prefill: string, trigger: HTMLElement) => void;

const ReplyContext = createContext<StartReply | null>(null);

/** Indented column under a top-level comment: one border line for its replies and the reply form. */
export function ReplyColumn({ children }: { children: ReactNode }) {
  return <div className="mb-5 ml-3.5 flex flex-col border-l border-border pl-3.5 sm:pl-5">{children}</div>;
}

/**
 * One comment group: the top-level comment, its replies and an inline reply form. Replies always
 * attach to the top-level comment, whichever comment in the group the Reply button belongs to.
 */
export function ReplyScope({
  threadId,
  parentId,
  replies,
  children,
}: {
  threadId: number;
  parentId: number;
  replies: ReactNode;
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<{ prefill: string; key: number } | null>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const start: StartReply = (prefill, element) => {
    trigger.current = element;
    setDraft((current) => ({ prefill, key: (current?.key ?? 0) + 1 }));
  };

  function close() {
    setDraft(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  return (
    <ReplyContext value={start}>
      {children}
      {(replies || draft) && (
        <ReplyColumn>
          {replies}
          {draft && (
            <div className="animate-fade-up py-3">
              <CommentForm
                key={draft.key}
                threadId={threadId}
                parentId={parentId}
                initialValue={draft.prefill}
                onDone={close}
                autoFocus
              />
            </div>
          )}
        </ReplyColumn>
      )}
    </ReplyContext>
  );
}

/** Opens the group's reply form, pre-filled with the @handle of the person replied to. */
export function ReplyButton({ mention }: { mention: string | null }) {
  const start = use(ReplyContext);
  if (!start) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(event) => start(mention ? `@${mention} ` : "", event.currentTarget)}
    >
      <Reply aria-hidden strokeWidth={1.75} />
      Reply
    </Button>
  );
}
