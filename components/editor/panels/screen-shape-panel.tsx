"use client";

import { ARTBOARD_MAX, ARTBOARD_MIN } from "@/config/artboards";
import { NumberInput } from "@/components/common/number-input";
import { selectScreen, selectScreenArtboard } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import type { CornerRadii } from "@/schemas/editor";
import { cn } from "@/lib/utils";

import { Field } from "./panel-section";

/** One-click rounding levels, in artboard px. */
const RADIUS_PRESETS = [0, 32, 64, 120];

/**
 * The frame of one screen: per-corner rounding, and this screen's own size.
 *
 * Both are per screen. Rounding is a styling choice for the exported image —
 * it lands as transparency, so PNG/WebP keep it while a JPEG export stays
 * square. Size starts as the set's shared artboard and can be broken out: the
 * first edit here stamps `screen.size`, the layout rescales to follow, and
 * "Use project size" folds the screen back into the set.
 */
export function ScreenShapePanel({ screenId }: { screenId: string }) {
  const corners = useEditorStore((s) => selectScreen(screenId)(s)?.corners);
  const size = useEditorStore((s) => selectScreen(screenId)(s)?.size);
  const artboard = useEditorStore(selectScreenArtboard(screenId));
  const setScreenCorners = useEditorStore((s) => s.setScreenCorners);
  const setScreenSize = useEditorStore((s) => s.setScreenSize);

  if (!corners) return null;

  const maxRadius = Math.floor(Math.min(artboard.width, artboard.height) / 2);
  const uniform =
    corners.topLeft === corners.topRight &&
    corners.topRight === corners.bottomRight &&
    corners.bottomRight === corners.bottomLeft
      ? corners.topLeft
      : null;

  const patch = (key: keyof CornerRadii, value: number) =>
    setScreenCorners(screenId, { ...corners, [key]: value });

  const setAll = (value: number) =>
    setScreenCorners(screenId, {
      topLeft: value,
      topRight: value,
      bottomRight: value,
      bottomLeft: value,
    });

  return (
    <div className="space-y-3">
      <Field label="Rounded corners" hint="this screen only">
        <div className="flex gap-1.5">
          {RADIUS_PRESETS.map((radius) => (
            <button
              key={radius}
              type="button"
              onClick={() => setAll(radius)}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-xs tabular-nums transition-colors",
                uniform === radius
                  ? "border-primary/50 bg-primary/10 font-medium text-primary"
                  : "hover:bg-muted",
              )}
            >
              {radius}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Top left">
          <NumberInput
            label="Top left corner radius"
            value={Math.round(corners.topLeft)}
            onChange={(value) => patch("topLeft", value)}
            min={0}
            max={maxRadius}
            suffix="px"
          />
        </Field>
        <Field label="Top right">
          <NumberInput
            label="Top right corner radius"
            value={Math.round(corners.topRight)}
            onChange={(value) => patch("topRight", value)}
            min={0}
            max={maxRadius}
            suffix="px"
          />
        </Field>
        <Field label="Bottom left">
          <NumberInput
            label="Bottom left corner radius"
            value={Math.round(corners.bottomLeft)}
            onChange={(value) => patch("bottomLeft", value)}
            min={0}
            max={maxRadius}
            suffix="px"
          />
        </Field>
        <Field label="Bottom right">
          <NumberInput
            label="Bottom right corner radius"
            value={Math.round(corners.bottomRight)}
            onChange={(value) => patch("bottomRight", value)}
            min={0}
            max={maxRadius}
            suffix="px"
          />
        </Field>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Rounded corners export as transparency — pick PNG or WebP when
        downloading; JPG stays square.
      </p>

      <div className="border-t pt-3">
        <Field label="Screen size" hint="this screen only">
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="Screen width"
              value={artboard.width}
              onChange={(width) =>
                setScreenSize(screenId, {
                  width,
                  height: artboard.height,
                  preset: null,
                })
              }
              min={ARTBOARD_MIN}
              max={ARTBOARD_MAX}
              suffix="px"
            />
            <NumberInput
              label="Screen height"
              value={artboard.height}
              onChange={(height) =>
                setScreenSize(screenId, {
                  width: artboard.width,
                  height,
                  preset: null,
                })
              }
              min={ARTBOARD_MIN}
              max={ARTBOARD_MAX}
              suffix="px"
            />
          </div>
        </Field>

        {size ? (
          <button
            type="button"
            className="pt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => setScreenSize(screenId, null)}
          >
            Use project size
          </button>
        ) : (
          <p className="pt-2 text-[11px] leading-relaxed text-muted-foreground">
            Editing breaks this screen out of the project size; its layout
            rescales to follow.
          </p>
        )}
      </div>
    </div>
  );
}
