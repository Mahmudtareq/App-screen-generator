"use client";

import { useMemo, useState } from "react";

import { ColorPicker } from "@/components/common/color-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  collectDocColors,
  describeSources,
  formatHex,
  normalizeHex,
} from "@/lib/editor/colors";
import { useEditorStore } from "@/lib/editor/store";
import { cn } from "@/lib/utils";

/**
 * Find-and-replace for colour.
 *
 * The list is every colour the unpinned screens actually paint, gathered by the same
 * traversal that does the rewriting — so a swatch shown here is always a swatch that
 * can move, and the "Background · Title" line under each hex is the same pass
 * reporting what it walked rather than a second, driftable description of it.
 *
 * Replacing is a button rather than live-on-pick because dragging through a colour
 * wheel would otherwise repaint the whole set on every intermediate hue, and the
 * palette under the cursor would shift as it went.
 */
export function ColorReplacerPanel() {
  // The document is referentially stable between edits, so this re-renders when a
  // colour actually changes rather than on every store write.
  const doc = useEditorStore((s) => s.doc);
  const replaceColor = useEditorStore((s) => s.replaceColor);

  const colors = useMemo(() => collectDocColors(doc), [doc]);

  const [selected, setSelected] = useState<string | null>(null);
  const [next, setNext] = useState("#000000");

  // Resynced during render rather than in an effect: a replace removes the colour
  // that was selected, and the row must not linger highlighted for a frame.
  if (selected && !colors.some((color) => color.hex === selected)) {
    setSelected(null);
  }

  const select = (hex: string) => {
    setSelected(hex);
    setNext(hex);
  };

  const target = colors.find((color) => color.hex === selected);
  const canReplace = Boolean(selected) && normalizeHex(next) !== selected;

  const apply = () => {
    if (!selected || !canReplace) return;
    replaceColor(selected, next);
    // Follow the colour: the swap has landed, and the obvious next move is to keep
    // nudging the new value rather than to hunt for it in the list again.
    setSelected(normalizeHex(next));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Choose a colour to replace, pick a new one, and apply it everywhere it
        appears.
      </p>

      <div className="grid grid-cols-[1.15fr_1fr] gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-normal text-muted-foreground">
            Current colours
          </Label>

          <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
            {colors.map((color) => {
              const sources = describeSources(color.sources);

              return (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => select(color.hex)}
                  aria-pressed={color.hex === selected}
                  title={`${formatHex(color.hex)} — ${sources}`}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors",
                    color.hex === selected
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted",
                  )}
                >
                  <span
                    className="size-5 shrink-0 rounded-md border shadow-xs"
                    style={{ backgroundColor: color.hex }}
                  />

                  {/* The hex identifies the swatch; what paints it is what decides
                      whether you want to touch it, so both get a line. */}
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-xs leading-tight">
                      {formatHex(color.hex)}
                    </span>
                    <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                      {sources}
                    </span>
                  </span>

                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    ×{color.count}
                  </span>
                </button>
              );
            })}

            {colors.length === 0 && (
              <p className="rounded-lg border border-dashed px-2 py-3 text-center text-xs text-muted-foreground">
                No colours to replace.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-normal text-muted-foreground">
            Replace with
          </Label>

          {selected ? (
            <ColorPicker value={next} onChange={setNext} />
          ) : (
            <p className="rounded-lg border border-dashed px-2 py-3 text-xs text-muted-foreground">
              Pick a colour on the left to replace it.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-3">
        {/* Names the exact damage rather than "every element": the whole reason the
            sources are collected is so this sentence can be specific. */}
        <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
          {target
            ? `Repaints ${target.count} ${target.count === 1 ? "use" : "uses"} — ${describeSources(target.sources).toLowerCase()}.`
            : "Nothing selected yet."}
        </p>

        <Button size="sm" disabled={!canReplace} onClick={apply}>
          Replace
        </Button>
      </div>
    </div>
  );
}
