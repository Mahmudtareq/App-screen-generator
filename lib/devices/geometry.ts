import type { Context as KonvaContext } from "konva/lib/Context";

import type {
  CornerRadius,
  Corners,
  DeviceSpec,
  NotchSpec,
  Rect,
  SideButton,
} from "./types";

/**
 * Konva's `cornerRadius` prop wants `number | number[]`, but the catalog is
 * declared `as const` so its tuples are readonly. Copy on the way out.
 */
export function toKonvaRadius(radius: CornerRadius): number | number[] {
  return typeof radius === "number" ? radius : [...radius];
}

function toCorners(radius: CornerRadius): Corners {
  return typeof radius === "number" ? [radius, radius, radius, radius] : radius;
}

/**
 * Traces a rounded rectangle onto a Konva context.
 *
 * Intended for `clipFunc`, which Konva wraps in `beginPath()` / `clip()` itself —
 * so this only walks the path and must not begin or close it on the caller's
 * behalf beyond `closePath`.
 *
 * Radii are clamped so that adjacent corners can never overlap; without this a
 * radius larger than half the shorter side produces an inverted, self-crossing
 * path that clips to nothing.
 */
export function traceRoundedRect(
  ctx: KonvaContext,
  rect: Rect,
  radius: CornerRadius,
): void {
  const { x, y, width: w, height: h } = rect;
  const [tl, tr, br, bl] = toCorners(radius);

  const limit = Math.min(w, h) / 2;
  const rTL = Math.max(0, Math.min(tl, limit));
  const rTR = Math.max(0, Math.min(tr, limit));
  const rBR = Math.max(0, Math.min(br, limit));
  const rBL = Math.max(0, Math.min(bl, limit));

  ctx.moveTo(x + rTL, y);
  ctx.lineTo(x + w - rTR, y);
  ctx.arcTo(x + w, y, x + w, y + rTR, rTR);
  ctx.lineTo(x + w, y + h - rBR);
  ctx.arcTo(x + w, y + h, x + w - rBR, y + h, rBR);
  ctx.lineTo(x + rBL, y + h);
  ctx.arcTo(x, y + h, x, y + h - rBL, rBL);
  ctx.lineTo(x, y + rTL);
  ctx.arcTo(x, y, x + rTL, y, rTL);
  ctx.closePath();
}

/**
 * Absolute (device-space) rect of the notch, given the device's screen rect.
 *
 * `notch.offsetX` is measured from the horizontal centre of the screen and
 * `notch.offsetY` from its top edge, so a device's notch stays put when the screen
 * rect is hand-tuned.
 */
export function resolveNotchRect(spec: DeviceSpec): Rect | null {
  const notch: NotchSpec = spec.notch;
  if (notch.kind === "none" || notch.width <= 0 || notch.height <= 0) return null;

  const screenCenterX = spec.screen.x + spec.screen.width / 2;
  return {
    x: screenCenterX + notch.offsetX - notch.width / 2,
    y: spec.screen.y + notch.offsetY,
    width: notch.width,
    height: notch.height,
  };
}

/**
 * Absolute rect of a side button, given the device body.
 *
 * Buttons sit just outside the body edge so their rounded outer end reads as a
 * raised nub rather than a notch cut into the frame. On a horizontal edge the
 * button lies down: its length runs along x and its protrusion along y.
 */
export function resolveButtonRect(spec: DeviceSpec, button: SideButton): Rect {
  const { offset, length, width } = button;

  switch (button.side) {
    case "left":
      return { x: -width, y: offset, width, height: length };
    case "right":
      return { x: spec.body.width, y: offset, width, height: length };
    case "top":
      return { x: offset, y: -width, width: length, height: width };
    case "bottom":
      return { x: offset, y: spec.body.height, width: length, height: width };
  }
}

/** Aspect ratio of the screenshot a device natively produces. */
export function screenshotAspect(spec: DeviceSpec): number {
  return spec.screenshot.width / spec.screenshot.height;
}
