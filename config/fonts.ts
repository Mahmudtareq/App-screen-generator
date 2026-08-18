/**
 * Fonts available to text layers on the canvas.
 *
 * Two sources, one id space.
 *
 * **Built in** faces are self-hosted and always available offline. They are
 * deliberately separate from the app's own UI font: `next/font/google` generates a
 * mangled family name (`__Inter_a1b2c3`) that it only exposes through a CSS custom
 * property, and `ctx.font` — which is how Konva measures and paints text — does not
 * resolve CSS variables. Passing `var(--font-sans)` to a Konva Text node fails
 * silently and falls back to the default sans-serif, so canvas fonts get literal
 * family names declared by hand in app/globals.css instead. The `Canvas` suffix on
 * each family keeps those names from ever colliding with a next/font-generated one.
 *
 * **Google** faces are fetched on demand from fonts.googleapis.com by
 * [lib/canvas/google-fonts.ts](../lib/canvas/google-fonts.ts). Their family name
 * *is* their identity, so their id is the family prefixed with `google:` — a
 * document that names a family this catalogue later drops still resolves and still
 * loads, because the id carries everything the loader needs.
 *
 * A family shipped as both (Inter, Poppins, Montserrat, Playfair Display) always
 * resolves to the built-in id: `fontIdForFamily` maps by label, so picking Inter
 * out of the Google list costs no network request.
 */

export type FontCategory = "sans" | "serif" | "display" | "handwriting" | "mono";

export type FontSource = "local" | "google";

export interface CanvasFont {
  id: string;
  label: string;
  /** Literal family name, matching the @font-face rule in app/globals.css. */
  family: string;
  /** Weights the editor offers. Variable files cover the whole range. */
  weights: readonly number[];
  category: FontCategory;
}

export const CANVAS_FONTS = [
  {
    id: "inter",
    label: "Inter",
    family: "InterCanvas",
    weights: [400, 500, 600, 700, 800],
    category: "sans",
  },
  {
    id: "poppins",
    label: "Poppins",
    family: "PoppinsCanvas",
    weights: [400, 700],
    category: "sans",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    family: "MontserratCanvas",
    weights: [400, 500, 600, 700, 800],
    category: "sans",
  },
  {
    id: "playfair",
    label: "Playfair Display",
    family: "PlayfairCanvas",
    weights: [400, 500, 600, 700, 800],
    category: "serif",
  },
] as const satisfies readonly CanvasFont[];

export type CanvasFontId = (typeof CANVAS_FONTS)[number]["id"];

export const DEFAULT_FONT_ID: CanvasFontId = "inter";

/* ------------------------------- google fonts ------------------------------ */

export const GOOGLE_FONT_PREFIX = "google:";

export interface GoogleFontSpec {
  family: string;
  /**
   * Weights requested from the CSS API.
   *
   * Kept conservative on purpose: css2 answers a request for a weight a family
   * does not ship with a 400, which would drop the whole stylesheet. The loader
   * retries bare on that failure, so an over-optimistic entry here degrades to the
   * regular weight rather than to no font at all.
   */
  weights: readonly number[];
  category: FontCategory;
}

/**
 * A curated slice of Google Fonts, not the whole directory.
 *
 * The full directory is ~1500 families, which is a scrolling problem rather than a
 * feature — these are the ones that actually read well at store-screenshot sizes,
 * grouped so the picker's categories mean something. "Browse all Google Fonts"
 * in the picker links out for anything beyond this.
 */
