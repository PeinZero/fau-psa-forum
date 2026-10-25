"use client";

import { useId, useRef, useState } from "react";

import { savePreferences } from "@/app/account/notifications/actions";

import { Switch } from "./switch";
import {
  FREQUENCY_OPTIONS,
  NOTIFICATION_GROUPS,
  type EmailFrequency,
} from "./types";

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string };

export function NotificationSettings({
  initialMuted,
  initialFrequency,
  isModerator,
}: {
  initialMuted: string[];
  initialFrequency: EmailFrequency;
  isModerator: boolean;
}) {
  const uid = useId();
  const [muted, setMuted] = useState<string[]>(initialMuted);
  const [frequency, setFrequency] = useState<EmailFrequency>(initialFrequency);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const latest = useRef(0);
  const lastSaved = useRef({ muted: initialMuted, frequency: initialFrequency });

  async function persist(nextMuted: string[], nextFrequency: EmailFrequency) {
    const ticket = ++latest.current;
    setStatus({ kind: "saving" });
    const result = await savePreferences({ mutedTypes: nextMuted, emailFrequency: nextFrequency });
    if (ticket !== latest.current) return;
    if (result.ok) {
      lastSaved.current = { muted: nextMuted, frequency: nextFrequency };
      setStatus({ kind: "saved" });
    } else {
      setMuted(lastSaved.current.muted);
      setFrequency(lastSaved.current.frequency);
      setStatus({ kind: "error", message: result.message });
    }
  }

  function toggle(type: string, enabled: boolean) {
    const next = enabled ? muted.filter((t) => t !== type) : [...muted, type];
    setMuted(next);
    void persist(next, frequency);
  }

  function chooseFrequency(next: EmailFrequency) {
    setFrequency(next);
    void persist(muted, next);
  }

  const groups = NOTIFICATION_GROUPS.filter((g) => !g.moderatorOnly || isModerator);

  return (
    <div className="flex flex-col gap-10">
      <div aria-live="polite" role="status" className="-mt-4 min-h-5 text-meta text-muted">
        {status.kind === "saving" && "Saving…"}
        {status.kind === "saved" && "Saved"}
      </div>
      {status.kind === "error" && (
        <p role="alert" className="-mt-6 text-body text-danger">
          {status.message}
        </p>
      )}

      {groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h2 className="text-heading font-semibold text-foreground">{group.title}</h2>
          <ul className="mt-2 divide-y divide-border">
            {group.options.map((option) => {
              const labelId = `${uid}-${option.type}-label`;
              const descId = `${uid}-${option.type}-desc`;
              return (
                <li key={option.type} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p id={labelId} className="text-body font-medium text-foreground">
                      {option.label}
                    </p>
                    <p id={descId} className="text-meta text-muted">
                      {option.description}
                    </p>
                  </div>
                  <Switch
                    checked={!muted.includes(option.type)}
                    onChange={(next) => toggle(option.type, next)}
                    labelledBy={labelId}
                    describedBy={descId}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <fieldset>
        <legend className="text-heading font-semibold text-foreground">Email</legend>
        <p className="mt-1 text-meta text-muted">Email delivery starts once email is set up. Your choice is saved for then.</p>
        <div className="mt-3 flex flex-col gap-1">
          {FREQUENCY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="-mx-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150 ease-out hover:bg-surface-hover has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name={`${uid}-frequency`}
                value={option.value}
                checked={frequency === option.value}
                onChange={() => chooseFrequency(option.value)}
                className="size-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <span className="block text-body font-medium text-foreground">{option.label}</span>
                <span className="block text-meta text-muted">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
