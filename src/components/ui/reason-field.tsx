"use client";

import { useRef } from "react";

import { Label, Select, Textarea } from "./field";

export type ReasonPreset = { label: string; body: string };

export type ReasonSpec = {
  label: string;
  max: number;
  /** Ready-made texts that fill the field; the moderator can still edit them. */
  presets?: readonly ReasonPreset[];
};

/** Required free-text reason, submitted as `reason`, optionally prefilled from a preset. */
export function ReasonField({ id, spec }: { id: string; spec: ReasonSpec }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const presets = spec.presets ?? [];

  return (
    <div className="flex flex-col gap-1.5">
      {presets.length > 0 && (
        <>
          <Label htmlFor={`${id}-preset`}>Canned reply</Label>
          <Select
            id={`${id}-preset`}
            defaultValue=""
            onChange={(event) => {
              const preset = presets[Number(event.target.value)];
              const textarea = textareaRef.current;
              if (!preset || !textarea) return;
              textarea.value = preset.body.slice(0, spec.max);
              textarea.focus();
            }}
            className="mb-1.5"
          >
            <option value="" disabled>
              Choose a reply to start from…
            </option>
            {presets.map((preset, index) => (
              <option key={index} value={index}>
                {preset.label}
              </option>
            ))}
          </Select>
        </>
      )}
      <Label htmlFor={`${id}-reason`}>{spec.label}</Label>
      <Textarea
        ref={textareaRef}
        id={`${id}-reason`}
        name="reason"
        required
        maxLength={spec.max}
        rows={3}
        className="min-h-20"
      />
    </div>
  );
}
