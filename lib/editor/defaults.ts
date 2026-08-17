import { nanoid } from "nanoid";

import { getArtboardPreset, DEFAULT_ARTBOARD_PRESET_ID } from "@/config/artboards";
import type { CanvasFontId } from "@/config/fonts";
import {
  DEFAULT_TEMPLATE_ID,
  getTemplate,
  type Template,
  type TemplateScreenCopy,
} from "@/config/templates";
import { getDevice, type DeviceId } from "@/lib/devices/catalog";
import { orientSpec } from "@/lib/devices/orientation";
import type { DeviceSpec, Orientation } from "@/lib/devices/types";
import {
  EDITOR_DOC_VERSION,
  plainTextToRuns,
  type Artboard,
  type DeviceLayer,
  type EditorDoc,
  type ImageLayer,
  type Screen,
  type TextLayer,
} from "@/schemas/editor";

/** Top of the band the device is centred in, as a fraction of artboard height. */
const DEVICE_BAND_TOP = 0.26;
/** Height of that band. The gap above it is where the title sits. */
const DEVICE_BAND_HEIGHT = 0.7;
/** How much of the band a device is allowed to fill on each axis. */
const DEVICE_HEIGHT_RATIO = 0.94;
const DEVICE_WIDTH_RATIO = 0.84;

/** Fraction of the artboard width a freshly-added image layer occupies. */
const NEW_IMAGE_WIDTH_RATIO = 0.22;

export const newLayerId = () => nanoid(10);
export const newScreenId = () => nanoid(10);

/**
 * Centres a device in the artboard at a readable default size.
 *
 * Fitted on both axes, not just height: a landscape device is wider than it is
 * tall, and scaling it to fill 66% of a 2796px-tall artboard made it nearly three
 * artboards wide.
 *
 * Returned in artboard px: `scale` converts the device's own px into artboard px,
 * and x/y place the body's top-left corner.
 */
export function fitDeviceToArtboard(
  spec: DeviceSpec,
  artboard: Pick<Artboard, "width" | "height">,
) {
  const bandTop = artboard.height * DEVICE_BAND_TOP;
  const bandHeight = artboard.height * DEVICE_BAND_HEIGHT;

  const scale = Math.min(
    (bandHeight * DEVICE_HEIGHT_RATIO) / spec.body.height,
    (artboard.width * DEVICE_WIDTH_RATIO) / spec.body.width,
  );

  const scaledWidth = spec.body.width * scale;
  const scaledHeight = spec.body.height * scale;

  return {
    x: (artboard.width - scaledWidth) / 2,
    y: bandTop + (bandHeight - scaledHeight) / 2,
    scale,
    rotation: 0,
  };
}

export function createDeviceLayer(
  spec: DeviceSpec,
  artboard: Pick<Artboard, "width" | "height">,
  colorwayId: string,
): DeviceLayer {
  return {
    id: newLayerId(),
    kind: "device",
    name: "",
    visible: true,
    locked: false,
    opacity: 1,
    colorwayId,
    ...fitDeviceToArtboard(spec, artboard),
    shadowEnabled: true,
    screenshot: { assetId: null, url: null, zoom: 1, pan: { x: 0, y: 0 } },
  };
}

export function createTextLayer(
  role: TextLayer["role"],
  artboard: Pick<Artboard, "width" | "height">,
  overrides: Partial<TextLayer> = {},
): TextLayer {
  const margin = artboard.width * 0.08;
  const isTitle = role === "title";

  return {
    id: newLayerId(),
    kind: "text",
    name: "",
    visible: true,
    locked: false,
    opacity: 1,
    role,
    runs: plainTextToRuns(
      isTitle ? "Your headline here" : "A short supporting line of copy.",
    ),
    fontId: "inter",
    fontSize: isTitle ? artboard.width * 0.075 : artboard.width * 0.038,
    fontWeight: isTitle ? 700 : 400,
    italic: false,
    underline: false,
    uppercase: false,
    color: isTitle ? "#0f172a" : "#475569",
    shadow: null,
    background: null,
    align: "center",
    x: margin,
    y: isTitle ? artboard.height * 0.075 : artboard.height * 0.175,
    width: artboard.width - margin * 2,
    rotation: 0,
    lineHeight: 1.2,
    letterSpacing: 0,
    ...overrides,
  };
}

