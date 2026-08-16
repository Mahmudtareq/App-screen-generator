"use client";

import { useCallback } from "react";
import type { Context as KonvaContext } from "konva/lib/Context";
import { Group, Image as KonvaImage } from "react-konva";

import { useCanvasBitmap } from "@/hooks/use-canvas-image";
import { coverCrop } from "@/lib/canvas/cover";
import { traceRoundedRect } from "@/lib/devices/geometry";
import type { DeviceSpec } from "@/lib/devices/types";

/**
 * The screenshot, clipped into the device's screen area.
 *
 * The Image node's bounds are exactly the screen rect; fitting is done with
 * Konva's `crop` (see lib/canvas/cover.ts) rather than by scaling an oversized
 * child. Rounded corners come from the parent Group's `clipFunc`, which is exact
 * at any pixel ratio — unlike masking with a second bitmap.
 */
export function DeviceScreen({
  spec,
  url,
  zoom,
  pan,
}: {
  spec: DeviceSpec;
  url: string | null;
  zoom: number;
  pan: { x: number; y: number };
}) {
  const bitmap = useCanvasBitmap(url);

  // Konva wraps this in beginPath()/clip() itself, so it only traces.
  const clipFunc = useCallback(
    (ctx: KonvaContext) => {
      traceRoundedRect(ctx, spec.screen, spec.screen.cornerRadius);
    },
    [spec.screen],
  );

  if (!bitmap) return null;

  const crop = coverCrop(
    { width: bitmap.naturalWidth, height: bitmap.naturalHeight },
    { width: spec.screen.width, height: spec.screen.height },
    zoom,
    pan,
  );

  return (
    <Group clipFunc={clipFunc} listening={false}>
      <KonvaImage
        image={bitmap}
        x={spec.screen.x}
        y={spec.screen.y}
        width={spec.screen.width}
        height={spec.screen.height}
        crop={crop}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}
