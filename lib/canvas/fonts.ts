import {
  CANVAS_FONTS,
  GOOGLE_FONT_PREFIX,
  resolveFont,
  type ResolvedFont,
} from "@/config/fonts";

import { loadIfGoogle, requestedGoogleFamilies } from "./google-fonts";

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

function faceSpecs(font: ResolvedFont): string[] {
  return font.weights.map((weight) => `${weight} ${PROBE_SIZE} "${font.family}"`);
}

/**
 * What `ensureFontsLoaded()` covers when the caller names nothing: every built-in
 * face, plus every Google family this session has already asked for.
 *
 * The second half is what makes the export pipeline's bare call correct — a
 * document's fonts are requested when it loads, so by export time they are in that
 * list and get re-awaited rather than assumed.
 */
function defaultFontIds(): string[] {
  return [
    ...CANVAS_FONTS.map((font) => font.id),
    ...requestedGoogleFamilies().map((family) => `${GOOGLE_FONT_PREFIX}${family}`),
  ];
}

/**
 * Resolves once the requested fonts are usable.
 *
 * Races a timeout so that a slow or unreachable font file degrades to rendering
 * in the fallback face rather than leaving the editor stuck on a skeleton
 * forever.
 */
export async function ensureFontsLoaded(
  ids: readonly string[] = defaultFontIds(),
  timeoutMs = 4000,
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  const loads = ids.map(resolveFont).map(async (font) => {
    // A Google face has no @font-face rule until its stylesheet lands, and
    // `document.fonts.load` on a family the page has never heard of resolves
    // immediately with nothing loaded — so the stylesheet has to come first.
    await loadIfGoogle(font);
    await Promise.all(
      faceSpecs(font).map((spec) => document.fonts.load(spec).catch(() => [])),
    );
  });

  await Promise.race([
    Promise.all(loads)
      .then(() => document.fonts.ready)
      .then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}

/** One font, for the picker's previews and for a freshly chosen family. */
export function ensureFontLoaded(id: string, timeoutMs?: number): Promise<void> {
  return ensureFontsLoaded([id], timeoutMs);
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
