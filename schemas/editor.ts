import { z } from "zod";

import { ARTBOARD_MAX, ARTBOARD_MIN } from "@/config/artboards";
import { DEFAULT_FONT_ID } from "@/config/fonts";
import { DEFAULT_TEMPLATE_ID, MAX_SCREENS, TEMPLATE_IDS } from "@/config/templates";
import { DEFAULT_DEVICE_ID, DEVICE_IDS } from "@/lib/devices/catalog";

/**
 * The editor document — the single contract shared by the Zustand store, the
 * server actions, and the Mongoose `Project.doc` subschema.
 *
 * The store's `document` slice serialises to exactly this shape, so saving is
 * `updateProject(id, doc)` with no field mapping in between.
 *
 * A document is a *set of screens*, because that is what an app store listing is:
 * five or so frames that share a device and a canvas size and differ only in
 * their artwork and copy. Device model, orientation and artboard therefore live at
 * the document level — changing the target size has to move all five frames at
 * once or the set stops being a set.
 *
 * Within a screen, content is an **ordered layer array** rather than named slots:
 * `layers[0]` paints first and is furthest back, and the last entry is on top.
 * That ordering is the whole reason the array exists — the alternative, fixed
 * slots with a hardcoded z-order, cannot express two images stacked either side
 * of the device, which is the most common thing anyone wants to do to a mockup.
 * The background is not a layer; it is always behind every layer and is the one
 * thing the export pipeline needs to hide on its own.
 */

export const EDITOR_DOC_VERSION = 6;

const hexColorSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    "Must be a hex colour, e.g. #1e293b",
  );

/**
 * A URL that is safe to persist.
 *
 * Rejecting anything but https is what makes the "upload before save" step
 * impossible to skip: an anonymous draft renders from an object URL, and trying
 * to save it before the Cloudinary upload has patched in a real URL fails
 * validation loudly instead of writing a URL that is dead on next page load.
 *
 * Every image URL in the document is *nullable* rather than defaulting to an
 * empty string. An empty string is not a valid URL, so a document holding one
 * fails its own schema — which silently drops a whole localStorage draft on
 * reload when a layer exists but its upload has not happened yet.
 */
export const assetUrlSchema = z
  .string()
  .min(1)
  .refine((v) => /^https:\/\//i.test(v), {
    message:
      "Only uploaded https URLs can be saved — this asset has not finished uploading.",
  });

const objectIdStringSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, "Not a valid id");

export const orientationSchema = z.enum(["portrait", "landscape"]);

export const artboardSchema = z.object({
  width: z.number().int().min(ARTBOARD_MIN).max(ARTBOARD_MAX),
  height: z.number().int().min(ARTBOARD_MIN).max(ARTBOARD_MAX),
  preset: z.string().nullable().default(null),
});

const gradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: hexColorSchema,
});

export const backgroundSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("transparent"),
  }),
  z.object({
    type: z.literal("color"),
    color: hexColorSchema,
  }),
  z.object({
    type: z.literal("gradient"),
    angle: z.number().min(0).max(360),
    stops: z.array(gradientStopSchema).min(2).max(8),
  }),
  z.object({
    type: z.literal("image"),
    assetId: objectIdStringSchema.nullable().default(null),
    url: assetUrlSchema.nullable().default(null),
    fit: z.enum(["cover", "contain"]).default("cover"),
    blur: z.number().min(0).max(100).default(0),
    opacity: z.number().min(0).max(1).default(1),
  }),
]);

/** The screenshot shown inside a device layer's screen cut-out. */
export const screenshotSchema = z.object({
  assetId: objectIdStringSchema.nullable().default(null),
  url: assetUrlSchema.nullable().default(null),
  /** >= 1. Zooms into the cover-cropped region rather than scaling the node. */
  zoom: z.number().min(1).max(4).default(1),
  /** Each axis in -1..1, as a fraction of the crop slack. */
  pan: z
    .object({ x: z.number().min(-1).max(1), y: z.number().min(-1).max(1) })
    .default({ x: 0, y: 0 }),
});

/** Drop shadow, for captions sitting over a busy background image. */
export const textShadowSchema = z.object({
  color: hexColorSchema,
  blur: z.number().min(0).max(200).default(12),
  offsetX: z.number().min(-200).max(200).default(0),
  offsetY: z.number().min(-200).max(200).default(4),
  opacity: z.number().min(0).max(1).default(0.35),
});

/**
 * Filled pill drawn behind a text layer.
 *
 * Sized from the text's measured bounds at render time rather than stored, so it
 * keeps hugging the copy as the wording, font or size changes.
 */
export const textBackgroundSchema = z.object({
  color: hexColorSchema,
  opacity: z.number().min(0).max(1).default(1),
  paddingX: z.number().min(0).max(400).default(28),
  paddingY: z.number().min(0).max(400).default(14),
  cornerRadius: z.number().min(0).max(999).default(999),
});

