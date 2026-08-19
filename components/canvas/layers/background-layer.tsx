"use client";

import type { Context } from "konva/lib/Context";
import { Image as KonvaImage, Layer, Rect } from "react-konva";

import { useCanvasBitmap } from "@/hooks/use-canvas-image";
import { BACKGROUND_LAYER_NAME } from "@/lib/canvas/layer-names";
import {
  selectImageSource,
  selectScreen,
  selectScreenArtboard,
} from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { backgroundAssetKey } from "@/lib/editor/types";

/**
 * One screen's background, on its own Konva Layer — which means its own canvas
 * element. It almost never repaints, so keeping it off the content layer saves a
 * full-artboard fill on every drag tick.
 *
 * Also the layer the export pipeline hides to produce a transparent PNG.
 */
export function BackgroundLayer({
  screenId,
  clipFunc,
}: {
  screenId: string;
  clipFunc?: (ctx: Context) => void;
}) {
  const background = useEditorStore((s) => selectScreen(screenId)(s)?.background);
  const artboard = useEditorStore(selectScreenArtboard(screenId));

  const imageUrl = useEditorStore((s) =>
    background?.type === "image"
      ? selectImageSource(s, backgroundAssetKey(screenId), background.url)
      : null,
  );
  const bitmap = useCanvasBitmap(imageUrl);

  if (!background || background.type === "transparent") {
    return (
      <Layer name={BACKGROUND_LAYER_NAME} listening={false} clipFunc={clipFunc} />
    );
  }

  const common = {
    x: 0,
    y: 0,
    width: artboard.width,
    height: artboard.height,
  };

  return (
    <Layer name={BACKGROUND_LAYER_NAME} listening={false} clipFunc={clipFunc}>
      {background.type === "color" && <Rect {...common} fill={background.color} />}

      {background.type === "gradient" && (
        <Rect
          {...common}
          fillLinearGradientStartPoint={gradientStart(background.angle, artboard)}
          fillLinearGradientEndPoint={gradientEnd(background.angle, artboard)}
          fillLinearGradientColorStops={background.stops.flatMap((stop) => [
            stop.offset,
            stop.color,
          ])}
        />
      )}

      {background.type === "radial" && (
        <Rect
          {...common}
          fillRadialGradientStartPoint={{
            x: artboard.width / 2,
            y: artboard.height / 2,
          }}
          fillRadialGradientEndPoint={{
            x: artboard.width / 2,
            y: artboard.height / 2,
          }}
          fillRadialGradientStartRadius={0}
          // Half the diagonal, so offset 1 reaches the corners rather than
          // leaving them past the gradient's edge.
          fillRadialGradientEndRadius={
            Math.hypot(artboard.width, artboard.height) / 2
          }
          fillRadialGradientColorStops={background.stops.flatMap((stop) => [
            stop.offset,
            stop.color,
          ])}
        />
      )}

      {background.type === "image" && bitmap && (
        <KonvaImage
          image={bitmap}
          opacity={background.opacity}
          {...imagePlacement(
            bitmap,
            artboard,
            background.fit,
            background.align,
            background.rotation,
          )}
        />
      )}
    </Layer>
  );
}

/** CSS-style angle: 0° points up, increasing clockwise. */
function gradientStart(angle: number, box: { width: number; height: number }) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: box.width / 2 - (Math.cos(rad) * box.width) / 2,
    y: box.height / 2 - (Math.sin(rad) * box.height) / 2,
  };
}

function gradientEnd(angle: number, box: { width: number; height: number }) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: box.width / 2 + (Math.cos(rad) * box.width) / 2,
    y: box.height / 2 + (Math.sin(rad) * box.height) / 2,
  };
}

/**
 * Places the background bitmap as a positioned node rather than a fill pattern.
 *
 * A node because rotation and vertical alignment are plain geometry this way:
 * the *footprint* (the rotated bounding box) is what covers or fits the
 * artboard, and the node spins around the footprint's centre. Cover overflow
 * paints past the artboard, which is fine — the layer clips to the artboard in
 * the preview, and export crops to it.
 */
function imagePlacement(
  bitmap: HTMLImageElement,
  artboard: { width: number; height: number },
  fit: "cover" | "contain",
  align: "top" | "center" | "bottom",
  rotation: 0 | 90 | 180 | 270,
) {
  const natural = { width: bitmap.naturalWidth, height: bitmap.naturalHeight };

  // A quarter-turned image presents its height as width and vice versa.
  const sideways = rotation % 180 !== 0;
  const effective = sideways
    ? { width: natural.height, height: natural.width }
    : natural;

  const scale =
    fit === "cover"
      ? Math.max(
          artboard.width / effective.width,
          artboard.height / effective.height,
        )
      : Math.min(
          artboard.width / effective.width,
          artboard.height / effective.height,
        );

  const footprint = {
    width: effective.width * scale,
    height: effective.height * scale,
  };

  const y =
    align === "top"
      ? 0
      : align === "bottom"
        ? artboard.height - footprint.height
        : (artboard.height - footprint.height) / 2;

  const width = natural.width * scale;
  const height = natural.height * scale;

  return {
    width,
    height,
    rotation,
    // Spin around the node's own centre, parked at the footprint's centre.
    offsetX: width / 2,
    offsetY: height / 2,
    x: (artboard.width - footprint.width) / 2 + footprint.width / 2,
    y: y + footprint.height / 2,
  };
}
