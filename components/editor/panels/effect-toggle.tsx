"use client";

import { useId } from "react";

import { Switch } from "@/components/ui/switch";

/**
 * A switch with its whole card as the hit target.
 *
 * The association is explicit rather than left to the label's first labelable
 * descendant, which is what a bare wrapper would rely on: that rule silently picks a
 * different control the moment anything else clickable joins the card, and the
 * failure is a padding area that quietly stops working.
 */
export function EffectToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="flex flex-1 cursor-pointer items-center justify-between gap-2 rounded-md border p-3"
    >
      <span className="text-xs font-medium">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
