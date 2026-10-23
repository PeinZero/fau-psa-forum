"use client";

import { useId, useRef, useState } from "react";

import { Card } from "@/components/ui/card";
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
    <div className="space-y-4">
      <p role="status" aria-live="polite" className="min-h-5 text-meta text-muted">
        {status.kind === "saving" && "Saving…"}
        {status.kind === "saved" && "Saved"}
      </p>
      {status.kind === "error" && (
        <p role="alert" className="text-sm text-danger">
          {status.message}
        </p>
      )}

      {groups.map((group) => (
        <Card key={group.title} className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">{group.title}</h2>
          <ul className="divide-y divide-border">
            {group.options.map((option) => {
              const labelId = `${uid}-${option.type}-label`;
              const descId = `${uid}-${option.type}-desc`;
              return (
                <li key={option.type} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p id={labelId} className="text-sm font-medium">
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
        </Card>
      ))}

      <Card className="space-y-3">
        <fieldset className="space-y-3">
          <legend className="text-base font-semibold tracking-tight">Email</legend>
          <p className="text-meta text-muted">Email delivery starts once email is set up. Your choice is saved for then.</p>
          <div className="space-y-1">
            {FREQUENCY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 has-focus-visible:ring-2 has-focus-visible:ring-ring"
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
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-meta text-muted">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>
    </div>
  );
}
