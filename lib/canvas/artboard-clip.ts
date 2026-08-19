import type { Context } from "konva/lib/Context";

import type { CornerRadii } from "@/schemas/editor";

/**
 * Clip path for one screen's artboard rect with per-corner rounding.
 *
 * Shared between the live canvas (which adds a cosmetic minimum so cards look
 * finished even at zero) and the export pipeline (which uses the document's
 * radii exactly). Radii are clamped to half the shorter side, so opposite
 * corners can never overlap into a bow-tie path.
 */
export function artboardClipFunc(
  artboard: { width: number; height: number },
  corners: CornerRadii,
): (ctx: Context) => void {
  const { width, height } = artboard;
  const cap = Math.min(width, height) / 2;
  const clamp = (radius: number) => Math.max(0, Math.min(radius, cap));

  const topLeft = clamp(corners.topLeft);
  const topRight = clamp(corners.topRight);
  const bottomRight = clamp(corners.bottomRight);
  const bottomLeft = clamp(corners.bottomLeft);

  return (ctx: Context) => {
    ctx.moveTo(topLeft, 0);
    ctx.arcTo(width, 0, width, height, topRight);
    ctx.arcTo(width, height, 0, height, bottomRight);
    ctx.arcTo(0, height, 0, 0, bottomLeft);
    ctx.arcTo(0, 0, width, 0, topLeft);
    ctx.closePath();
  };
}

/** True when any corner is actually rounded — i.e. the clip changes the export. */
export function hasRoundedCorners(corners: CornerRadii): boolean {
  return (
    corners.topLeft > 0 ||
    corners.topRight > 0 ||
    corners.bottomRight > 0 ||
    corners.bottomLeft > 0
  );
}
