/**
 * Laying a text layer's styled runs out into positioned fragments.
 *
 * A Konva `Text` node paints exactly one style, so a caption with a bold word or a
 * highlighted phrase has to be *several* nodes — which means the wrap points, the x
 * of every fragment and the width of the widest line stop being Konva's job and
 * become ours. Doing that here rather than inside the component is what keeps
 * preview and export identical: both render from this one layout, so a line that
 * breaks after "your" on screen breaks there in the PNG.
 *
 * Widths come from the same formula Konva's own `Text._getTextWidth` uses —
 * `measureText(...).width + letterSpacing * length`, measured with the same
 * `"<style> normal <size>px <family>"` font string — so a fragment placed at x is
 * exactly where Konva then draws it. The one place that formula is approximate is
 * Konva's too: with letter spacing on, Konva paints character by character, so
 * kerning between adjacent glyphs is lost from the drawing but not from the
 * measurement. Sub-pixel, and identical in preview and export.
 *
 * Style resolution is *additive*. The layer carries the caption's own font, size,
 * colour, italic and underline; a run can only add to them — bold goes heavier than
 * the base weight, italic and underline turn on but never off, and colour overrides
 * where it is set and inherits where it is null. That asymmetry is what lets the
 * layer-level controls keep meaning "the whole caption" after a word has been
 * styled by hand.
 */

import {
  quoteFontFamily,
  resolveBoldWeight,
  resolveFontFamily,
} from "@/config/fonts";
import type { TextLayer } from "@/schemas/editor";

/** One stretch of one run on one line — a single Konva `Text` node. */
export interface RichTextFragment {
  /** Stable within a layout; fragments are positional, so this is their identity. */
  key: string;
  text: string;
  /** Group-local x, alignment already applied. */
  x: number;
  /**
   * Group-local y for the node's own single-line box, already corrected so this
   * fragment's baseline matches the rest of its line.
   */
  y: number;
  width: number;
  /** Top of the line box this fragment sits on — where its highlight starts. */
  lineTop: number;
  /** Konva `fontStyle`, e.g. `"italic 700"`. */
  fontStyle: string;
  textDecoration: string;
  fill: string;
  highlight: string | null;
}

export interface RichTextLayout {
  fragments: RichTextFragment[];
  lineCount: number;
  lineHeightPx: number;
  /** The widest line, capped at the wrap width — what a background pill hugs. */
  width: number;
  height: number;
}

/** A run's resolved paint, shared by every fragment that comes from it. */
interface RunStyle {
  fontStyle: string;
  /** The CSS font shorthand used to measure it. */
  font: string;
  textDecoration: string;
  fill: string;
  highlight: string | null;
}

/** A word or a whitespace gap, still tied to the run it came from. */
interface Token {
  runIndex: number;
  text: string;
  space: boolean;
}

/** A maximal same-run stretch of a line, which is what becomes one fragment. */
interface Stretch {
  runIndex: number;
  text: string;
}

/**
 * User-perceived characters, not UTF-16 units.
 *
 * An emoji is two units, a skin tone is four, and a ZWJ family is eleven — so
 * `String.length` over-counts them and `slice` can cut one in half. Both matter here:
 * letter spacing is added *per character* and has to agree with what Konva advances
 * by when it paints (it does its own grapheme clustering for exactly this reason),
 * and the mid-word break below would otherwise leave half a surrogate pair on each
 * line. `Intl.Segmenter` is the standard answer and is better at it than Konva's
 * regex; the fallback is code points, which is still never mid-pair.
 */
const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function graphemes(text: string): string[] {
  if (!segmenter) return Array.from(text);
  return Array.from(segmenter.segment(text), (entry) => entry.segment);
}

let sharedContext: CanvasRenderingContext2D | null = null;

/**
 * One canvas for every measurement in the app.
 *
 * Konva does the same thing with its dummy context, and for the same reason:
 * `measureText` needs a context but nothing here ever draws, so allocating a
 * canvas per layout would churn GPU memory for no benefit.
 */
function measureContext(): CanvasRenderingContext2D {
  if (!sharedContext) {
    const context = document.createElement("canvas").getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");
    sharedContext = context;
  }
  return sharedContext;
}