/**
 * Fields every layer carries, whatever its kind.
 *
 * Spread into each member of the union rather than composed with `.extend()`, so
 * the members stay plain object schemas — `z.discriminatedUnion` needs to read the
 * discriminator off each one directly.
 *
 * `id` is only unique within its screen, which is all that is required: each
 * screen renders into its own Konva Stage, and a Stage is the scope `findOne("#id")`
 * searches. That is what lets the layer id double as the canvas node id with no
 * screen prefix and no lookup table.
 */
const layerBaseFields = {
  id: z.string().min(1).max(64),
  /** User-facing label. Empty means "derive it from the kind". */
  name: z.string().max(60).default(""),
  visible: z.boolean().default(true),
  /** Locked layers still render but cannot be selected or dragged on canvas. */
  locked: z.boolean().default(false),
  opacity: z.number().min(0).max(1).default(1),
};

export const deviceLayerSchema = z.object({
  ...layerBaseFields,
  kind: z.literal("device"),
  colorwayId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  /** Uniform scale from device px into artboard px. */
  scale: z.number().min(0.01).max(20),
  rotation: z.number().min(-360).max(360).default(0),
  shadowEnabled: z.boolean().default(true),
  screenshot: screenshotSchema,
});

/**
 * How the bitmap sits inside the layer's box.
 *
 * The box is the thing the user drags and the Transformer measures; the bitmap has
 * an aspect ratio of its own that need not match it. `contain` is the default
 * because it is the only one that can never distort artwork — a stretched logo is
 * the kind of mistake that ships.
 */
export const imageFitSchema = z.enum(["contain", "cover", "fill"]);

/** Where a `contain`ed image sits, or which part of a `cover`ed one survives. */
export const imageAlignSchema = z.enum(["top", "center", "bottom"]);

/**
 * A colour painted over the image's own pixels, transparency respected.
 *
 * Kept as colour *plus strength* rather than a bare hex, because the two ends of the
 * range are both wanted: at 1 a transparent logo becomes a flat silhouette in the
 * brand colour, and at 0.3 a photo takes on a wash without losing its subject.
 */
export const imageTintSchema = z.object({
  color: hexColorSchema,
  strength: z.number().min(0).max(1).default(1),
});

export const imageLayerSchema = z.object({
  ...layerBaseFields,
  kind: z.literal("image"),
  assetId: objectIdStringSchema.nullable().default(null),
  url: assetUrlSchema.nullable().default(null),
  x: z.number(),
  y: z.number(),
  width: z.number().min(1).max(ARTBOARD_MAX),
  height: z.number().min(1).max(ARTBOARD_MAX),
  rotation: z.number().min(-360).max(360).default(0),
  cornerRadius: z.number().min(0).default(0),
  fit: imageFitSchema.default("contain"),
  /** Vertical only: horizontal stays centred, which is what a badge or logo wants. */
  align: imageAlignSchema.default("center"),
  tint: imageTintSchema.nullable().default(null),
});

/**
 * One stretch of text sharing a style — the unit that makes "colour just this word"
 * possible.
 *
 * Only the properties that can vary *within* a line live here. Font family and size
 * stay on the layer, which is a deliberate limit rather than an oversight: uniform
 * size means every line has one baseline and one line height, which is what keeps the
 * layout pass in `lib/canvas/rich-text.ts` tractable and its wrap points identical
 * between preview and export.
 *
 * `null` means "inherit from the layer" for colour, and "none" for highlight, so a
 * run carrying no overrides round-trips through the editor unchanged.
 */
/**
 * Caps on the run array.
 *
 * Exported because the editor has to *enforce* them rather than discover them:
 * a document that fails its own schema is dropped whole on reload, so the
 * tiptap-to-runs conversion coalesces and truncates against these numbers instead
 * of handing zod something it will reject.
 */
export const MAX_TEXT_RUNS = 64;
export const MAX_RUN_LENGTH = 2000;

export const textRunSchema = z.object({
  text: z.string().max(MAX_RUN_LENGTH),
  bold: z.boolean().default(false),
  italic: z.boolean().default(false),
  underline: z.boolean().default(false),
  /**
   * Casing, per run, so a headline can shout one word.
   *
   * The layer keeps a flag of the same name for the whole caption; the two are
   * OR-ed at render time like italic and underline. Casing is a run property at
   * all — rather than something applied to the finished string — because Konva has
   * no `text-transform` and the document has to keep the original either way.
   */
  uppercase: z.boolean().default(false),
  color: hexColorSchema.nullable().default(null),
  highlight: hexColorSchema.nullable().default(null),
});

