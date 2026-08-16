"use client";

import { ColorPicker } from "@/components/common/color-picker";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEditorStore } from "@/lib/editor/store";
import type { BackgroundType } from "@/schemas/editor";

import { ImageDropzone } from "../upload/image-dropzone";
import { Field, PanelSection } from "./panel-section";

const PRESETS = [
  "#eef2f7",
  "#0f172a",
  "#ffffff",
  "#fef3c7",
  "#dbeafe",
  "#dcfce7",
  "#fae8ff",
  "#ffe4e6",
];

export function BackgroundPanel() {
  const background = useEditorStore((s) => s.doc.background);
  const setBackground = useEditorStore((s) => s.setBackground);
  const clearAsset = useEditorStore((s) => s.clearAsset);

  const changeType = (type: BackgroundType) => {
    if (type === background.type) return;

    switch (type) {
      case "transparent":
        setBackground({ type: "transparent" });
        break;
      case "color":
        setBackground({ type: "color", color: "#eef2f7" });
        break;
      case "gradient":
        setBackground({
          type: "gradient",
          angle: 135,
          stops: [
            { offset: 0, color: "#6366f1" },
            { offset: 1, color: "#ec4899" },
          ],
        });
        break;
      case "image":
        // The url stays empty until a file is dropped; the canvas simply renders
        // nothing until then rather than blocking the type switch.
        setBackground({
          type: "image",
          assetId: null,
          url: "",
          fit: "cover",
          blur: 0,
          opacity: 1,
        });
        break;
    }
  };

  return (
    <PanelSection title="Background">
      <ToggleGroup
        type="single"
        value={background.type}
        onValueChange={(v) => v && changeType(v as BackgroundType)}
        variant="outline"
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
            onChange={(color) => setBackground({ type: "color", color })}
          />
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                className="size-6 rounded-md border shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
                onClick={() => setBackground({ type: "color", color })}
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
                setBackground({
                  ...background,
                  stops: [{ ...background.stops[0], color }, ...background.stops.slice(1)],
                })
              }
            />
          </Field>
          <Field label="To">
            <ColorPicker
              value={background.stops[background.stops.length - 1].color}
              onChange={(color) =>
                setBackground({
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
              onValueChange={([angle]) => setBackground({ ...background, angle })}
            />
          </Field>
        </>
      )}

      {background.type === "image" && (
        <>
          <ImageDropzone slot="background" label="Background image" />

          <Field label="Fit">
            <ToggleGroup
              type="single"
              value={background.fit}
              onValueChange={(v) =>
                v && setBackground({ ...background, fit: v as "cover" | "contain" })
              }
              variant="outline"
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

          <Field label="Opacity" hint={`${Math.round(background.opacity * 100)}%`}>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[background.opacity]}
              onValueChange={([opacity]) => setBackground({ ...background, opacity })}
            />
          </Field>

          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              clearAsset("background");
              setBackground({ type: "color", color: "#eef2f7" });
            }}
          >
            Remove image
          </button>
        </>
      )}
    </PanelSection>
  );
}