export const GOOGLE_FONTS = [
  { family: "Roboto", weights: [300, 400, 500, 700, 900], category: "sans" },
  { family: "Open Sans", weights: [300, 400, 500, 600, 700, 800], category: "sans" },
  { family: "Inter", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Montserrat", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Poppins", weights: [300, 400, 500, 600, 700, 800], category: "sans" },
  { family: "Lato", weights: [300, 400, 700, 900], category: "sans" },
  { family: "Raleway", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Nunito", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Nunito Sans", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Rubik", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Work Sans", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "DM Sans", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Manrope", weights: [300, 400, 500, 600, 700, 800], category: "sans" },
  { family: "Plus Jakarta Sans", weights: [300, 400, 500, 600, 700, 800], category: "sans" },
  { family: "Outfit", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Figtree", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Sora", weights: [300, 400, 500, 600, 700, 800], category: "sans" },
  { family: "Space Grotesk", weights: [300, 400, 500, 600, 700], category: "sans" },
  { family: "Urbanist", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Lexend", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Epilogue", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Public Sans", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Karla", weights: [300, 400, 500, 600, 700, 800], category: "sans" },
  { family: "Mulish", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Quicksand", weights: [300, 400, 500, 600, 700], category: "sans" },
  { family: "Josefin Sans", weights: [300, 400, 500, 600, 700], category: "sans" },
  { family: "Barlow", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Cabin", weights: [400, 500, 600, 700], category: "sans" },
  { family: "Heebo", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Hind", weights: [300, 400, 500, 600, 700], category: "sans" },
  { family: "Titillium Web", weights: [300, 400, 600, 700, 900], category: "sans" },
  { family: "PT Sans", weights: [400, 700], category: "sans" },
  { family: "Source Sans 3", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Noto Sans", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Fira Sans", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "IBM Plex Sans", weights: [300, 400, 500, 600, 700], category: "sans" },
  { family: "Oswald", weights: [300, 400, 500, 600, 700], category: "sans" },
  { family: "Roboto Condensed", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Archivo", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Chivo", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Exo 2", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Kanit", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Overpass", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Red Hat Display", weights: [300, 400, 500, 600, 700, 800, 900], category: "sans" },
  { family: "Playfair Display", weights: [400, 500, 600, 700, 800, 900], category: "serif" },
  { family: "Merriweather", weights: [300, 400, 700, 900], category: "serif" },
  { family: "Lora", weights: [400, 500, 600, 700], category: "serif" },
  { family: "PT Serif", weights: [400, 700], category: "serif" },
  { family: "Noto Serif", weights: [300, 400, 500, 600, 700, 800, 900], category: "serif" },
  { family: "Libre Baskerville", weights: [400, 700], category: "serif" },
  { family: "EB Garamond", weights: [400, 500, 600, 700, 800], category: "serif" },
  { family: "Cormorant Garamond", weights: [300, 400, 500, 600, 700], category: "serif" },
  { family: "Spectral", weights: [300, 400, 500, 600, 700, 800], category: "serif" },
  { family: "Bitter", weights: [300, 400, 500, 600, 700, 800, 900], category: "serif" },
  { family: "Roboto Slab", weights: [300, 400, 500, 600, 700, 800, 900], category: "serif" },
  { family: "Zilla Slab", weights: [300, 400, 500, 600, 700], category: "serif" },
  { family: "Domine", weights: [400, 500, 600, 700], category: "serif" },
  { family: "Fraunces", weights: [300, 400, 500, 600, 700, 800, 900], category: "serif" },
  { family: "Bebas Neue", weights: [400], category: "display" },
  { family: "Anton", weights: [400], category: "display" },
  { family: "Archivo Black", weights: [400], category: "display" },
  { family: "Righteous", weights: [400], category: "display" },
  { family: "Fredoka", weights: [300, 400, 500, 600, 700], category: "display" },
  { family: "Comfortaa", weights: [300, 400, 500, 600, 700], category: "display" },
  { family: "Syne", weights: [400, 500, 600, 700, 800], category: "display" },
  { family: "Unbounded", weights: [300, 400, 500, 600, 700, 800, 900], category: "display" },
  { family: "Caveat", weights: [400, 500, 600, 700], category: "handwriting" },
  { family: "Dancing Script", weights: [400, 500, 600, 700], category: "handwriting" },
  { family: "Pacifico", weights: [400], category: "handwriting" },
  { family: "Lobster", weights: [400], category: "handwriting" },
  { family: "Great Vibes", weights: [400], category: "handwriting" },
  { family: "JetBrains Mono", weights: [300, 400, 500, 600, 700, 800], category: "mono" },
  { family: "Source Code Pro", weights: [300, 400, 500, 600, 700, 800, 900], category: "mono" },
  { family: "Roboto Mono", weights: [300, 400, 500, 600, 700], category: "mono" },
  { family: "Space Mono", weights: [400, 700], category: "mono" },
  { family: "Inconsolata", weights: [300, 400, 500, 600, 700, 800, 900], category: "mono" },
] as const satisfies readonly GoogleFontSpec[];

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  sans: "Sans serif",
  serif: "Serif",
  display: "Display",
  handwriting: "Handwriting",
  mono: "Monospace",
};

/* -------------------------------- resolution ------------------------------- */

/** A font id resolved to everything the renderer and the pickers need. */
export interface ResolvedFont {
  id: string;
  label: string;
  /** Literal family name — what goes into `ctx.font` and Konva's `fontFamily`. */
  family: string;
  weights: readonly number[];
  category: FontCategory;
  source: FontSource;
}

const LOCAL_LOOKUP = Object.fromEntries(
  CANVAS_FONTS.map((font) => [font.id, font as CanvasFont]),
) as Record<string, CanvasFont>;

const LOCAL_BY_LABEL = new Map(
  CANVAS_FONTS.map((font) => [font.label.toLowerCase(), font as CanvasFont]),
);

const GOOGLE_LOOKUP = new Map<string, GoogleFontSpec>(
  GOOGLE_FONTS.map((font) => [font.family, font as GoogleFontSpec]),
);

/** Weights assumed for a Google family this catalogue no longer lists. */
const UNKNOWN_GOOGLE_WEIGHTS = [400, 700] as const;

function localFont(id: string): ResolvedFont {
  const font = LOCAL_LOOKUP[id] ?? LOCAL_LOOKUP[DEFAULT_FONT_ID];
  return { ...font, source: "local" };
}

/**
 * Everything about a font id, falling back to the default rather than throwing so
 * a stale saved document still renders.
 */
export function resolveFont(id: string): ResolvedFont {
  if (id.startsWith(GOOGLE_FONT_PREFIX)) {
    const family = id.slice(GOOGLE_FONT_PREFIX.length);
    if (!family) return localFont(DEFAULT_FONT_ID);

    const spec = GOOGLE_LOOKUP.get(family);
    return {
      id,
      label: family,
      family,
      weights: spec?.weights ?? UNKNOWN_GOOGLE_WEIGHTS,
      category: spec?.category ?? "sans",
      source: "google",
    };
  }

  return localFont(id);
}

/** The id to store for a family name, preferring a self-hosted face over a fetched one. */
export function fontIdForFamily(family: string): string {
  const local = LOCAL_BY_LABEL.get(family.toLowerCase());
  return local ? local.id : `${GOOGLE_FONT_PREFIX}${family}`;
}

/** Falls back to the default rather than throwing, so a stale saved doc still renders. */
export function resolveFontFamily(id: string): string {
  return resolveFont(id).family;
}

export function fontLabel(id: string): string {
  return resolveFont(id).label;
}

export function fontWeights(id: string): readonly number[] {
  return resolveFont(id).weights;
}

/**
 * Quotes a family name the way Konva's `_getContextFont` does.
 *
 * Preview and export must build byte-identical `ctx.font` strings or they measure
 * differently and break at different words — so anything measuring text by hand
 * has to reproduce Konva's quoting rather than invent its own.
 */
export function quoteFontFamily(family: string): string {
  const hasQuotes = family.includes('"') || family.includes("'");
  return family.includes(" ") && !hasQuotes ? `"${family}"` : family;
}

/**
 * The closest weight a font actually ships to the one asked for.
 *
 * Switching family is not a request to change weight, but the new family may not
 * have the old one — Poppins stops at 700, so an 800 headline has to land
 * somewhere. Snapping keeps the dropdown showing a value it can offer instead of a
 * number that silently renders as something else.
 */
export function nearestWeight(id: string, weight: number): number {
  const weights = resolveFont(id).weights;
  return weights.reduce((best, candidate) =>
    Math.abs(candidate - weight) < Math.abs(best - weight) ? candidate : best,
  );
}

/**
 * The weight a **bold run** paints at: the lightest weight this family offers that
 * is both at least 700 and heavier than the caption's own weight.
 *
 * Bold is relative rather than a fixed 700 because the base weight is already a
 * deliberate choice — bolding a word inside a 700 headline has to reach 800 to read
 * as emphasis at all, and 700 would be a no-op. Where the family has nothing heavier
 * to give (Poppins stops at 700) the base weight comes back unchanged, so the run
 * simply looks the same rather than falling back to a synthesised faux-bold.
 */
export function resolveBoldWeight(id: string, baseWeight: number): number {
  const { weights } = resolveFont(id);

  return (
    weights.find((weight) => weight >= 700 && weight > baseWeight) ??
    [...weights].reverse().find((weight) => weight > baseWeight) ??
    baseWeight
  );
}
