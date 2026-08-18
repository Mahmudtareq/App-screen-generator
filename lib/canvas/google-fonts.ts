import type { ResolvedFont } from "@/config/fonts";

/**
 * On-demand loading of Google font faces.
 *
 * A canvas font has to be *loaded*, not merely referenced: Konva measures with
 * `ctx.measureText` and a family the document has never requested measures as the
 * fallback face. So every Google family the editor touches gets a stylesheet
 * injected here first, and the promise this returns is what the font gate and the
 * export pipeline await.
 *
 * Injecting a `<link>` rather than fetching the CSS is deliberate — the browser
 * owns the font cache, deduplicates across tabs, and re-uses the same face for the
 * DOM previews in the picker and for the canvas. Nothing here touches image bytes,
 * so none of it can taint a canvas the way a cross-origin bitmap would.
 */

const CSS_ENDPOINT = "https://fonts.googleapis.com/css2";

/**
 * One entry per family, tracking which weights have been asked for.
 *
 * Keyed by family rather than by family-and-weights because the picker previews a
 * face at 400 long before anyone selects it at 700: a second request for a weight
 * the first did not cover chains another stylesheet onto the same entry, so the
 * preview never leaves the selected font short of its bold.
 */
interface FamilyLoad {
  weights: Set<number>;
  promise: Promise<void>;
}

const loads = new Map<string, FamilyLoad>();

/** Size is irrelevant to whether a face loads, but `document.fonts.load` requires one. */
const PROBE_SIZE = "64px";

/** How long a stylesheet gets before the caller stops waiting on it. */
const LINK_TIMEOUT_MS = 6000;

export function googleFontCssUrl(
  family: string,
  weights: readonly number[] = [],
): string {
  const spec = weights.length
    ? `${family}:wght@${[...new Set(weights)].sort((a, b) => a - b).join(";")}`
    : family;

  return `${CSS_ENDPOINT}?family=${encodeURIComponent(spec).replace(/%20/g, "+")}&display=swap`;
}

/** Resolves when the stylesheet has landed, or been given up on. */
function injectStylesheet(href: string): Promise<boolean> {
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.crossOrigin = "anonymous";

    const settle = (ok: boolean) => {
      clearTimeout(timer);
      resolve(ok);
    };

    const timer = setTimeout(() => settle(false), LINK_TIMEOUT_MS);

    link.addEventListener("load", () => settle(true), { once: true });
    link.addEventListener(
      "error",
      () => {
        link.remove();
        settle(false);
      },
      { once: true },
    );

    document.head.appendChild(link);
  });
}

/**
 * Fetches one family's stylesheet and waits for its faces to become usable.
 *
 * Never rejects. A family that cannot be fetched — offline, blocked, or a weight
 * this catalogue got wrong — has to degrade to the fallback face rather than take
 * the editor down with it, which is also why a failed request is retried once
 * without the weight list: css2 answers an unavailable weight with a 400 for the
 * whole stylesheet, and the regular weight alone is far better than nothing.
 */
async function fetchFaces(family: string, weights: readonly number[]) {
  const ok =
    (await injectStylesheet(googleFontCssUrl(family, weights))) ||
    (await injectStylesheet(googleFontCssUrl(family)));

  if (!ok || !document.fonts) return;

  await Promise.all(
    weights.map((weight) =>
      document.fonts.load(`${weight} ${PROBE_SIZE} "${family}"`).catch(() => []),
    ),
  );
}

/** Loads one Google family and resolves once the requested weights are usable. */
export function loadGoogleFamily(
  family: string,
  weights: readonly number[] = [400],
): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const entry = loads.get(family);
  if (entry && weights.every((weight) => entry.weights.has(weight))) {
    return entry.promise;
  }

  const merged = new Set([...(entry?.weights ?? []), ...weights]);
  // Chained rather than raced, so the widened request cannot start before the
  // narrower one it supersedes has finished parsing.
  const promise = (entry?.promise ?? Promise.resolve()).then(() =>
    fetchFaces(family, [...merged]),
  );

  loads.set(family, { weights: merged, promise });
  return promise;
}

/** Families requested so far this session — what export has to re-await. */
export function requestedGoogleFamilies(): string[] {
  return [...loads.keys()];
}

/** Loads a resolved font if it is a Google one; a no-op for the built-in faces. */
export function loadIfGoogle(font: ResolvedFont): Promise<void> {
  return font.source === "google"
    ? loadGoogleFamily(font.family, font.weights)
    : Promise.resolve();
}

/**
 * The regular weight alone, for a picker row.
 *
 * Previewing seventy families at every weight they ship would be several hundred
 * font files to look at a list; 400 is what the row actually paints, and selecting
 * the font widens the request to the rest.
 */
export function loadPreviewFace(font: ResolvedFont): Promise<void> {
  return font.source === "google"
    ? loadGoogleFamily(font.family, [400])
    : Promise.resolve();
}
