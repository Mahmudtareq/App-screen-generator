"use client";

import { CopyCheck } from "lucide-react";
import { toast } from "sonner";

import { ColorPicker } from "@/components/common/color-picker";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { selectScreen } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { backgroundAssetKey } from "@/lib/editor/types";
import type { BackgroundType } from "@/schemas/editor";

import { ImageDropzone } from "../upload/image-dropzone";
import { Field } from "./panel-section";

const PRESETS = [
  "#f4f1ff",
  "#e4dcfb",
  "#6d28d9",
  "#0f172a",
  "#ffffff",
  "#fef3c7",
  "#dbeafe",
  "#dcfce7",
  "#ffe4e6",
];

/** One screen's background. */
export function BackgroundPanel({ screenId }: { screenId: string }) {
  const background = useEditorStore(
    (s) => selectScreen(screenId)(s)?.background,
  );
  const screenCount = useEditorStore((s) => s.doc.screens.length);
  const setScreenBackground = useEditorStore((s) => s.setScreenBackground);
  const applyBackgroundToAll = useEditorStore((s) => s.applyBackgroundToAll);
  const clearAsset = useEditorStore((s) => s.clearAsset);

  if (!background) return null;

  const set = (next: Parameters<typeof setScreenBackground>[1]) =>
    setScreenBackground(screenId, next);

  const changeType = (type: BackgroundType) => {
    if (type === background.type) return;

    switch (type) {
      case "transparent":
        set({ type: "transparent" });
        break;
      case "color":
        set({ type: "color", color: "#f4f1ff" });
        break;
      case "gradient":
        set({
          type: "gradient",
          angle: 150,
          stops: [
            { offset: 0, color: "#6d28d9" },
            { offset: 1, color: "#4c1d95" },
          ],
        });
        break;
      case "image":
        // The url stays null until a file is dropped; the canvas simply renders
        // nothing until then rather than blocking the type switch.
        set({
          type: "image",
          assetId: null,
          url: null,
          fit: "cover",
          blur: 0,
          opacity: 1,
        });
        break;
    }
  };

  return (
    <div className="space-y-3">
      <ToggleGroup
        type="single"
        value={background.type}
        onValueChange={(v) => v && changeType(v as BackgroundType)}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <ToggleGroupItem value="color" className="flex-1 text-xs">
          Solid
        </ToggleGroupItem>
        <ToggleGroupItem value="gradient" className="flex-1 text-xs">
          Gradient
        </ToggleGroupItem>
        <ToggleGroupItem value="image" className="flex-1 text-xs">
          Image
        </ToggleGroupItem>
        <ToggleGroupItem value="transparent" className="flex-1 text-xs">
          None
        </ToggleGroupItem>
      </ToggleGroup>

      {background.type === "color" && (
        <>
          <ColorPicker
            value={background.color}
            onChange={(color) => set({ type: "color", color })}
          />
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                className="size-6 rounded-md border shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                onClick={() => set({ type: "color", color })}
              />
            ))}
          </div>
        </>
      )}

      {background.type === "gradient" && (
        <>
          <Field label="From">
            <ColorPicker
              value={background.stops[0].color}
              onChange={(color) =>
                set({
                  ...background,
                  stops: [
                    { ...background.stops[0], color },
                    ...background.stops.slice(1),
                  ],
                })
              }
            />
          </Field>
          <Field label="To">
            <ColorPicker
              value={background.stops[background.stops.length - 1].color}
              onChange={(color) =>
                set({
                  ...background,
                  stops: [
                    ...background.stops.slice(0, -1),
                    { ...background.stops[background.stops.length - 1], color },
                  ],
                })
              }
            />
          </Field>
          <Field label="Angle" hint={`${Math.round(background.angle)}°`}>
            <Slider
              min={0}
              max={360}
              step={1}
              value={[background.angle]}
              onValueChange={([angle]) => set({ ...background, angle })}
            />
          </Field>
        </>
      )}

      {background.type === "image" && (
        <>
          <ImageDropzone
            assetKey={backgroundAssetKey(screenId)}
            label="Background image"
            compact
          />

          <Field label="Fit">
            <ToggleGroup
              type="single"
              value={background.fit}
              onValueChange={(v) =>
                v && set({ ...background, fit: v as "cover" | "contain" })
              }
              variant="outline"
              size="sm"
              className="w-full"
            >
              <ToggleGroupItem value="cover" className="flex-1 text-xs">
                Cover
              </ToggleGroupItem>
              <ToggleGroupItem value="contain" className="flex-1 text-xs">
                Contain
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

          <Field
            label="Opacity"
            hint={`${Math.round(background.opacity * 100)}%`}
          >
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[background.opacity]}
              onValueChange={([opacity]) => set({ ...background, opacity })}
            />
          </Field>

          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              clearAsset(backgroundAssetKey(screenId));
              set({ type: "color", color: "#f4f1ff" });
            }}
          >
            Remove image
          </button>
        </>
      )}

      {screenCount > 1 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            applyBackgroundToAll(screenId);
            toast.success("Background applied to the other screens");
          }}
        >
          <CopyCheck className="size-3.5" />
          Apply to all screens
        </Button>
      )}
    </div>
  );
}
