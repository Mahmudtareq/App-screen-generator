/**
 * Translating between the document's run array and the tiptap document the caption
 * editor works in.
 *
 * These are two views of the same copy, kept deliberately far apart. Runs are flat
 * and renderable — one array the canvas layout walks in order, with `\n` as the only
 * structure. A ProseMirror document is a tree of paragraphs carrying marks, which is
 * what makes a text editor tractable and what makes it the wrong thing to persist:
 * storing it would put an editor's internal schema in `Project.doc` and hand every
 * future migration a tree to walk.
 *
 * So the boundary is here, and it is lossy on purpose. Only the marks a run can
 * carry survive the trip back; anything a paste drags in — headings, lists, links,
 * font sizes — arrives as plain text, which is the correct outcome for a caption
 * that has exactly one font size and one alignment.
 */

import type { JSONContent } from "@tiptap/react";

import {
  MAX_RUN_LENGTH,
  MAX_TEXT_RUNS,
  PLAIN_RUN,
  type TextRun,
} from "@/schemas/editor";

/** The runs as a ProseMirror document, one paragraph per `\n`. */
export function runsToDoc(runs: readonly TextRun[]): JSONContent {
  const paragraphs: JSONContent[][] = [[]];

  for (const run of runs) {
    const marks = marksOf(run);

    run.text.split("\n").forEach((piece, index) => {
      if (index > 0) paragraphs.push([]);
      if (!piece) return;
      paragraphs[paragraphs.length - 1].push({ type: "text", text: piece, marks });
    });
  }

  return {
    type: "doc",
    // An empty paragraph must omit `content` entirely — ProseMirror rejects the
    // empty array, and a caption always has at least one line to type into.
    content: paragraphs.map((content) =>
      content.length ? { type: "paragraph", content } : { type: "paragraph" },
    ),
  };
}

/** The document as runs, normalised to something the schema will accept. */
export function docToRuns(doc: JSONContent): TextRun[] {
  const runs: TextRun[] = [];

  (doc.content ?? []).forEach((paragraph, index) => {
    // The paragraph break itself, carried on the run before it rather than as a run
    // of its own — that is the shape `runsToDoc` splits back apart, and it keeps a
    // multi-line caption from spending half its run budget on newlines.
    if (index > 0) {
      const last = runs[runs.length - 1];
      if (last) last.text += "\n";
      else runs.push({ ...PLAIN_RUN, text: "\n" });
    }

    for (const node of paragraph.content ?? []) {
      if (node.type !== "text" || !node.text) continue;
      runs.push(runOf(node));
    }
  });

  return normalizeRuns(runs);
}

/**
 * Coalesce, then clamp.
 *
 * Editing produces adjacent runs that differ in nothing — selecting a word, bolding
 * it and unbolding it leaves three where one belongs — and left alone they would eat
 * the run budget for no visible reason. Merging first means the cap below is only
 * ever reached by copy that genuinely has that many styles.
 */
export function normalizeRuns(runs: readonly TextRun[]): TextRun[] {
  const merged: TextRun[] = [];

  for (const run of runs) {
    if (!run.text) continue;
    const last = merged[merged.length - 1];

    if (last && sameStyle(last, run) && last.text.length + run.text.length <= MAX_RUN_LENGTH) {
      last.text += run.text;
      continue;
    }

    merged.push({ ...run, text: run.text.slice(0, MAX_RUN_LENGTH) });
  }

  if (merged.length <= MAX_TEXT_RUNS) return merged;

  /*
   * Past the cap, styling is what gets dropped rather than words. Losing the run
   * array's tail would silently delete copy someone typed; flattening it costs them
   * the colours on text far beyond anything a store screenshot holds, and leaves the
   * sentence intact.
   */
  const kept = merged.slice(0, MAX_TEXT_RUNS - 1);
  const flattened = merged
    .slice(MAX_TEXT_RUNS - 1)
    .map((run) => run.text)
    .join("");

  kept.push({ ...PLAIN_RUN, text: flattened.slice(0, MAX_RUN_LENGTH) });
  return kept;
}

function sameStyle(a: TextRun, b: TextRun): boolean {
  return (
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.uppercase === b.uppercase &&
    a.color === b.color &&
    a.highlight === b.highlight
  );
}

function marksOf(run: TextRun): JSONContent["marks"] {
  const marks: NonNullable<JSONContent["marks"]> = [];

  if (run.bold) marks.push({ type: "bold" });
  if (run.italic) marks.push({ type: "italic" });
  if (run.underline) marks.push({ type: "underline" });
  if (run.uppercase) marks.push({ type: "uppercase" });
  if (run.color) marks.push({ type: "textStyle", attrs: { color: run.color } });
  if (run.highlight) marks.push({ type: "highlight", attrs: { color: run.highlight } });

  return marks;
}

function runOf(node: JSONContent): TextRun {
  const marks = node.marks ?? [];
  const has = (type: string) => marks.some((mark) => mark.type === type);
  const attr = (type: string, key: string) =>
    marks.find((mark) => mark.type === type)?.attrs?.[key];

  return {
    text: node.text ?? "",
    bold: has("bold"),
    italic: has("italic"),
    underline: has("underline"),
    uppercase: has("uppercase"),
    color: toHex(attr("textStyle", "color")),
    highlight: toHex(attr("highlight", "color")),
  };
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i;

/**
 * A colour the document's schema will accept, or nothing.
 *
 * The picker only ever produces hex, but a paste from a browser or a design tool
 * arrives as `rgb(...)` or a named colour, and a single unparseable value in the
 * document fails `hexColorSchema` — which does not surface as a bad colour, it
 * surfaces as the whole draft failing to load. Falling back to inherited colour is
 * the visible, recoverable failure.
 */
function toHex(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (HEX.test(trimmed)) return trimmed.toLowerCase();

  const rgb = RGB.exec(trimmed);
  if (!rgb) return null;

  const channel = (raw: string) =>
    Math.max(0, Math.min(255, Math.round(Number(raw))))
      .toString(16)
      .padStart(2, "0");

  return `#${channel(rgb[1])}${channel(rgb[2])}${channel(rgb[3])}`;
}
