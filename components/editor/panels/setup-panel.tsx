"use client";

import { RotateCw } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ARTBOARD_MAX,
  ARTBOARD_MIN,
  getArtboardPreset,
} from "@/config/artboards";
import { DEVICES, type DeviceId } from "@/lib/devices/catalog";
import { selectOrientedSpec } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { clamp } from "@/lib/utils";

import { Field } from "./panel-section";

/**
 * Document-level setup: which phone, which way up, and how big the canvas is.
 *
 * All three apply to every screen at once, which is why they are here rather than
 * in a layer row. Changing any of them refits the device on every screen — a new
 * model has different body dimensions, so the scale that centred the old one would
 * leave the new one either overflowing or adrift.
 */
export function SetupPanel() {
  const deviceId = useEditorStore((s) => s.doc.deviceId);
  const orientation = useEditorStore((s) => s.doc.orientation);
  const artboard = useEditorStore((s) => s.doc.artboard);
  const spec = useEditorStore(selectOrientedSpec);

  const setDeviceId = useEditorStore((s) => s.setDeviceId);
  const setOrientation = useEditorStore((s) => s.setOrientation);
  const setArtboard = useEditorStore((s) => s.setArtboard);

  // Dimensions are held as text while typing so an intermediate "12" on the way
  // to "1290" is not clamped up to the minimum under the user's cursor.
  const [width, setWidth] = useState(String(artboard.width));
  const [height, setHeight] = useState(String(artboard.height));
  const [lastSize, setLastSize] = useState(
    `${artboard.width}x${artboard.height}`,
  );

  // Resynced during render rather than in an effect, so choosing a preset updates
  // the inputs in the same commit that redraws the canvas.
  const currentSize = `${artboard.width}x${artboard.height}`;
  if (currentSize !== lastSize) {
    setLastSize(currentSize);
    setWidth(String(artboard.width));
    setHeight(String(artboard.height));
  }

  const commitSize = () => {
    const w = clamp(
      Number(width) || artboard.width,
      ARTBOARD_MIN,
      ARTBOARD_MAX,
    );
    const h = clamp(
      Number(height) || artboard.height,
      ARTBOARD_MIN,
      ARTBOARD_MAX,
    );
    if (w === artboard.width && h === artboard.height) return;
    setArtboard({ width: Math.round(w), height: Math.round(h), preset: null });
  };

  return (
    <div className="space-y-3">
      <Field label="Device">
        <Select
          value={deviceId}
          onValueChange={(v) => setDeviceId(v as DeviceId)}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEVICES.map((device) => (
              <SelectItem key={device.id} value={device.id}>
                {device.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Orientation">
        <ToggleGroup
          type="single"
          value={orientation}
          onValueChange={(v) =>
            v && setOrientation(v as "portrait" | "landscape")
          }
          variant="outline"
          size="sm"
          className="w-full"
          disabled={!spec.supportsLandscape}
        >
          <ToggleGroupItem value="portrait" className="flex-1 text-xs">
            Portrait
          </ToggleGroupItem>
          <ToggleGroupItem value="landscape" className="flex-1 text-xs">
            <RotateCw className="size-3" />
            Landscape
          </ToggleGroupItem>
        </ToggleGroup>
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
        {artboard.preset
          ? (getArtboardPreset(artboard.preset)?.label ?? "Custom size")
          : "Custom size"}
        . Changing it rescales every unpinned screen, so a set keeps its
        composition when retargeted.
      </p>
    </div>
  );
}