/**
 * A new image layer, sized from the asset's own aspect ratio.
 *
 * The ratio is only knowable once the file has been decoded, which is why this
 * takes it as an argument rather than seeding a square placeholder that visibly
 * snaps to shape a moment later.
 */
export function createImageLayer(
  artboard: Pick<Artboard, "width" | "height">,
  natural?: { width: number; height: number },
): ImageLayer {
  const width = artboard.width * NEW_IMAGE_WIDTH_RATIO;
  const height =
    natural && natural.width > 0 ? width * (natural.height / natural.width) : width;

  return {
    id: newLayerId(),
    kind: "image",
    name: "",
    visible: true,
    locked: false,
    opacity: 1,
    assetId: null,
    url: null,
    x: (artboard.width - width) / 2,
    y: artboard.height * 0.03,
    width,
    height,
    rotation: 0,
    cornerRadius: 0,
  };
}

/**
 * One screen built from a template.
 *
 * Layer order is bottom-to-top: the device sits behind the copy, so a headline
 * placed over the phone stays readable. That is only a starting point — the whole
 * point of the ordered array is that the user can restack it.
 */
export function createTemplateScreen(
  template: Template,
  copy: TemplateScreenCopy,
  spec: DeviceSpec,
  artboard: Artboard,
): Screen {
  const fontId = template.type.fontId as CanvasFontId;

  return {
    id: newScreenId(),
    name: "",
    pinned: false,
    background: structuredClone(template.background),
    layers: [
      createDeviceLayer(spec, artboard, template.colorwayId),
      createTextLayer("title", artboard, {
        runs: plainTextToRuns(copy.title),
        fontId,
        color: template.type.titleColor,
        fontWeight: template.type.titleWeight,
        background: template.type.titlePill
          ? {
              color: template.type.titlePill.color,
              opacity: template.type.titlePill.opacity,
              paddingX: artboard.width * 0.03,
              paddingY: artboard.height * 0.008,
              cornerRadius: 24,
            }
          : null,
      }),
      createTextLayer("body", artboard, {
        runs: plainTextToRuns(copy.body),
        fontId,
        color: template.type.bodyColor,
        fontWeight: template.type.bodyWeight,
      }),
    ],
  };
}

/** Artboard for a template, falling back to the default preset. */
function templateArtboard(template: Template): Artboard {
  const preset =
    getArtboardPreset(template.artboardPresetId) ??
    getArtboardPreset(DEFAULT_ARTBOARD_PRESET_ID)!;

  return { width: preset.width, height: preset.height, preset: preset.id };
}

/**
 * A complete document from a template — five screens, ready to edit.
 *
 * This is what "new project" means: there is no empty state to design, because a
 * blank canvas is the least useful thing to hand someone who came here to make
 * five store screenshots.
 */
export function createDocFromTemplate(
  templateId: string = DEFAULT_TEMPLATE_ID,
  options: { orientation?: Orientation } = {},
): EditorDoc {
  const template = getTemplate(templateId);
  const orientation = options.orientation ?? "portrait";

  const artboard = templateArtboard(template);
  const spec = orientSpec(getDevice(template.deviceId as DeviceId), orientation);

  return {
    version: EDITOR_DOC_VERSION,
    templateId: template.id as EditorDoc["templateId"],
    deviceId: template.deviceId as DeviceId,
    orientation,
    artboard,
    screens: template.screens.map((copy) =>
      createTemplateScreen(template, copy, spec, artboard),
    ),
  };
}

/**
 * A blank screen for the "add screen" button — same background as the screen it
 * was added after, so a new frame arrives already matching the set.
 */
export function createBlankScreen(
  doc: EditorDoc,
  source?: Screen,
): Screen {
  const template = getTemplate(doc.templateId);
  const spec = orientSpec(getDevice(doc.deviceId), doc.orientation);
  const fontId = template.type.fontId as CanvasFontId;

  return {
    id: newScreenId(),
    name: "",
    pinned: false,
    background: structuredClone(source?.background ?? template.background),
    layers: [
      createDeviceLayer(spec, doc.artboard, template.colorwayId),
      createTextLayer("title", doc.artboard, {
        runs: plainTextToRuns("Your headline here"),
        fontId,
        color: template.type.titleColor,
        fontWeight: template.type.titleWeight,
      }),
    ],
  };
}
