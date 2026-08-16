import { CANVAS_FONTS, getCanvasFont, type CanvasFontId } from "@/config/fonts";

/**
 * Konva measures text with `ctx.measureText` at the moment a Text node is
 * constructed. If the webfont has not loaded yet it measures the fallback and
 * bakes in the wrong line breaks and the wrong node height — which shows up as a
 * title that wraps to two lines in the preview and three in the export.
 *
 * So: load the fonts up front, gate first paint on them, and force a re-measure
 * whenever one arrives late.
 */

/** Size is irrelevant to whether a face loads, but `document.fonts.load` requires one. */
const PROBE_SIZE = "64px";

function faceSpecs(id: CanvasFontId): string[] {
  const font = getCanvasFont(id);
  return font.weights.map((weight) => `${weight} ${PROBE_SIZE} "${font.family}"`);
}

/**
 * Resolves once the requested canvas fonts are usable.
 *
 * Races a timeout so that a slow or unreachable font file degrades to rendering
 * in the fallback face rather than leaving the editor stuck on a skeleton
 * forever.
 */
export async function ensureFontsLoaded(
  ids: readonly CanvasFontId[] = CANVAS_FONTS.map((f) => f.id),
  timeoutMs = 4000,
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  const loads = ids.flatMap((id) =>
    faceSpecs(id).map((spec) => document.fonts.load(spec)),
  );

  await Promise.race([
    Promise.all(loads)
      .then(() => document.fonts.ready)
      .then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/**
 * Calls `onLoadingDone` whenever the browser finishes a batch of font loads.
 *
 * Covers the case where a font is requested after first paint — the user picks
 * Playfair from the font dropdown, the face streams in a moment later, and every
 * Text node using it needs to re-measure.
 *
 * Returns an unsubscribe function.
 */
export function watchFontLoading(onLoadingDone: () => void): () => void {
  if (typeof document === "undefined" || !document.fonts) return () => {};

  const handler = () => onLoadingDone();
  document.fonts.addEventListener("loadingdone", handler);
  return () => document.fonts.removeEventListener("loadingdone", handler);
}
