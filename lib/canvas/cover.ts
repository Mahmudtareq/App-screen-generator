import { clamp } from "@/lib/utils";

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * object-fit: cover, expressed as a Konva `crop` rect.
 *
 * Cropping rather than scaling keeps the Image node's bounds exactly equal to the
 * device's screen rect. That means hit-testing, clipping and the screen's rounded
 * corners never have to account for an oversized child, and panning the
 * screenshot inside the frame is plain arithmetic on the source rect instead of a
 * transform that has to be undone before export.
 *
 * @param zoom >= 1, magnifying into the centre of the covered region.
 * @param pan  each axis in -1..1, as a fraction of the leftover slack.
 */
export function coverCrop(
  natural: { width: number; height: number },
  target: { width: number; height: number },
  zoom = 1,
  pan: { x: number; y: number } = { x: 0, y: 0 },
): CropRect {
  if (natural.width <= 0 || natural.height <= 0 || target.height <= 0) {
    return { x: 0, y: 0, width: natural.width, height: natural.height };
  }

  const targetAspect = target.width / target.height;
  const naturalAspect = natural.width / natural.height;

  // Take the largest source rect matching the target's aspect ratio; whichever
  // dimension is proportionally more generous is the one that gets trimmed.
  let cropWidth: number;
  let cropHeight: number;

  if (naturalAspect > targetAspect) {
    cropHeight = natural.height;
    cropWidth = cropHeight * targetAspect;
  } else {
    cropWidth = natural.width;
    cropHeight = cropWidth / targetAspect;
  }

  const safeZoom = Math.max(1, zoom);
  cropWidth /= safeZoom;
  cropHeight /= safeZoom;

  const slackX = natural.width - cropWidth;
  const slackY = natural.height - cropHeight;

  return {
    x: slackX / 2 + (clamp(pan.x, -1, 1) * slackX) / 2,
    y: slackY / 2 + (clamp(pan.y, -1, 1) * slackY) / 2,
    width: cropWidth,
    height: cropHeight,
  };
}

/**
 * True when a screenshot's aspect ratio differs enough from the device's that
 * visible cropping will occur, so the upload panel can warn instead of silently
 * trimming the user's content.
 */
export function isAspectMismatch(
  natural: { width: number; height: number },
  expected: { width: number; height: number },
  tolerance = 0.02,
): boolean {
  if (!natural.width || !natural.height) return false;
  const a = natural.width / natural.height;
  const b = expected.width / expected.height;
  return Math.abs(a - b) / b > tolerance;
}
