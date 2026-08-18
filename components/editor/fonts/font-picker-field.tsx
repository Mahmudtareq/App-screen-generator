"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { quoteFontFamily, resolveFont } from "@/config/fonts";
import { ensureFontLoaded } from "@/lib/canvas/fonts";
import { rememberFont } from "@/lib/editor/recent-fonts";
import { cn } from "@/lib/utils";

import { FontPickerDialog } from "./font-picker-dialog";

/**
 * A labelled control that opens the font browser and shows the current family set
 * in itself.
 *
 * Shared by the Globals popover and a single text layer's inspector, so "change
 * the font everywhere" and "change the font here" are the same gesture against the
 * same catalogue — only the scope of what they write differs.
 */
export function FontPickerField({
  label,
  value,
  onChange,
  dialogTitle,
  className,
}: {
  label: string;
  /** null when the layers this covers disagree. */
  value: string | null;
  onChange: (fontId: string) => void;
  dialogTitle?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const font = value ? resolveFont(value) : null;

  const select = (fontId: string) => {
    rememberFont(fontId);
    // Requested before the write so the face is already in flight when the Konva
    // nodes re-measure; `loadingdone` bumps `fontsVersion` when it lands.
    void ensureFontLoaded(fontId);
    onChange(fontId);
    setOpen(false);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-normal text-muted-foreground">{label}</Label>

      <Button
        variant="outline"
        className="h-8 w-full justify-between px-2.5 font-normal"
        onClick={() => setOpen(true)}
      >
        <span
          className="truncate"
          style={font ? { fontFamily: quoteFontFamily(font.family) } : undefined}
        >
          {font ? font.label : "Mixed"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Button>

      <FontPickerDialog
        open={open}
        onOpenChange={setOpen}
        value={value}
        onSelect={select}
        title={dialogTitle ?? label}
      />
    </div>
  );
}
