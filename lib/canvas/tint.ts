import type { ImageTint } from "@/schemas/editor";

/**
 * A tinted copy of a bitmap, produced once and reused.
 *
 * Konva can do this with `Konva.Filters.RGB`, and it is the wrong tool here: a
 * filtered node has to be `cache()`d, and a cached node is rasterised at the
 * resolution it was cached at — so the export's 3× pixel ratio would upscale that
 * cache and land softer than the untinted layer beside it. Tinting the *source*
 * instead keeps control of the resolution.
 *
 * `source-atop` is what respects transparency: it paints only where the image
 * already has alpha, so a logo's cut-outs stay cut out and its antialiased edges
 * blend rather than turning into a hard silhouette.
 *
 * Two things keep this affordable, because a colour wheel writes a new tint on
 * every pointer move and each one is a fresh canvas:
 *
 *   - the copy is only as large as the layer needs at full export scale, not as
 *     large as the source happens to be; and
 *   - the cache is bounded by *pixels* rather than by entry count, because twenty
 *     entries means nothing when one of them is a 1200×1600 backdrop.
 */

/** The largest export the dimension guard allows, so the copy is never the weak link. */
const EXPORT_SCALE = 3;

/**
 * Target sizes are rounded up to this, so nudging the size field by a pixel does
 * not invalidate the copy and re-tint the whole bitmap.
 */
const SIZE_STEP = 256;

/** Roughly 64MB of canvas at 4 bytes a pixel. */
const MAX_CACHED_PIXELS = 16_000_000;

interface Entry {
  canvas: HTMLCanvasElement;
  pixels: number;
}

const cache = new Map<string, Entry>();
let cachedPixels = 0;

/**
 * How large the tinted copy has to be: enough for the layer at 3×, never more than
 * the source actually has.
 */
function targetSize(
  natural: { width: number; height: number },
  boxLongEdge: number | undefined,
): { width: number; height: number } {
  if (!boxLongEdge || boxLongEdge <= 0) return natural;

  const naturalLongEdge = Math.max(natural.width, natural.height);
  const needed =
    Math.ceil((boxLongEdge * EXPORT_SCALE) / SIZE_STEP) * SIZE_STEP;

  if (needed >= naturalLongEdge) return natural;

  const scale = needed / naturalLongEdge;
  return {
    width: Math.max(1, Math.round(natural.width * scale)),
    height: Math.max(1, Math.round(natural.height * scale)),
  };
}

function evictTo(budget: number) {
  for (const [id, entry] of cache) {
    if (cachedPixels <= budget) return;
    // Insertion order is close enough to least-recently-useful for a map this
    // small, and a real LRU would be bookkeeping for a handful of canvases.
    cache.delete(id);
    cachedPixels -= entry.pixels;
  }
}

/**
 * @param boxLongEdge The layer's longest side in artboard px. Callers that share a
 *   layer — the canvas node and the inspector's thumbnail — pass the same value, so
 *   they share one canvas rather than tinting the same bitmap twice.
 */
export function tintedBitmap(
  src: string,
  image: HTMLImageElement,
  tint: ImageTint,
  boxLongEdge?: number,
): HTMLCanvasElement | null {
  if (!image.naturalWidth || !image.naturalHeight) return null;

  const size = targetSize(
    { width: image.naturalWidth, height: image.naturalHeight },
    boxLongEdge,
  );

  const id = `${src}|${tint.color}|${tint.strength}|${size.width}x${size.height}`;

  const known = cache.get(id);
  if (known) return known.canvas;

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(image, 0, 0, size.width, size.height);
  context.globalCompositeOperation = "source-atop";
  context.globalAlpha = tint.strength;
  context.fillStyle = tint.color;
  context.fillRect(0, 0, size.width, size.height);

  const pixels = size.width * size.height;
  evictTo(Math.max(0, MAX_CACHED_PIXELS - pixels));

  cache.set(id, { canvas, pixels });
  cachedPixels += pixels;

  return canvas;
}

/** Drops every tinted copy of one source, for when its bytes are replaced. */
export function clearTintCache(src?: string) {
  if (!src) {
    cache.clear();
    cachedPixels = 0;
    return;
  }

  for (const [id, entry] of cache) {
    if (id.startsWith(`${src}|`)) {
      cache.delete(id);
      cachedPixels -= entry.pixels;
    }
  }
}
