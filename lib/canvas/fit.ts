export const CANVAS_PADDING = 48;

/**
 * Scale factor that fits the artboard inside the preview container.
 *
 * The Stage absorbs this scale, which means every node in the tree works in
 * artboard px and nothing in the UI ever converts between screen and design
 * units — a 64px title is 64 artboard px at any zoom level, on any monitor.
 *
 * Capped at 1 so a small artboard is shown at its natural size rather than blown
 * up into a blurry, misleading preview.
 */
export function computeFitScale(
  container: { width: number; height: number },
  artboard: { width: number; height: number },
  padding = CANVAS_PADDING,
): number {
  const availableWidth = container.width - padding * 2;
  const availableHeight = container.height - padding * 2;

  if (availableWidth <= 0 || availableHeight <= 0) return 0;

  return Math.min(
    availableWidth / artboard.width,
    availableHeight / artboard.height,
    1,
  );
}
