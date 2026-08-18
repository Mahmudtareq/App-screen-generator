"use client";

import { useCallback } from "react";
import type { Context as KonvaContext } from "konva/lib/Context";
import { Group, Image as KonvaImage } from "react-konva";

import { useCanvasBitmap } from "@/hooks/use-canvas-image";
import { coverCrop } from "@/lib/canvas/cover";
import { traceRoundedRect } from "@/lib/devices/geometry";
import type {
  CornerRadius,
  DeviceSpec,
  Rect as DeviceRect,
} from "@/lib/devices/types";
import type { ScreenshotFit } from "@/schemas/editor";

/**
 * A screenshot fitted into an arbitrary rounded rect.
 *
 * Extracted from the device screen so every frame mode draws its bitmap the same
 * way — framed screen, bare screenshot and full-bleed all differ only in the
 * rect they hand this. `cover` crops via Konva's `crop` (see lib/canvas/cover.ts)
 * and is the only mode zoom/pan apply to; `contain` letterboxes, centred, and
 * whatever sits behind shows through the bars.
 */
export function ScreenshotImage({
  rect,
  cornerRadius,
  url,
  fit,
  zoom,
  pan,
}: {
  rect: DeviceRect;
  cornerRadius: CornerRadius;
  url: string | null;
  fit: ScreenshotFit;
  zoom: number;
  pan: { x: number; y: number };
}) {
  const bitmap = useCanvasBitmap(url);

  // Konva wraps this in beginPath()/clip() itself, so it only traces.
  const clipFunc = useCallback(
    (ctx: KonvaContext) => {
      traceRoundedRect(ctx, rect, cornerRadius);
    },
    [rect, cornerRadius],
  );

  if (!bitmap) return null;

  if (fit === "contain") {
    const scale = Math.min(
      rect.width / bitmap.naturalWidth,
      rect.height / bitmap.naturalHeight,
    );
    const width = bitmap.naturalWidth * scale;
    const height = bitmap.naturalHeight * scale;

    return (
      <Group clipFunc={clipFunc} listening={false}>
        <KonvaImage
          image={bitmap}
          x={rect.x + (rect.width - width) / 2}
          y={rect.y + (rect.height - height) / 2}
          width={width}
          height={height}
          listening={false}
          perfectDrawEnabled={false}
        />
      </Group>
    );
  }

  const crop = coverCrop(
    { width: bitmap.naturalWidth, height: bitmap.naturalHeight },
    { width: rect.width, height: rect.height },
    zoom,
    pan,
  );

  return (
    <Group clipFunc={clipFunc} listening={false}>
      <KonvaImage
        image={bitmap}
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        crop={crop}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}

/** The screenshot, clipped into the device's screen area. */
export function DeviceScreen({
  spec,
  url,
  fit,
  zoom,
  pan,
}: {
  spec: DeviceSpec;
  url: string | null;
  fit: ScreenshotFit;
  zoom: number;
  pan: { x: number; y: number };
}) {
  return (
    <ScreenshotImage
      rect={spec.screen}
      cornerRadius={spec.screen.cornerRadius}
      url={url}
      fit={fit}
      zoom={zoom}
      pan={pan}
    />
  );
}
