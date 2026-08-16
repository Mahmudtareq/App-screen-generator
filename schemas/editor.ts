import { z } from "zod";

import { ARTBOARD_MAX, ARTBOARD_MIN } from "@/config/artboards";
import { CANVAS_FONT_IDS, DEFAULT_FONT_ID } from "@/config/fonts";
import { DEFAULT_DEVICE_ID, DEVICE_IDS } from "@/lib/devices/catalog";

/**
 * The editor document — the single contract shared by the Zustand store, the
 * server actions, and the Mongoose `Project.doc` subschema.
 *
 * The store's `document` slice serialises to exactly this shape, so saving is
 * `updateProject(id, doc)` with no field mapping in between.
 */

export const EDITOR_DOC_VERSION = 1;

const hexColorSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
    "Must be a hex colour, e.g. #1e293b",
  );

/**
 * A URL that is safe to persist.
 *
 * Rejecting `blob:` and `data:` is what makes the "upload before save" step
 * impossible to skip: an anonymous draft renders from an object URL, and trying
 * to save it before the Cloudinary upload has patched in a real URL fails
 * validation loudly instead of writing a URL that is dead on next page load.
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
    url: assetUrlSchema,
    fit: z.enum(["cover", "contain"]).default("cover"),
    blur: z.number().min(0).max(100).default(0),
    opacity: z.number().min(0).max(1).default(1),
  }),
]);

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

export const logoSchema = z.object({
  assetId: objectIdStringSchema.nullable().default(null),
  url: assetUrlSchema,
  x: z.number(),
  y: z.number(),
  width: z.number().min(1).max(ARTBOARD_MAX),
  height: z.number().min(1).max(ARTBOARD_MAX),
  rotation: z.number().min(-360).max(360).default(0),
  opacity: z.number().min(0).max(1).default(1),
  cornerRadius: z.number().min(0).default(0),
  visible: z.boolean().default(true),
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

export const textLayerSchema = z.object({
  id: z.string().min(1).max(64),
  role: z.enum(["title", "body"]),
  text: z.string().max(2000).default(""),
  fontId: z.enum(CANVAS_FONT_IDS).default(DEFAULT_FONT_ID),
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
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().default(true),
});

export const editorDocSchema = z.object({
  version: z.number().int().min(1).default(EDITOR_DOC_VERSION),
  deviceId: z.enum(DEVICE_IDS).default(DEFAULT_DEVICE_ID),
  colorwayId: z.string().min(1),
  orientation: orientationSchema.default("portrait"),
  device: z.object({
    x: z.number(),
    y: z.number(),
    /** Uniform scale from device px into artboard px. */
    scale: z.number().min(0.01).max(20),
    rotation: z.number().min(-360).max(360).default(0),
    shadowEnabled: z.boolean().default(true),
  }),
  artboard: artboardSchema,
  background: backgroundSchema,
  screenshot: screenshotSchema,
  logo: logoSchema.nullable().default(null),
  textLayers: z.array(textLayerSchema).max(20).default([]),
});

export type EditorDoc = z.infer<typeof editorDocSchema>;
export type Artboard = z.infer<typeof artboardSchema>;
export type Background = z.infer<typeof backgroundSchema>;
export type BackgroundType = Background["type"];
export type ScreenshotState = z.infer<typeof screenshotSchema>;
export type LogoLayer = z.infer<typeof logoSchema>;
export type TextLayer = z.infer<typeof textLayerSchema>;
export type TextRole = TextLayer["role"];
export type TextShadow = z.infer<typeof textShadowSchema>;
export type TextBackground = z.infer<typeof textBackgroundSchema>;
