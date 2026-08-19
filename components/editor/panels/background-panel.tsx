"use client";

import { useCallback, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeftRight,
  Ban,
  CopyCheck,
  Droplet,
  Image as ImageIcon,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";

import { ColorPicker } from "@/components/common/color-picker";
import { NumberInput } from "@/components/common/number-input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ImagePickerDialog } from "@/components/editor/images/image-picker-dialog";
import { backgroundPreviewCss } from "@/components/editor/template-preview";
import { useApplyImagePick } from "@/hooks/use-image-pick";
import { selectImageSource, selectScreen } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { backgroundAssetKey } from "@/lib/editor/types";
import type { ImagePick } from "@/lib/editor/image-picks";
import type { Background, BackgroundType } from "@/schemas/editor";
import { cn } from "@/lib/utils";

import { Field } from "./panel-section";

const SOLID_PRESETS = [
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

/** Ready-made looks, applied whole. A mix of linear and radial on purpose. */
const BACKGROUND_PRESETS: Background[] = [
  { type: "gradient", angle: 150, stops: [{ offset: 0, color: "#6d28d9" }, { offset: 1, color: "#4c1d95" }] },
  { type: "gradient", angle: 135, stops: [{ offset: 0, color: "#f97316" }, { offset: 1, color: "#db2777" }] },
  { type: "gradient", angle: 160, stops: [{ offset: 0, color: "#0ea5e9" }, { offset: 1, color: "#1e3a8a" }] },
  { type: "gradient", angle: 140, stops: [{ offset: 0, color: "#34d399" }, { offset: 1, color: "#0f766e" }] },
  { type: "gradient", angle: 120, stops: [{ offset: 0, color: "#f472b6" }, { offset: 1, color: "#a78bfa" }] },
  { type: "gradient", angle: 165, stops: [{ offset: 0, color: "#334155" }, { offset: 1, color: "#0f172a" }] },
  { type: "radial", stops: [{ offset: 0, color: "#a78bfa" }, { offset: 1, color: "#312e81" }] },
  { type: "radial", stops: [{ offset: 0.2, color: "#fde68a" }, { offset: 0.9, color: "#f59e0b" }] },
  { type: "radial", stops: [{ offset: 0, color: "#3b82f6" }, { offset: 1, color: "#0b1120" }] },
  { type: "radial", stops: [{ offset: 0, color: "#fb7185" }, { offset: 1, color: "#881337" }] },
  { type: "gradient", angle: 130, stops: [{ offset: 0, color: "#fde68a" }, { offset: 1, color: "#f59e0b" }] },
  { type: "radial", stops: [{ offset: 0, color: "#6ee7b7" }, { offset: 1, color: "#064e3b" }] },
];

/** Mirrors a stop list, so a gradient runs the other way without re-picking. */
function reverseStops(stops: { offset: number; color: string }[]) {
  return stops
    .map((stop) => ({ offset: 1 - stop.offset, color: stop.color }))
    .reverse();
}

/** One screen's background. */
export function BackgroundPanel({ screenId }: { screenId: string }) {
  const background = useEditorStore(
    (s) => selectScreen(screenId)(s)?.background,
  );
  const screenCount = useEditorStore((s) => s.doc.screens.length);
  const setScreenBackground = useEditorStore((s) => s.setScreenBackground);
  const applyBackgroundToAll = useEditorStore((s) => s.applyBackgroundToAll);
  const clearAsset = useEditorStore((s) => s.clearAsset);

  const [picking, setPicking] = useState(false);
  const assetKey = backgroundAssetKey(screenId);
  const applyPick = useApplyImagePick(assetKey);

  // What the canvas is drawing right now — the local object URL before an
  // upload, the https URL after — so the swatch matches the artboard.
  const imageUrl = useEditorStore((s) => {
    const current = selectScreen(screenId)(s)?.background;
    return current?.type === "image"
      ? selectImageSource(s, backgroundAssetKey(screenId), current.url)
      : null;
  });

  const set = useCallback(
    (next: Background) => setScreenBackground(screenId, next),
    [screenId, setScreenBackground],
  );

  const handlePick = useCallback(
    async (pick: ImagePick) => {
      const applied = await applyPick(pick);
      if (!applied) return;

      const current =
        selectScreen(screenId)(useEditorStore.getState())?.background;
      set({
        type: "image",
        assetId: null,
        url: applied.url,
        fit: current?.type === "image" ? current.fit : "cover",
        align: current?.type === "image" ? current.align : "center",
        rotation: current?.type === "image" ? current.rotation : 0,
        blur: current?.type === "image" ? current.blur : 0,
        opacity: current?.type === "image" ? current.opacity : 1,
      });
    },
    [applyPick, screenId, set],
  );

  if (!background) return null;

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
      case "radial":
        set({
          type: "radial",
          stops: [
            { offset: 0, color: "#6d28d9" },
            { offset: 1, color: "#1e1b4b" },
          ],
        });
        break;
      case "image":
        // The url stays null until an image is picked; the canvas simply renders
        // nothing until then rather than blocking the type switch.
        set({
          type: "image",
          assetId: null,
          url: null,
          fit: "cover",
          align: "center",
          rotation: 0,
          blur: 0,
          opacity: 1,
        });
        break;
    }
  };

  return (
    <div className="space-y-3">
      {/* Style row — a swatch shows what the style looks like, the icon on top
          says what it *is*, and the tooltip names it. */}
      <TooltipProvider>
        <div className="flex items-center gap-1.5">
          <StyleButton
            label="No background"
            active={background.type === "transparent"}
            onClick={() => changeType("transparent")}
            icon={<Ban className="size-4 text-muted-foreground" />}
          />

          <StyleButton
            label="Solid color"
            active={background.type === "color"}
            onClick={() => changeType("color")}
            swatch={background.type === "color" ? background.color : "#6d28d9"}
            icon={<Droplet className="size-3.5" />}
          />

          <StyleButton
            label="Linear gradient"
            active={background.type === "gradient"}
            onClick={() => changeType("gradient")}
            swatch={
              background.type === "gradient"
                ? backgroundPreviewCss(background)
                : "linear-gradient(150deg, #6d28d9, #c4b5fd)"
            }
            icon={<ArrowDownRight className="size-3.5" />}
          />

          <StyleButton
            label="Radial gradient"
            active={background.type === "radial"}
            onClick={() => changeType("radial")}
            swatch={
              background.type === "radial"
                ? backgroundPreviewCss(background)
                : "radial-gradient(circle at center, #c4b5fd, #4c1d95)"
            }
            icon={<Target className="size-3.5" />}
          />

          <StyleButton
            label="Background image"
            active={background.type === "image"}
            onClick={() => changeType("image")}
            icon={<ImageIcon className="size-4 text-muted-foreground" />}
          />

          <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" size="sm" className="ml-auto h-8 text-xs">
              <Sparkles className="size-3.5" />
              Presets
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3">
            <p className="pb-2 text-xs font-medium">Background presets</p>
            <div className="grid grid-cols-4 gap-2">
              {BACKGROUND_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Preset ${index + 1}`}
                  className="aspect-square rounded-lg border shadow-sm transition-transform hover:scale-105"
                  style={{ background: backgroundPreviewCss(preset) }}
                  onClick={() => set(structuredClone(preset))}
                />
              ))}
            </div>
          </PopoverContent>
          </Popover>
        </div>
      </TooltipProvider>

      {background.type === "color" && (
        <>
          <ColorPicker
            value={background.color}
            onChange={(color) => set({ type: "color", color })}
          />
          <div className="flex flex-wrap gap-1.5">
            {SOLID_PRESETS.map((color) => (
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
          <div className="grid grid-cols-[72px_1fr] gap-3">
            <BackgroundSwatch background={background} />
            <div className="space-y-2">
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
                        {
                          ...background.stops[background.stops.length - 1],
                          color,
                        },
                      ],
                    })
                  }
                />
              </Field>
            </div>
          </div>

          <Field label="Angle" hint={`${Math.round(background.angle)}°`}>
            <div className="flex items-center gap-2">
              <Slider
                min={0}
                max={360}
                step={1}
                value={[background.angle]}
                onValueChange={([angle]) => set({ ...background, angle })}
              />
              <Button
                variant="secondary"
                size="icon"
                className="size-7 shrink-0"
                aria-label="Reverse gradient direction"
                onClick={() =>
                  set({ ...background, stops: reverseStops(background.stops) })
                }
              >
                <ArrowLeftRight className="size-3.5" />
              </Button>
            </div>
          </Field>
        </>
      )}

      {background.type === "radial" && (
        <>
          <div className="grid grid-cols-[72px_1fr] gap-3">
            <BackgroundSwatch background={background} />
            <div className="space-y-2">
              <Field label="Center">
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
              <Field label="Outer">
                <ColorPicker
                  value={background.stops[background.stops.length - 1].color}
                  onChange={(color) =>
                    set({
                      ...background,
                      stops: [
                        ...background.stops.slice(0, -1),
                        {
                          ...background.stops[background.stops.length - 1],
                          color,
                        },
                      ],
                    })
                  }
                />
              </Field>
            </div>
          </div>

          {/* Where the two colours sit along the centre→corner run. */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="From">
              <NumberInput
                label="Center stop position"
                value={Math.round(background.stops[0].offset * 100)}
                onChange={(from) => {
                  const last = background.stops[background.stops.length - 1];
                  const clamped = Math.min(from / 100, last.offset);
                  set({
                    ...background,
                    stops: [
                      { ...background.stops[0], offset: clamped },
                      ...background.stops.slice(1),
                    ],
                  });
                }}
                min={0}
                max={100}
                suffix="%"
              />
            </Field>
            <Field label="To">
              <NumberInput
                label="Outer stop position"
                value={Math.round(
                  background.stops[background.stops.length - 1].offset * 100,
                )}
                onChange={(to) => {
                  const clamped = Math.max(
                    to / 100,
                    background.stops[0].offset,
                  );
                  set({
                    ...background,
                    stops: [
                      ...background.stops.slice(0, -1),
                      {
                        ...background.stops[background.stops.length - 1],
                        offset: clamped,
                      },
                    ],
                  });
                }}
                min={0}
                max={100}
                suffix="%"
              />
            </Field>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="w-full text-xs"
            onClick={() =>
              set({ ...background, stops: reverseStops(background.stops) })
            }
          >
            <ArrowLeftRight className="size-3.5" />
            Swap colours
          </Button>
        </>
      )}

      {background.type === "image" && (
        <>
          <div className="grid grid-cols-[72px_1fr] gap-3">
            <BackgroundSwatch background={background} imageUrl={imageUrl} />
            <div className="space-y-2">
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

              <Field label="Vertical position">
                <Select
                  value={background.align}
                  onValueChange={(v) =>
                    set({
                      ...background,
                      align: v as "top" | "center" | "bottom",
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Top</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="bottom">Bottom</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Image rotation">
                <Select
                  value={String(background.rotation)}
                  onValueChange={(v) =>
                    set({
                      ...background,
                      rotation: Number(v) as 0 | 90 | 180 | 270,
                    })
                  }
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0°</SelectItem>
                    <SelectItem value="90">90°</SelectItem>
                    <SelectItem value="180">180°</SelectItem>
                    <SelectItem value="270">270°</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>
          </div>

          <Button className="w-full" size="sm" onClick={() => setPicking(true)}>
            <ImageIcon className="size-4" />
            Select background
          </Button>

          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              clearAsset(assetKey);
              set({ type: "color", color: "#f4f1ff" });
            }}
          >
            Remove image
          </button>

          <ImagePickerDialog
            open={picking}
            onOpenChange={setPicking}
            assetKey={assetKey}
            onPick={handlePick}
            title="Choose a background"
          />
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

/**
 * One style option in the top row: an optional live swatch as the fill, an
 * icon on top saying which kind of style it is, and a tooltip naming it.
 */
function StyleButton({
  label,
  active,
  onClick,
  swatch,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  /** CSS background of the live style; omitted for None and Image. */
  swatch?: string;
  icon: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          className={cn(
            "relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border bg-background shadow-sm transition-all",
            active
              ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
              : "hover:scale-105",
          )}
        >
          {swatch && (
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: swatch }}
            />
          )}
          <span
            className={cn(
              "relative",
              // Over a swatch the glyph is white with a soft shadow, so it
              // reads on light and dark fills alike.
              swatch &&
                "text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)]",
            )}
          >
            {icon}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * The live preview square beside a style's controls — CSS for the flat styles,
 * and for an image whatever the editor is currently rendering from.
 */
function BackgroundSwatch({
  background,
  imageUrl,
}: {
  background: Background;
  imageUrl?: string | null;
}) {
  if (background.type === "image" && imageUrl) {
    return (
      <div className="h-[72px] w-[72px] overflow-hidden rounded-xl border shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="size-full object-cover" />
      </div>
    );
  }

  if (background.type === "image") {
    return (
      <div className="grid h-[72px] w-[72px] place-items-center rounded-xl border bg-muted/60 text-muted-foreground shadow-sm">
        <ImageIcon className="size-4" />
      </div>
    );
  }

  return (
    <div
      className="h-[72px] w-[72px] rounded-xl border shadow-sm"
      style={{ background: backgroundPreviewCss(background) }}
    />
  );
}
