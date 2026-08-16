import { nanoid } from "nanoid";

import { getArtboardPreset, DEFAULT_ARTBOARD_PRESET_ID } from "@/config/artboards";
import { DEFAULT_FONT_ID } from "@/config/fonts";
import { DEFAULT_DEVICE_ID, getDevice, type DeviceId } from "@/lib/devices/catalog";
import { orientSpec } from "@/lib/devices/orientation";
import type { DeviceSpec, Orientation } from "@/lib/devices/types";
import { EDITOR_DOC_VERSION, type Artboard, type EditorDoc, type TextLayer } from "@/schemas/editor";

/** Top of the band the device is centred in, as a fraction of artboard height. */
const DEVICE_BAND_TOP = 0.26;
/** Height of that band. The gap above it is where the title sits. */
const DEVICE_BAND_HEIGHT = 0.7;
/** How much of the band a device is allowed to fill on each axis. */
const DEVICE_HEIGHT_RATIO = 0.94;
const DEVICE_WIDTH_RATIO = 0.84;

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
    shadowEnabled: true,
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
    id: nanoid(10),
    role,
    text: isTitle ? "Your headline here" : "A short supporting line of copy.",
    fontId: DEFAULT_FONT_ID,
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
    y: isTitle ? artboard.height * 0.09 : artboard.height * 0.19,
    width: artboard.width - margin * 2,
    rotation: 0,
    lineHeight: 1.2,
    letterSpacing: 0,
    opacity: 1,
    visible: true,
    ...overrides,
  };
}

export function createEmptyDoc(
  options: { deviceId?: DeviceId; orientation?: Orientation } = {},
): EditorDoc {
  const deviceId = options.deviceId ?? DEFAULT_DEVICE_ID;
  const orientation = options.orientation ?? "portrait";

  const preset = getArtboardPreset(DEFAULT_ARTBOARD_PRESET_ID)!;
  const artboard: Artboard = {
    width: preset.width,
    height: preset.height,
    preset: preset.id,
  };

  const spec = orientSpec(getDevice(deviceId), orientation);

  return {
    version: EDITOR_DOC_VERSION,
    deviceId,
    colorwayId: spec.colorways[0].id,
    orientation,
    device: fitDeviceToArtboard(spec, artboard),
    artboard,
    background: { type: "color", color: "#eef2f7" },
    screenshot: { assetId: null, url: null, zoom: 1, pan: { x: 0, y: 0 } },
    logo: null,
    textLayers: [createTextLayer("title", artboard)],
  };
}
