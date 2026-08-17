/** Breathing room above and below the cards inside the filmstrip. */
export const STRIP_PADDING = 24;

/**
 * Scale factor that fits an artboard into the filmstrip's height.
 *
 * Height is the only constraint. Every screen in a project shares one artboard, so
 * the cards are all the same size, laid out in a row that scrolls horizontally —
 * fitting to width as well would shrink five frames to thumbnails as soon as a
 * sixth was added, which is the opposite of what the strip is for.
 *
 * The Stage absorbs this scale, which means every node in the tree works in
 * artboard px and nothing in the UI ever converts between screen and design
 * units — a 64px title is 64 artboard px at any zoom level, on any monitor.
 *
 * Capped at 1 so a small artboard is shown at its natural size rather than blown
 * up into a blurry, misleading preview.
 */
export function computeCardScale(
  stripHeight: number,
  artboard: { width: number; height: number },
  padding = STRIP_PADDING,
): number {
  const available = stripHeight - padding * 2;
  if (available <= 0) return 0;

  return Math.min(available / artboard.height, 1);
}
