"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A numeric field that tolerates being half-typed.
 *
 * The same problem the hex field in [color-picker.tsx](color-picker.tsx) has, for the
 * same reason: the value is kept as local text while the user edits it, because
 * writing every keystroke to the document turns "18" into a committed 1 on the way
 * past — and with a clamp in the way, that 1 becomes the minimum and rewrites the
 * field out from under the caret. Only a value that parses *and* is already in range
 * reaches the document; anything else waits for blur, which clamps once.
 */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  decimals = 0,
  suffix,
  label,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Decimal places to display. Line height needs two; pixels need none. */
  decimals?: number;
  suffix?: string;
  /** Accessible name, since the visible label lives in the surrounding `Field`. */
  label: string;
  className?: string;
}) {
  const format = (next: number) => next.toFixed(decimals);

  const [draft, setDraft] = useState(() => format(value));
  const [lastValue, setLastValue] = useState(value);

  // Adjusting state during render rather than in an effect, so a value arriving from
  // elsewhere — an undo, a template, a transform — never paints the stale draft first.
  //
  // The `Number(draft)` guard is what keeps this from fighting the person typing.
  // Committing "1" into a two-decimal field sends 1 back down, and reformatting that
  // to "1.00" would replace the text under the caret mid-word — the next keystrokes
  // land after it and "1.6" arrives as something like "1.00.6". If the draft already
  // parses to the value coming in, the two agree and the text is left alone.
  if (value !== lastValue) {
    setLastValue(value);
    if (Number(draft) !== value) setDraft(format(value));
  }

  /** Kills float noise like `0.8 + 0.05 = 0.8500000000000001`. */
  const quantize = (next: number) => Number(next.toFixed(decimals));
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  const commit = (raw: string) => {
    setDraft(raw);
    const parsed = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(parsed)) return;
    if (parsed < min || parsed > max) return;
    onChange(parsed);
  };

  const settle = () => {
    const parsed = Number(draft);
    const next = draft.trim() && Number.isFinite(parsed) ? clamp(parsed) : value;
    setDraft(format(next));
    if (next !== value) onChange(next);
  };

  const nudge = (direction: number, coarse: boolean) => {
    const parsed = Number(draft);
    const from = draft.trim() && Number.isFinite(parsed) ? parsed : value;
    const next = clamp(quantize(from + direction * step * (coarse ? 10 : 1)));
    setDraft(format(next));
    if (next !== value) onChange(next);
  };

  return (
    <div className={cn("relative", className)}>
      {/*
        Deliberately `text` rather than `number`. A number input reports an empty
        string for anything half-typed — "-" on the way to -12, "1." on the way to
        1.6 — so the draft loses the very characters this component exists to hold
        on to. Stepping is the one thing worth keeping from it, and that is six
        lines of key handling.
      */}
      <Input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={draft}
        onChange={(e) => commit(e.target.value)}
        onBlur={settle}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
            return;
          }
          const direction = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
          if (!direction) return;
          e.preventDefault();
          nudge(direction, e.shiftKey);
        }}
        className={cn("text-xs tabular-nums", suffix ? "pr-7" : "pr-2.5")}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}
