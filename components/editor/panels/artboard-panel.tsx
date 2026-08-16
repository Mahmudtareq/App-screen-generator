"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ARTBOARD_MAX,
  ARTBOARD_MIN,
  ARTBOARD_PRESETS,
  getArtboardPreset,
} from "@/config/artboards";
import { clamp } from "@/lib/utils";
import { useEditorStore } from "@/lib/editor/store";

import { Field, PanelSection } from "./panel-section";

const CUSTOM = "custom";

const GROUPS = [...new Set(ARTBOARD_PRESETS.map((p) => p.group))];

export function ArtboardPanel() {
  const artboard = useEditorStore((s) => s.doc.artboard);
  const setArtboard = useEditorStore((s) => s.setArtboard);

  // Dimensions are held as text while typing so an intermediate "12" on the way
  // to "1290" is not clamped up to the minimum under the user's cursor.
  const [width, setWidth] = useState(String(artboard.width));
  const [height, setHeight] = useState(String(artboard.height));
  const [lastSize, setLastSize] = useState(`${artboard.width}x${artboard.height}`);

  // Resynced during render rather than in an effect, so choosing a preset updates
  // the inputs in the same commit that redraws the canvas.
  const currentSize = `${artboard.width}x${artboard.height}`;
  if (currentSize !== lastSize) {
    setLastSize(currentSize);
    setWidth(String(artboard.width));
    setHeight(String(artboard.height));
  }

  const commitSize = () => {
    const w = clamp(Number(width) || artboard.width, ARTBOARD_MIN, ARTBOARD_MAX);
    const h = clamp(Number(height) || artboard.height, ARTBOARD_MIN, ARTBOARD_MAX);
    if (w === artboard.width && h === artboard.height) return;
    setArtboard({ width: Math.round(w), height: Math.round(h), preset: null });
  };

  const applyPreset = (id: string) => {
    if (id === CUSTOM) {
      setArtboard({ ...artboard, preset: null });
      return;
    }
    const preset = getArtboardPreset(id);
    if (preset) {
      setArtboard({ width: preset.width, height: preset.height, preset: preset.id });
    }
  };

  return (
    <PanelSection title="Artboard">
      <Field label="Preset">
        <Select value={artboard.preset ?? CUSTOM} onValueChange={applyPreset}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUPS.map((group) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {ARTBOARD_PRESETS.filter((p) => p.group === group).map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            <SelectGroup>
              <SelectLabel>Other</SelectLabel>
              <SelectItem value={CUSTOM}>Custom</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Width">
          <Input
            inputMode="numeric"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            onBlur={commitSize}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-8"
          />
        </Field>
        <Field label="Height">
          <Input
            inputMode="numeric"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            onBlur={commitSize}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="h-8"
          />
        </Field>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Changing the artboard rescales the layout proportionally, so a design keeps
        its composition when retargeted.
      </p>
    </PanelSection>
  );
}