export function layoutRichText(layer: TextLayer): RichTextLayout {
  // Quoted exactly as Konva quotes it. Konva builds its own `ctx.font` from the
  // node's `fontFamily`, and a family measured here as `Open Sans` but painted
  // there as `"Open Sans"` is two different font strings — which is the whole
  // class of bug this layout pass exists to prevent.
  const family = quoteFontFamily(resolveFontFamily(layer.fontId));
  const boldWeight = resolveBoldWeight(layer.fontId, layer.fontWeight);
  const lineHeightPx = layer.lineHeight * layer.fontSize;
  // A zero-width box would divide by nothing and wrap every character forever.
  const maxWidth = Math.max(layer.width, 1);

  const contextFont = (fontStyle: string) =>
    // Konva's `_getContextFont`, reproduced: font-style, font-weight and
    // font-variant are order-independent in the CSS `font` shorthand, which is why
    // this parses despite the weight preceding `normal`.
    `${fontStyle} normal ${layer.fontSize}px ${family}`;

  const styles: RunStyle[] = layer.runs.map((run) => {
    const italic = layer.italic || run.italic;
    const fontStyle = `${italic ? "italic " : ""}${run.bold ? boldWeight : layer.fontWeight}`;

    return {
      fontStyle,
      font: contextFont(fontStyle),
      textDecoration: layer.underline || run.underline ? "underline" : "",
      fill: run.color ?? layer.color,
      highlight: run.highlight,
    };
  });

  const measure = (text: string, runIndex: number) => {
    if (!text) return 0;
    const context = measureContext();
    context.font = styles[runIndex].font;
    const width = context.measureText(text).width;
    // Segmenting is skipped entirely at zero spacing, which is both the default and
    // the case where the count could not change the answer.
    return layer.letterSpacing
      ? width + layer.letterSpacing * graphemes(text).length
      : width;
  };

  const widthOf = (stretches: readonly Stretch[]) =>
    stretches.reduce((total, stretch) => total + measure(stretch.text, stretch.runIndex), 0);

  const lines = wrap(tokenize(layer), maxWidth, widthOf);

  /*
   * Konva places a line's baseline at `(ascent - descent) / 2 + lineHeight / 2`
   * below the node's top, measured from the font actually in use. Those metrics can
   * differ between two weights of the same family — Poppins ships 400 and 700 as
   * separate files — so fragments that share a line but not a weight would sit on
   * baselines a fraction apart, which on a mixed-weight headline reads as the bold
   * word having slipped. Shifting each fragment by the difference against the
   * caption's own style puts them all back on one baseline, and costs nothing when
   * the metrics agree, which is the usual case for a variable font.
   */
  const halfMetrics = new Map<string, number>();
  const halfMetric = (font: string) => {
    const cached = halfMetrics.get(font);
    if (cached !== undefined) return cached;

    const context = measureContext();
    context.font = font;
    const metrics = context.measureText("M");
    const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
    const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
    // Undefined on a browser without the box metrics: no correction is safer than
    // a wrong one, and every fragment falls back together.
    const value = ascent === undefined || descent === undefined ? 0 : (ascent - descent) / 2;

    halfMetrics.set(font, value);
    return value;
  };

  const baseFontStyle = `${layer.italic ? "italic " : ""}${layer.fontWeight}`;
  const baseline = halfMetric(contextFont(baseFontStyle));

  const fragments: RichTextFragment[] = [];
  let widest = 0;

  lines.forEach((stretches, lineIndex) => {
    const widths = stretches.map((stretch) => measure(stretch.text, stretch.runIndex));
    const lineWidth = widths.reduce((total, width) => total + width, 0);
    widest = Math.max(widest, lineWidth);

    const lineTop = lineIndex * lineHeightPx;
    let x =
      layer.align === "center"
        ? (layer.width - lineWidth) / 2
        : layer.align === "right"
          ? layer.width - lineWidth
          : 0;

    stretches.forEach((stretch, index) => {
      const style = styles[stretch.runIndex];

      fragments.push({
        key: `${lineIndex}:${index}`,
        text: stretch.text,
        x,
        y: lineTop + baseline - halfMetric(style.font),
        width: widths[index],
        lineTop,
        fontStyle: style.fontStyle,
        textDecoration: style.textDecoration,
        fill: style.fill,
        highlight: style.highlight,
      });

      x += widths[index];
    });
  });

  return {
    fragments,
    lineCount: lines.length,
    lineHeightPx,
    width: Math.min(widest, layer.width),
    height: lines.length * lineHeightPx,
  };
}

