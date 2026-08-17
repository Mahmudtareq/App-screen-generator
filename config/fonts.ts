/**
 * Fonts available to text layers on the canvas.
 *
 * This is deliberately separate from the app's own UI font. `next/font/google`
 * generates a mangled family name (`__Inter_a1b2c3`) that it only exposes through
 * a CSS custom property, and `ctx.font` — which is how Konva measures and paints
 * text — does not resolve CSS variables. Passing `var(--font-sans)` to a Konva
 * Text node fails silently and falls back to the default sans-serif, so canvas
 * fonts get literal family names declared by hand in app/globals.css instead.
 *
 * The `Canvas` suffix on each family keeps these names from ever colliding with a
 * next/font-generated one.
 */

export interface CanvasFont {
  id: string;
  label: string;
  /** Literal family name, matching the @font-face rule in app/globals.css. */
  family: string;
  /** Weights the editor offers. Variable files cover the whole range. */
  weights: readonly number[];
  category: "sans" | "serif";
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

export const CANVAS_FONT_IDS = CANVAS_FONTS.map((f) => f.id) as [
  CanvasFontId,
  ...CanvasFontId[],
];

export const DEFAULT_FONT_ID: CanvasFontId = "inter";

const FONT_LOOKUP = Object.fromEntries(
  CANVAS_FONTS.map((f) => [f.id, f as CanvasFont]),
) as Record<CanvasFontId, CanvasFont>;

export function getCanvasFont(id: CanvasFontId): CanvasFont {
  return FONT_LOOKUP[id];
}

/** Falls back to the default rather than throwing, so a stale saved doc still renders. */
export function resolveFontFamily(id: string): string {
  return (FONT_LOOKUP[id as CanvasFontId] ?? FONT_LOOKUP[DEFAULT_FONT_ID]).family;
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
  const { weights } = FONT_LOOKUP[id as CanvasFontId] ?? FONT_LOOKUP[DEFAULT_FONT_ID];

  return (
    weights.find((weight) => weight >= 700 && weight > baseWeight) ??
    [...weights].reverse().find((weight) => weight > baseWeight) ??
    baseWeight
  );
}
