import {
  isTextLayer,
  type Background,
  type EditorDoc,
  type Screen,
} from "@/schemas/editor";

/**
 * Reading and rewriting every colour a document paints.
 *
 * One traversal serves both, which is the point of the module: a "current colours"
 * list built by walking one set of fields and a replace pass walking another would
 * drift the moment a colour is added anywhere, and the failure is a swatch the user
 * clicks Replace on that quietly does nothing.
 */

/**
 * What paints a colour.
 *
 * Carried through the traversal rather than derived afterwards from the hex,
 * because by then the information is gone — two different elements holding the same
 * value are indistinguishable once you only have the value.
 */
export type ColorSource =
  | "background"
  | "title"
  | "subtitle"
  | "highlight"
  | "shadow"
  | "pill";

export const COLOR_SOURCE_LABELS: Record<ColorSource, string> = {
  background: "Background",
  title: "Title",
  subtitle: "Subtitle",
  highlight: "Highlight",
  shadow: "Shadow",
  pill: "Pill",
};

export interface DocColor {
  /** Normalised — lowercase and expanded, so it is safe to use as a key. */
  hex: string;
  /** How many places paint it, for deciding whether a swatch is worth touching. */
  count: number;
  /** Which kinds of element paint it, in the order they were first met. */
  sources: ColorSource[];
}

/**
 * Compares hexes by value rather than by spelling.
 *
 * `#FFF`, `#ffffff` and `#ffffffff` are one colour, and the document holds all three
 * spellings: the schema accepts 3, 4, 6 and 8 digits, templates are hand-written, and
 * react-colorful emits its own case. Matching on the raw string would list the same
 * colour three times and replace only one of them.
 */
export function normalizeHex(hex: string): string {
  const body = hex.trim().toLowerCase().replace(/^#/, "");
  const expanded =
    body.length <= 4
      ? [...body].map((digit) => digit + digit).join("")
      : body;

  // A fully opaque alpha channel says nothing the 6-digit form does not.
  const opaque = expanded.length === 8 && expanded.endsWith("ff");
  return `#${opaque ? expanded.slice(0, 6) : expanded}`;
}

/** Uppercase for display — hex reads as a code, and codes are easier to scan in caps. */
export function formatHex(hex: string): string {
  return hex.toUpperCase();
}

/**
 * Every field of one screen that holds a colour, rewritten through `map`.
 *
 * `map` is handed what kind of element it is looking at as well as the value, which
 * is what lets the panel say "Background · Title" next to a swatch. Deriving that
 * afterwards is not possible: once a colour is just a hex, the two elements holding
 * it are indistinguishable.
 *
 * Returns the screen unchanged — same reference — when `map` changed nothing, which
 * is what keeps a replace that misses a screen from re-rendering its Stage.
 */
function mapScreenColors(
  screen: Screen,
  map: (hex: string, source: ColorSource) => string,
): Screen {
  let changed = false;

  const swap = (hex: string, source: ColorSource) => {
    const next = map(hex, source);
    if (next !== hex) changed = true;
    return next;
  };

  const background: Background =
    screen.background.type === "color"
      ? { ...screen.background, color: swap(screen.background.color, "background") }
      : screen.background.type === "gradient"
        ? {
            ...screen.background,
            stops: screen.background.stops.map((stop) => ({
              ...stop,
              color: swap(stop.color, "background"),
            })),
          }
        : screen.background;

  const layers = screen.layers.map((layer) => {
    // Device colourways are catalogue entries rather than document colours: the
    // frame's finish is a material, not a hex, and swapping it here would mean
    // inventing a colourway the renderer has no geometry for.
    if (!isTextLayer(layer)) return layer;

    // A run's own colour is still the caption's type colour, so it reports as the
    // layer's role; a highlight is a different thing sitting behind the words.
    const role: ColorSource = layer.role === "title" ? "title" : "subtitle";

    return {
      ...layer,
      color: swap(layer.color, role),
      shadow: layer.shadow
        ? { ...layer.shadow, color: swap(layer.shadow.color, "shadow") }
        : null,
      background: layer.background
        ? { ...layer.background, color: swap(layer.background.color, "pill") }
        : null,
      runs: layer.runs.map((run) => ({
        ...run,
        color: run.color ? swap(run.color, role) : run.color,
        highlight: run.highlight ? swap(run.highlight, "highlight") : run.highlight,
      })),
    };
  });

  return changed ? { ...screen, background, layers } : screen;
}

/**
 * The document's colours, in the order they are first painted.
 *
 * Pinned screens are skipped, because they are skipped by the replace too — listing
 * a colour that only a pinned screen uses would offer the user a swatch that cannot
 * move.
 */
export function collectDocColors(doc: EditorDoc): DocColor[] {
  const found = new Map<string, { count: number; sources: Set<ColorSource> }>();

  for (const screen of doc.screens) {
    if (screen.pinned) continue;

    mapScreenColors(screen, (hex, source) => {
      const key = normalizeHex(hex);
      const entry = found.get(key) ?? { count: 0, sources: new Set<ColorSource>() };
      entry.count += 1;
      entry.sources.add(source);
      found.set(key, entry);
      return hex;
    });
  }

  return [...found].map(([hex, entry]) => ({
    hex,
    count: entry.count,
    sources: [...entry.sources],
  }));
}

/** "Background · Title" — what a swatch is used for, for the row beneath the hex. */
export function describeSources(sources: readonly ColorSource[]): string {
  return sources.map((source) => COLOR_SOURCE_LABELS[source]).join(" · ");
}

/** Every use of one colour, across every unpinned screen, becomes another. */
export function replaceDocColor(
  doc: EditorDoc,
  from: string,
  to: string,
): EditorDoc {
  const target = normalizeHex(from);
  const next = normalizeHex(to);
  if (target === next) return doc;

  const screens = doc.screens.map((screen) =>
    screen.pinned
      ? screen
      : mapScreenColors(screen, (hex) => (normalizeHex(hex) === target ? to : hex)),
  );

  return screens.every((screen, index) => screen === doc.screens[index])
    ? doc
    : { ...doc, screens };
}
