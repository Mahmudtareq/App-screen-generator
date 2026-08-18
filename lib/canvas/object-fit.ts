import type { ImageAlign, ImageFit } from "@/schemas/editor";

import { coverCrop, type CropRect } from "./cover";

/**
 * Where a bitmap is drawn inside a layer's box.
 *
 * The box is what the user drags and what the Transformer measures; the bitmap has
 * an aspect ratio of its own that need not match. One function answers "so where do
 * the pixels go", and both the preview node and the export read it — the alternative,
 * a node that positions the image and a second place that reasons about it, is how a
 * logo ends up centred on screen and off-centre in the PNG.
 */
export interface ImagePlacement {
  /** Offset from the layer's origin, in artboard px. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Source rect, for `cover`. Undefined means "draw the whole bitmap". */
  crop?: CropRect;
}

/** `align` as the vertical pan `coverCrop` takes, in -1..1. */
const CROP_PAN: Record<ImageAlign, number> = {
  top: -1,
  center: 0,
  bottom: 1,
};

export function placeImage(
  natural: { width: number; height: number },
  box: { width: number; height: number },
  fit: ImageFit,
  align: ImageAlign,
): ImagePlacement {
  const full = { x: 0, y: 0, width: box.width, height: box.height };

  // A bitmap that has not reported its size yet cannot be fitted to anything, and
  // dividing by it would produce a NaN geometry Konva silently refuses to draw.
  if (natural.width <= 0 || natural.height <= 0) return full;

  if (fit === "fill") return full;

  if (fit === "cover") {
    return {
      ...full,
      crop: coverCrop(natural, box, 1, { x: 0, y: CROP_PAN[align] }),
    };
  }

  const scale = Math.min(box.width / natural.width, box.height / natural.height);
  const width = natural.width * scale;
  const height = natural.height * scale;
  const slack = box.height - height;

  return {
    // Horizontal stays centred: "vertical position" is the only axis the inspector
    // offers, because a badge or logo sitting off to one side of its own box is a
    // move, not an alignment.
    x: (box.width - width) / 2,
    y: align === "top" ? 0 : align === "bottom" ? slack : slack / 2,
    width,
    height,
  };
}
