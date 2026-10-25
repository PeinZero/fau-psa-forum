"use client";

import { CircleCheck, X } from "lucide-react";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  use,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from "react";

import { Button } from "./button";
import { cn } from "./cn";

type DialogContext = { titleId: string; descriptionId: string; onClose: () => void };

const Context = createContext<DialogContext | null>(null);

function useDialog(): DialogContext {
  const value = use(Context);
  if (!value) throw new Error("Dialog parts must sit inside <Dialog>.");
  return value;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const widths = { sm: "w-[min(26rem,calc(100vw-2rem))]", md: "w-[min(28rem,calc(100vw-2rem))]" };

/**
 * Modal shell on the native `<dialog>`: Escape and a press on the backdrop call `onClose`, Tab stays
 * inside, and focus goes back to whatever opened it. Children mount only while open, so a form
 * inside starts fresh every time.
 */
export function Dialog({
  open,
  onClose,
  size = "sm",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  size?: keyof typeof widths;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const backdropPress = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  // Layout effect so the opener is remembered before an autofocused field inside takes focus.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      // Start on the first field rather than the close button the browser would pick.
      const fields = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      (fields.find((field) => !field.hasAttribute("data-dialog-close")) ?? fields[0])?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (open) return;
    const target = opener.current;
    opener.current = null;
    if (target?.isConnected) target.focus();
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={onKeyDown}
      // The parent's state decides when the dialog closes, so the browser's own Escape close is held back.
      onCancel={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Only a press that starts on the backdrop closes, not a text selection dragged out of the panel.
        if (backdropPress.current && event.target === event.currentTarget) onClose();
        backdropPress.current = false;
      }}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-raised p-0 text-foreground",
        "shadow-[0_24px_48px_-12px_var(--shadow-color)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-fade-up",
        widths[size],
        className,
      )}
    >
      <Context value={{ titleId, descriptionId, onClose }}>
        {open && <div className="flex flex-col gap-5 p-5">{children}</div>}
      </Context>
    </dialog>
  );
}

/** Title, optional one-line description and a close button. */
export function DialogHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  const { titleId, descriptionId, onClose } = useDialog();
  return (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id={titleId} className="text-heading font-semibold tracking-tight text-pretty text-foreground">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="text-meta text-pretty text-muted">
            {description}
          </p>
        )}
      </div>
      <Button data-dialog-close variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="-mr-2 -mt-1.5">
        <X aria-hidden strokeWidth={1.75} />
      </Button>
    </div>
  );
}

/** The dialog's buttons, right-aligned with the main action last. */
export function DialogActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>{children}</div>;
}

/** Replaces the form once it went through: a check, a short thank-you and a focused Done button. */
export function DialogSuccess({ title, children }: { title: ReactNode; children?: ReactNode }) {
  const { titleId, descriptionId, onClose } = useDialog();
  const doneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    doneRef.current?.focus();
  }, []);

  return (
    <div role="status" className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <CircleCheck strokeWidth={1.75} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1 pt-1">
          <h2 id={titleId} className="text-heading font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {children && (
            <p id={descriptionId} className="text-meta text-muted">
              {children}
            </p>
          )}
        </div>
      </div>
      <DialogActions>
        <Button ref={doneRef} variant="secondary" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </div>
  );
}