/**
 * The runs as paragraphs of words and gaps.
 *
 * `\n` inside a run's text is a hard break, so it splits the paragraph the run is
 * in rather than ending the run — which is what lets a single styled run span
 * several lines of a headline.
 */
function tokenize(layer: TextLayer): Token[][] {
  const paragraphs: Token[][] = [[]];

  layer.runs.forEach((run, runIndex) => {
    // Konva has no text-transform, so casing is applied to the string. The document
    // keeps the original, which is what makes the toggle lossless — and it is applied
    // here rather than at paint time because upper-casing changes how wide a word
    // measures, so it has to happen before anything decides where the line breaks.
    const text = layer.uppercase || run.uppercase ? run.text.toUpperCase() : run.text;

    text.split("\n").forEach((paragraph, index) => {
      if (index > 0) paragraphs.push([]);
      const current = paragraphs[paragraphs.length - 1];

      for (const piece of paragraph.split(/(\s+)/)) {
        if (piece) current.push({ runIndex, text: piece, space: /\s/.test(piece) });
      }
    });
  });

  return paragraphs;
}

/**
 * Greedy word wrap, measuring the candidate line as the same same-run stretches it
 * will finally be drawn as.
 *
 * Measuring stretches rather than individual words matters: a fragment's width is
 * `measureText` over its whole string, and the sum of its words' widths is not the
 * same number once kerning is involved. Deciding the break with one figure and
 * drawing with another is how a line ends up a pixel outside the box it was
 * measured to fit.
 */
function wrap(
  paragraphs: readonly Token[][],
  maxWidth: number,
  widthOf: (stretches: readonly Stretch[]) => number,
): Stretch[][] {
  const lines: Stretch[][] = [];

  for (const tokens of paragraphs) {
    let line: Stretch[] = [];
    // Gaps only earn their width once a word follows them on the same line; held
    // back like this, a wrap drops them instead of indenting the line below.
    let pending: Token[] = [];

    for (const token of tokens) {
      if (token.space) {
        if (line.length) pending.push(token);
        continue;
      }

      let rest = token.text;

      while (rest) {
        const candidate = line.map((stretch) => ({ ...stretch }));
        for (const gap of pending) append(candidate, gap.runIndex, gap.text);
        append(candidate, token.runIndex, rest);

        if (widthOf(candidate) <= maxWidth) {
          line = candidate;
          pending = [];
          break;
        }

        // Anything already on the line means there is somewhere to push this word
        // to; retry it against a fresh line rather than breaking it.
        if (line.length) {
          lines.push(line);
          line = [];
          pending = [];
          continue;
        }

        // A single word wider than the whole box. Breaking it mid-word is ugly, but
        // it is the only alternative to painting outside the artboard.
        const fitted = longestPrefix(rest, token.runIndex, maxWidth, widthOf);
        lines.push([{ runIndex: token.runIndex, text: fitted }]);
        rest = rest.slice(fitted.length);
      }
    }

    // Pushed even when empty: a blank paragraph is a blank line, not nothing.
    lines.push(line);
  }

  return lines;
}

/** Adds text to the trailing stretch, or starts one when the run changes. */
function append(stretches: Stretch[], runIndex: number, text: string): void {
  const last = stretches[stretches.length - 1];
  if (last && last.runIndex === runIndex) last.text += text;
  else stretches.push({ runIndex, text });
}

/** The longest prefix that fits, never shorter than one character. */
function longestPrefix(
  text: string,
  runIndex: number,
  maxWidth: number,
  widthOf: (stretches: readonly Stretch[]) => number,
): string {
  const units = graphemes(text);
  let fitted = units[0];

  for (let count = 2; count <= units.length; count++) {
    const candidate = units.slice(0, count).join("");
    if (widthOf([{ runIndex, text: candidate }]) > maxWidth) break;
    fitted = candidate;
  }

  return fitted;
}
