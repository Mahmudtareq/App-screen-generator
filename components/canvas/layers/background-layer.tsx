"use client";

import type { Context } from "konva/lib/Context";
import { Layer, Rect } from "react-konva";

import { useCanvasBitmap } from "@/hooks/use-canvas-image";
import { coverCrop } from "@/lib/canvas/cover";
import { BACKGROUND_LAYER_NAME } from "@/lib/canvas/layer-names";
import { selectImageSource, selectScreen } from "@/lib/editor/selectors";
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
  const artboard = useEditorStore((s) => s.doc.artboard);

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

      {background.type === "image" && bitmap && (
        <Rect
          {...common}
          opacity={background.opacity}
          fillPatternImage={bitmap}
          fillPatternRepeat="no-repeat"
          {...patternFit(bitmap, artboard, background.fit)}
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
 * Scales and offsets the fill pattern so the image covers (or fits inside) the
 * artboard, using the same crop maths as the device screen.
 */
function patternFit(
  bitmap: HTMLImageElement,
  artboard: { width: number; height: number },
  fit: "cover" | "contain",
) {
  const natural = { width: bitmap.naturalWidth, height: bitmap.naturalHeight };

  if (fit === "contain") {
    const scale = Math.min(
      artboard.width / natural.width,
      artboard.height / natural.height,
    );
    return {
      fillPatternScaleX: scale,
      fillPatternScaleY: scale,
      fillPatternOffsetX: -(artboard.width / scale - natural.width) / 2,
      fillPatternOffsetY: -(artboard.height / scale - natural.height) / 2,
    };
  }

  const crop = coverCrop(natural, artboard);
  const scale = artboard.width / crop.width;
  return {
    fillPatternScaleX: scale,
    fillPatternScaleY: scale,
    fillPatternOffsetX: crop.x,
    fillPatternOffsetY: crop.y,
  };
}
