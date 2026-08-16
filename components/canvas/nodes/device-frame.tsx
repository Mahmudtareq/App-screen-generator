"use client";

import { Rect } from "react-konva";

import { resolveButtonRect, toKonvaRadius } from "@/lib/devices/geometry";
import type { Colorway, DeviceSpec } from "@/lib/devices/types";

/**
 * The device body and its side buttons.
 *
 * Drawn from Konva primitives rather than a single `Konva.Path` or a rasterised
 * SVG. A bitmap screenshot needs a clipping Group regardless, so once that exists
 * the body is just a Rect behind it — and a Rect gives per-corner radii, native
 * shadows and strokes for free, while staying vector so a 3x export re-rasterises
 * crisp instead of upscaling.
 *
 * Known limitation: Konva's corners are circular arcs, whereas Apple's are
 * continuous-curvature superellipses. Invisible at 1x, noticeable to a designer
 * on a large hero shot — `spec.bodyPath` is the escape hatch for that.
 */
export function DeviceFrame({
  spec,
  colorway,
  shadowEnabled,
}: {
  spec: DeviceSpec;
  colorway: Colorway;
  shadowEnabled: boolean;
}) {
  const { style } = colorway;
  const shadow = shadowEnabled ? style.shadow : undefined;

  return (
    <>
      {spec.buttons?.map((button, index) => {
        const rect = resolveButtonRect(spec, button);
        return (
          <Rect
            key={`button-${index}`}
            {...rect}
            cornerRadius={button.radius}
            fill={style.bodyFill}
            listening={false}
            perfectDrawEnabled={false}
          />
        );
      })}

      <Rect
        x={0}
        y={0}
        width={spec.body.width}
        height={spec.body.height}
        cornerRadius={toKonvaRadius(spec.body.cornerRadius)}
        fill={style.bodyFill}
        stroke={style.bodyStroke}
        strokeWidth={style.bodyStrokeWidth}
        shadowColor={shadow?.color}
        shadowBlur={shadow?.blur}
        shadowOffsetX={shadow?.offsetX}
        shadowOffsetY={shadow?.offsetY}
        shadowOpacity={shadow?.opacity}
        // The one listening shape in the device: it gives the Group its hit area.
        // Everything above it is non-listening, so clicks anywhere on the
        // silhouette — screen included — fall through to this rect and select the
        // device as a whole.
      />

      {/* Sits under the screenshot so the screen never shows the body colour
          through, and stands in for the screen entirely before an upload. */}
      <Rect
        x={spec.screen.x}
        y={spec.screen.y}
        width={spec.screen.width}
        height={spec.screen.height}
        cornerRadius={toKonvaRadius(spec.screen.cornerRadius)}
        fill={style.screenFill}
        listening={false}
        perfectDrawEnabled={false}
      />
    </>
  );
}
