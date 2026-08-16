import type { DeviceSpec } from "./types";

/**
 * Built-in device frames.
 *
 * These live in TypeScript rather than MongoDB on purpose: the geometry is
 * coupled to the renderer (changing a bezel radius means touching
 * device-frame.tsx, which means a deploy), the editor needs them synchronously on
 * first paint with no loading state, and keeping them static makes `DeviceId` a
 * literal union instead of `string`.
 *
 * When users can author custom frames, add a `DeviceFrame` collection *alongside*
 * this catalog and merge — `[...DEVICES, ...userFrames]`. The static path stays.
 *
 * ⚠️ Every spec below is `fidelity: "draft"` — the numbers come from published
 * screen resolutions with estimated bezels. Each device needs a visual pass
 * against a real product photo before it is offered to users.
 */
export const DEVICES = [
  {
    id: "generic-android",
    name: "Android (generic)",
    brand: "generic",
    category: "phone",
    screenshot: { width: 1080, height: 1920 },
    viewport: { width: 360, height: 640, scale: 3 },
    body: { width: 1152, height: 2040, cornerRadius: 72 },
    bezel: { top: 36, right: 36, bottom: 84, left: 36 },
    screen: { x: 36, y: 36, width: 1080, height: 1920, cornerRadius: 44 },
    notch: {
      kind: "none",
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
      cornerRadius: 0,
    },
    buttons: [
      { side: "right", offset: 420, length: 150, width: 10, radius: 5 },
      { side: "right", offset: 620, length: 240, width: 10, radius: 5 },
    ],
    supportsLandscape: true,
    colorways: [
      {
        id: "black",
        label: "Black",
        style: {
          bodyFill: "#181818",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 90, offsetX: 0, offsetY: 40, opacity: 0.3 },
        },
      },
      {
        id: "silver",
        label: "Silver",
        style: {
          bodyFill: "#d4d6d8",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 90, offsetX: 0, offsetY: 40, opacity: 0.25 },
        },
      },
    ],
    fidelity: "draft",
  },

  {
    id: "iphone-15-pro",
    name: "iPhone 15 Pro",
    brand: "apple",
    category: "phone",
    screenshot: { width: 1179, height: 2556 },
    viewport: { width: 393, height: 852, scale: 3 },
    body: { width: 1259, height: 2636, cornerRadius: 180 },
    bezel: { top: 40, right: 40, bottom: 40, left: 40 },
    screen: { x: 40, y: 40, width: 1179, height: 2556, cornerRadius: 150 },
    notch: {
      kind: "dynamic-island",
      width: 250,
      height: 82,
      offsetX: 0,
      offsetY: 34,
      cornerRadius: 41,
    },
    buttons: [
      { side: "left", offset: 520, length: 100, width: 12, radius: 6 },
      { side: "left", offset: 680, length: 180, width: 12, radius: 6 },
      { side: "left", offset: 900, length: 180, width: 12, radius: 6 },
      { side: "right", offset: 760, length: 250, width: 12, radius: 6 },
    ],
    supportsLandscape: true,
    colorways: [
      {
        id: "natural-titanium",
        label: "Natural Titanium",
        style: {
          bodyFill: "#8f8a81",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 100, offsetX: 0, offsetY: 44, opacity: 0.28 },
        },
      },
      {
        id: "black-titanium",
        label: "Black Titanium",
        style: {
          bodyFill: "#3b3b3d",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 100, offsetX: 0, offsetY: 44, opacity: 0.32 },
        },
      },
      {
        id: "white-titanium",
        label: "White Titanium",
        style: {
          bodyFill: "#e8e4de",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 100, offsetX: 0, offsetY: 44, opacity: 0.24 },
        },
      },
    ],
    fidelity: "draft",
  },

  {
    id: "iphone-se-3",
    name: "iPhone SE (3rd gen)",
    brand: "apple",
    category: "phone",
    screenshot: { width: 750, height: 1334 },
    viewport: { width: 375, height: 667, scale: 2 },
    body: { width: 828, height: 1652, cornerRadius: 64 },
    bezel: { top: 155, right: 39, bottom: 163, left: 39 },
    screen: { x: 39, y: 155, width: 750, height: 1334, cornerRadius: 0 },
    notch: {
      kind: "none",
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
      cornerRadius: 0,
    },
    buttons: [
      { side: "left", offset: 300, length: 70, width: 10, radius: 5 },
      { side: "left", offset: 420, length: 120, width: 10, radius: 5 },
      { side: "right", offset: 380, length: 160, width: 10, radius: 5 },
    ],
    supportsLandscape: true,
    colorways: [
      {
        id: "midnight",
        label: "Midnight",
        style: {
          bodyFill: "#26282c",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 80, offsetX: 0, offsetY: 36, opacity: 0.3 },
        },
      },
      {
        id: "starlight",
        label: "Starlight",
        style: {
          bodyFill: "#f0eae4",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 80, offsetX: 0, offsetY: 36, opacity: 0.22 },
        },
      },
      {
        id: "product-red",
        label: "Red",
        style: {
          bodyFill: "#ba0c2e",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 80, offsetX: 0, offsetY: 36, opacity: 0.28 },
        },
      },
    ],
    fidelity: "draft",
  },

  {
    id: "pixel-8",
    name: "Google Pixel 8",
    brand: "google",
    category: "phone",
    screenshot: { width: 1080, height: 2400 },
    viewport: { width: 412, height: 915, scale: 2.625 },
    body: { width: 1140, height: 2460, cornerRadius: 96 },
    bezel: { top: 30, right: 30, bottom: 30, left: 30 },
    screen: { x: 30, y: 30, width: 1080, height: 2400, cornerRadius: 66 },
    notch: {
      kind: "punch-hole",
      width: 60,
      height: 60,
      offsetX: 0,
      offsetY: 30,
      cornerRadius: 30,
    },
    buttons: [
      { side: "right", offset: 520, length: 130, width: 11, radius: 5.5 },
      { side: "right", offset: 700, length: 220, width: 11, radius: 5.5 },
    ],
    supportsLandscape: true,
    colorways: [
      {
        id: "obsidian",
        label: "Obsidian",
        style: {
          bodyFill: "#2b2c2e",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.3 },
        },
      },
      {
        id: "hazel",
        label: "Hazel",
        style: {
          bodyFill: "#8e8b7f",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.26 },
        },
      },
      {
        id: "rose",
        label: "Rose",
        style: {
          bodyFill: "#f4c9c3",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.22 },
        },
      },
    ],
    fidelity: "draft",
  },

  {
    id: "galaxy-s24",
    name: "Samsung Galaxy S24",
    brand: "samsung",
    category: "phone",
    screenshot: { width: 1080, height: 2340 },
    viewport: { width: 360, height: 780, scale: 3 },
    body: { width: 1132, height: 2392, cornerRadius: 72 },
    bezel: { top: 26, right: 26, bottom: 26, left: 26 },
    screen: { x: 26, y: 26, width: 1080, height: 2340, cornerRadius: 48 },
    notch: {
      kind: "punch-hole",
      width: 56,
      height: 56,
      offsetX: 0,
      offsetY: 26,
      cornerRadius: 28,
    },
    buttons: [
      { side: "right", offset: 500, length: 120, width: 10, radius: 5 },
      { side: "right", offset: 670, length: 210, width: 10, radius: 5 },
    ],
    supportsLandscape: true,
    colorways: [
      {
        id: "onyx-black",
        label: "Onyx Black",
        style: {
          bodyFill: "#1c1c1e",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.3 },
        },
      },
      {
        id: "marble-gray",
        label: "Marble Gray",
        style: {
          bodyFill: "#b6b7b3",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.25 },
        },
      },
      {
        id: "cobalt-violet",
        label: "Cobalt Violet",
        style: {
          bodyFill: "#8f8ac4",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.26 },
        },
      },
    ],
    fidelity: "draft",
  },
] as const satisfies readonly DeviceSpec[];

export type DeviceId = (typeof DEVICES)[number]["id"];

/** Tuple form, so it can be handed straight to `z.enum`. */
export const DEVICE_IDS = DEVICES.map((d) => d.id) as [DeviceId, ...DeviceId[]];

const DEVICE_LOOKUP = Object.fromEntries(
  DEVICES.map((d) => [d.id, d as DeviceSpec]),
) as Record<DeviceId, DeviceSpec>;

export function getDevice(id: DeviceId): DeviceSpec {
  return DEVICE_LOOKUP[id];
}

export const DEFAULT_DEVICE_ID: DeviceId = "generic-android";

export function getColorway(device: DeviceSpec, colorwayId: string) {
  return device.colorways.find((c) => c.id === colorwayId) ?? device.colorways[0];
}