export const textLayerSchema = z.object({
  ...layerBaseFields,
  kind: z.literal("text"),
  /** Drives default size and placement only; it is not a style lock. */
  role: z.enum(["title", "body"]),
  /**
   * The copy, as styled runs. A plain caption is a single run; `\n` inside a run's
   * text is a hard line break.
   */
  runs: z.array(textRunSchema).max(MAX_TEXT_RUNS).default([]),
  /**
   * Which font paints the copy — a built-in id, or `google:<Family>`.
   *
   * A free string rather than an enum of the self-hosted four: the Google catalogue
   * in `config/fonts.ts` is a curated list that will change, and a document naming
   * a family that has since left it must still parse. `resolveFont` falls back to
   * the default rather than throwing, so an unresolvable id costs a face, not a
   * whole document.
   */
  fontId: z.string().min(1).max(64).default(DEFAULT_FONT_ID),
  /** Artboard px — the same unit as x/y, so inspector controls need no conversion. */
  fontSize: z.number().min(1).max(1024),
  fontWeight: z.number().int().min(100).max(900).default(400),
  italic: z.boolean().default(false),
  underline: z.boolean().default(false),
  /** Konva has no text-transform, so this is applied to the string at render time. */
  uppercase: z.boolean().default(false),
  color: hexColorSchema,
  shadow: textShadowSchema.nullable().default(null),
  background: textBackgroundSchema.nullable().default(null),
  align: z.enum(["left", "center", "right"]).default("left"),
  x: z.number(),
  y: z.number(),
  /** Fixed box width; Konva wraps text inside it. */
  width: z.number().min(1).max(ARTBOARD_MAX),
  rotation: z.number().min(-360).max(360).default(0),
  lineHeight: z.number().min(0.5).max(4).default(1.2),
  letterSpacing: z.number().min(-50).max(200).default(0),
});

export const screenLayerSchema = z.discriminatedUnion("kind", [
  deviceLayerSchema,
  imageLayerSchema,
  textLayerSchema,
]);

export const screenSchema = z.object({
  id: z.string().min(1).max(64),
  /** Empty means "call it Screen N", numbered by position rather than stored. */
  name: z.string().max(60).default(""),
  /**
   * Pinned screens are skipped by anything that writes across the whole set —
   * "apply background to all", template swap, artboard retarget. It is the opt-out
   * for the one frame in five that has been hand-tuned.
   */
  pinned: z.boolean().default(false),
  background: backgroundSchema,
  /** Index 0 paints first and sits at the back. */
  layers: z.array(screenLayerSchema).max(24).default([]),
});

export const editorDocSchema = z.object({
  version: z.number().int().min(1).default(EDITOR_DOC_VERSION),
  /** Which template the project started from; kept so the picker can show it. */
  templateId: z.enum(TEMPLATE_IDS).default(DEFAULT_TEMPLATE_ID),
  deviceId: z.enum(DEVICE_IDS).default(DEFAULT_DEVICE_ID),
  orientation: orientationSchema.default("portrait"),
  artboard: artboardSchema,
  screens: z.array(screenSchema).min(1).max(MAX_SCREENS),
});

export type EditorDoc = z.infer<typeof editorDocSchema>;
export type Screen = z.infer<typeof screenSchema>;
export type ScreenLayer = z.infer<typeof screenLayerSchema>;
export type LayerKind = ScreenLayer["kind"];
export type DeviceLayer = z.infer<typeof deviceLayerSchema>;
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type ImageFit = z.infer<typeof imageFitSchema>;
export type ImageAlign = z.infer<typeof imageAlignSchema>;
export type ImageTint = z.infer<typeof imageTintSchema>;
export type TextLayer = z.infer<typeof textLayerSchema>;
export type TextRun = z.infer<typeof textRunSchema>;
export type Artboard = z.infer<typeof artboardSchema>;
export type Background = z.infer<typeof backgroundSchema>;
export type BackgroundType = Background["type"];
export type ScreenshotState = z.infer<typeof screenshotSchema>;
export type TextRole = TextLayer["role"];
export type TextShadow = z.infer<typeof textShadowSchema>;
export type TextBackground = z.infer<typeof textBackgroundSchema>;

/* --------------------------------- helpers -------------------------------- */

/** Narrowing helpers, so callers never hand-write `l.kind === "device"` chains. */
export function isDeviceLayer(layer: ScreenLayer): layer is DeviceLayer {
  return layer.kind === "device";
}

export function isImageLayer(layer: ScreenLayer): layer is ImageLayer {
  return layer.kind === "image";
}

export function isTextLayer(layer: ScreenLayer): layer is TextLayer {
  return layer.kind === "text";
}

const KIND_LABELS: Record<LayerKind, string> = {
  device: "Device",
  image: "Image",
  text: "Text",
};

/**
 * What the layer list shows for a layer.
 *
 * Derived rather than required, so a layer created by a template or a migration
 * does not have to invent a name — and renaming stays purely cosmetic.
 */
export function layerLabel(layer: ScreenLayer): string {
  if (layer.name) return layer.name;
  if (isTextLayer(layer)) {
    return layer.role === "title" ? "Title" : "Subtitle";
  }
  return KIND_LABELS[layer.kind];
}

/** Screen name for the strip, falling back to its 1-based position. */
export function screenLabel(screen: Screen, index: number): string {
  return screen.name || `Screen ${index + 1}`;
}

/* -------------------------------- text runs -------------------------------- */

/** A run carrying no styling of its own — what a plain string becomes. */
export const PLAIN_RUN: Omit<TextRun, "text"> = {
  bold: false,
  italic: false,
  underline: false,
  uppercase: false,
  color: null,
  highlight: null,
};

/** A single unstyled run — the shape a plain string becomes. */
export function plainTextToRuns(text: string): TextRun[] {
  return text ? [{ ...PLAIN_RUN, text }] : [];
}
