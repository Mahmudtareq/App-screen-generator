import { z } from "zod";

import type { DeviceSpec } from "@/lib/devices/types";

import { objectIdSchema } from "./project";

/**
 * Admin-authored devices.
 *
 * What is stored (and edited) is this *authoring* shape — a handful of numbers a
 * person can read off a datasheet — and the full renderer `DeviceSpec` is derived
 * from it by `buildDeviceSpec`. Storing the derived spec instead would make every
 * edit a lossy round-trip and let the two drift; deriving on read keeps the form
 * and the database the same shape.
 *
 * This module is imported by both the admin form (client) and the server, so it
 * must stay pure zod + arithmetic: no `server-only`, no Mongoose.
 */

const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, "Must be a hex colour, e.g. #1c1c1e");

export const deviceBrandSchema = z.enum([
  "apple",
  "google",
  "samsung",
  "nothing",
  "generic",
]);

export const deviceCategorySchema = z.enum([
  "phone",
  "tablet",
  "watch",
  "desktop",
]);

export const deviceNotchInputSchema = z.object({
  kind: z.enum(["none", "notch", "dynamic-island", "punch-hole"]).default("none"),
  width: z.coerce.number().min(0).max(2000).default(0),
  height: z.coerce.number().min(0).max(500).default(0),
  /** Offset of the notch centre from the screen centre; punch-holes sit off-centre. */
  offsetX: z.coerce.number().min(-1000).max(1000).default(0),
  /** Gap between the top of the screen and the top of the notch. */
  offsetY: z.coerce.number().min(0).max(500).default(0),
  cornerRadius: z.coerce.number().min(0).max(500).default(0),
});

export const deviceColorwayInputSchema = z.object({
  label: z.string().trim().min(1, "Give the finish a name").max(40),
  bodyFill: hexColorSchema,
});

export const deviceInputSchema = z.object({
  name: z.string().trim().min(1, "Give the device a name").max(60),
  brand: deviceBrandSchema,
  category: deviceCategorySchema,
  /** Native screenshot resolution, in device px. */
  screenshotWidth: z.coerce.number().int().min(100).max(8192),
  screenshotHeight: z.coerce.number().int().min(100).max(8192),
  /** Device pixels per CSS pixel; website capture divides by this. */
  scaleFactor: z.coerce.number().min(1).max(4).default(3),
  /** Uniform bezel width, in device px. */
  bezel: z.coerce.number().min(0).max(400).default(36),
  bodyCornerRadius: z.coerce.number().min(0).max(600).default(90),
  screenCornerRadius: z.coerce.number().min(0).max(600).default(48),
  notch: deviceNotchInputSchema.default({
    kind: "none",
    width: 0,
    height: 0,
    offsetX: 0,
    offsetY: 0,
    cornerRadius: 0,
  }),
  supportsLandscape: z.boolean().default(true),
  colorways: z.array(deviceColorwayInputSchema).min(1).max(6),
  /** Disabled devices stay in the database but leave the editor's picker. */
  enabled: z.boolean().default(true),
});

export const createDeviceSchema = deviceInputSchema;
export const updateDeviceSchema = deviceInputSchema.extend({ id: objectIdSchema });
export const deviceIdSchema = z.object({ id: objectIdSchema });

export type DeviceInput = z.infer<typeof deviceInputSchema>;
export type DeviceNotchInput = z.infer<typeof deviceNotchInputSchema>;

/** What the admin panel lists and edits: the row's id plus its authoring fields. */
export interface CustomDeviceRow extends DeviceInput {
  id: string;
  updatedAt: string;
}

/* ------------------------------ spec derivation ----------------------------- */

const CUSTOM_DEVICE_ID_PREFIX = "custom:";

/** The document-level id an admin device is referenced by. */
export function customDeviceId(id: string): string {
  return `${CUSTOM_DEVICE_ID_PREFIX}${id}`;
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

/**
 * Derives the full renderer spec from the authoring fields.
 *
 * Body and screen fall out of screenshot-plus-bezel arithmetic, so the numbers
 * cannot disagree with each other the way hand-entered ones could. Buttons are
 * deliberately absent — they are pure decoration, and a nub on the wrong edge
 * looks worse than no nub.
 */
export function buildDeviceSpec(id: string, input: DeviceInput): DeviceSpec {
  const { screenshotWidth: width, screenshotHeight: height, bezel } = input;

  return {
    id,
    name: input.name,
    brand: input.brand,
    category: input.category,
    screenshot: { width, height },
    viewport: {
      width: Math.round(width / input.scaleFactor),
      height: Math.round(height / input.scaleFactor),
      scale: input.scaleFactor,
    },
    body: {
      width: width + bezel * 2,
      height: height + bezel * 2,
      cornerRadius: input.bodyCornerRadius,
    },
    bezel: { top: bezel, right: bezel, bottom: bezel, left: bezel },
    screen: {
      x: bezel,
      y: bezel,
      width,
      height,
      cornerRadius: input.screenCornerRadius,
    },
    notch: {
      kind: input.notch.kind,
      width: input.notch.width,
      height: input.notch.height,
      offsetX: input.notch.offsetX,
      offsetY: input.notch.offsetY,
      cornerRadius: input.notch.cornerRadius,
    },
    supportsLandscape: input.supportsLandscape,
    colorways: input.colorways.map((colorway, index) => ({
      id: slugify(colorway.label, `colorway-${index + 1}`),
      label: colorway.label,
      style: {
        bodyFill: colorway.bodyFill.toLowerCase(),
        screenFill: "#0b0b0c",
        shadow: {
          color: "#0f172a",
          blur: 90,
          offsetX: 0,
          offsetY: 40,
          opacity: 0.3,
        },
      },
    })),
    fidelity: "draft",
  };
}
