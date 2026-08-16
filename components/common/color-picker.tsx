"use client";

import { useState } from "react";
import { HexColorPicker } from "react-colorful";

import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * shadcn has no colour picker, so this wraps react-colorful in a Popover.
 *
 * The hex field is kept as local text while the user types — writing every
 * keystroke to the document would push half-finished values like `#1e2` into
 * state and, worse, into undo history.
 */
export function ColorPicker({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  // Adjusting state during render, rather than in an effect: React re-runs this
  // component immediately without committing the stale draft to the DOM, so the
  // swatch never flashes the previous colour.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  const commitDraft = (next: string) => {
    const candidate = next.startsWith("#") ? next : `#${next}`;
    setDraft(candidate);
    if (HEX.test(candidate)) onChange(candidate.toLowerCase());
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover>
        <PopoverTrigger
          className="size-8 shrink-0 rounded-md border shadow-sm"
          style={{ backgroundColor: value }}
          aria-label="Choose colour"
        />
        <PopoverContent className="w-auto p-3">
          <HexColorPicker color={value} onChange={onChange} />
        </PopoverContent>
      </Popover>

      <Input
        value={draft}
        onChange={(e) => commitDraft(e.target.value)}
        onBlur={() => setDraft(value)}
        spellCheck={false}
        className="h-8 font-mono text-xs"
      />
    </div>
  );
}
