"use client";

import { type FormEvent, startTransition, useLayoutEffect, useRef, useState } from "react";

/**
 * Local state seeded from server data that follows the server whenever that data changes, e.g.
 * after a save re-rendered the page or when a page kept alive by Activity is shown again.
 * `key` identifies the server value; it defaults to its JSON form.
 */
export function useSyncedState<T>(source: T, key: string = JSON.stringify(source)) {
  const [state, setState] = useState(source);
  const [seenKey, setSeenKey] = useState(key);
  if (seenKey !== key) {
    setSeenKey(key);
    setState(source);
  }
  return [state, setState] as const;
}

/**
 * Submits a form to a `useActionState` dispatcher without React's automatic form reset, which
 * would snap edited fields back to the values the page was first rendered with (and wipe the
 * input after a validation error).
 */
export function submitWithoutReset(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
}

/**
 * For create forms whose successful submit redirects away: Activity keeps the page alive, so
 * without this the next visit would show the draft that was already posted. Set `.current` to
 * true right before submitting and back to false when the action returns (it only returns on
 * failure); `reset` then runs once the page is hidden.
 */
export function useResetAfterRedirect(reset: () => void) {
  const armed = useRef(false);
  const resetRef = useRef(reset);
  useLayoutEffect(() => {
    resetRef.current = reset;
  });
  useLayoutEffect(
    () => () => {
      if (!armed.current) return;
      armed.current = false;
      resetRef.current();
    },
    [],
  );
  return armed;
}
