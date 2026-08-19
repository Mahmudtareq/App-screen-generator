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

  /* ------------------------- Apple phones (current) ------------------------- */

  {
    id: "iphone-69-island",
    name: "iPhone 6.9\u2033 (Island)",
    brand: "apple",
    category: "phone",
    screenshot: { width: 1320, height: 2868 },
    viewport: { width: 440, height: 956, scale: 3 },
    body: { width: 1400, height: 2948, cornerRadius: 200 },
    bezel: { top: 40, right: 40, bottom: 40, left: 40 },
    screen: { x: 40, y: 40, width: 1320, height: 2868, cornerRadius: 165 },
    notch: {
      kind: "dynamic-island",
      width: 264,
      height: 84,
      offsetX: 0,
      offsetY: 36,
      cornerRadius: 42,
    },
    buttons: [
      { side: "left", offset: 560, length: 110, width: 12, radius: 6 },
      { side: "left", offset: 730, length: 190, width: 12, radius: 6 },
      { side: "left", offset: 960, length: 190, width: 12, radius: 6 },
      { side: "right", offset: 820, length: 260, width: 12, radius: 6 },
    ],
    supportsLandscape: true,
    colorways: [
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
        id: "natural-titanium",
        label: "Natural Titanium",
        style: {
          bodyFill: "#8f8a81",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 100, offsetX: 0, offsetY: 44, opacity: 0.28 },
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
      {
        id: "desert-titanium",
        label: "Desert Titanium",
        style: {
          bodyFill: "#bfa48f",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 100, offsetX: 0, offsetY: 44, opacity: 0.26 },
        },
      },
    ],
    fidelity: "draft",
  },

  {
    id: "iphone-69-plain",
    name: "iPhone 6.9\u2033 (No Island)",
    brand: "apple",
    category: "phone",
    screenshot: { width: 1320, height: 2868 },
    viewport: { width: 440, height: 956, scale: 3 },
    body: { width: 1400, height: 2948, cornerRadius: 200 },
    bezel: { top: 40, right: 40, bottom: 40, left: 40 },
    screen: { x: 40, y: 40, width: 1320, height: 2868, cornerRadius: 165 },
    notch: {
      kind: "none",
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
      cornerRadius: 0,
    },
    buttons: [
      { side: "left", offset: 560, length: 110, width: 12, radius: 6 },
      { side: "left", offset: 730, length: 190, width: 12, radius: 6 },
      { side: "left", offset: 960, length: 190, width: 12, radius: 6 },
      { side: "right", offset: 820, length: 260, width: 12, radius: 6 },
    ],
    supportsLandscape: true,
    colorways: [
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
    id: "iphone-63-island",
    name: "iPhone 6.3\u2033 (Island)",
    brand: "apple",
    category: "phone",
    screenshot: { width: 1206, height: 2622 },
    viewport: { width: 402, height: 874, scale: 3 },
    body: { width: 1282, height: 2698, cornerRadius: 184 },
    bezel: { top: 38, right: 38, bottom: 38, left: 38 },
    screen: { x: 38, y: 38, width: 1206, height: 2622, cornerRadius: 152 },
    notch: {
      kind: "dynamic-island",
      width: 250,
      height: 82,
      offsetX: 0,
      offsetY: 34,
      cornerRadius: 41,
    },
    buttons: [
      { side: "left", offset: 530, length: 100, width: 12, radius: 6 },
      { side: "left", offset: 690, length: 180, width: 12, radius: 6 },
      { side: "left", offset: 910, length: 180, width: 12, radius: 6 },
      { side: "right", offset: 770, length: 250, width: 12, radius: 6 },
    ],
    supportsLandscape: true,
    colorways: [
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
        id: "natural-titanium",
        label: "Natural Titanium",
        style: {
          bodyFill: "#8f8a81",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 100, offsetX: 0, offsetY: 44, opacity: 0.28 },
        },
      },
    ],
    fidelity: "draft",
  },

  /* --------------------------------- tablets -------------------------------- */

  {
    id: "ipad-13",
    name: "iPad 13\u2033",
    brand: "apple",
    category: "tablet",
    screenshot: { width: 2064, height: 2752 },
    viewport: { width: 1032, height: 1376, scale: 2 },
    body: { width: 2244, height: 2932, cornerRadius: 120 },
    bezel: { top: 90, right: 90, bottom: 90, left: 90 },
    screen: { x: 90, y: 90, width: 2064, height: 2752, cornerRadius: 36 },
    notch: {
      kind: "none",
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
      cornerRadius: 0,
    },
    buttons: [
      { side: "top", offset: 1980, length: 140, width: 12, radius: 6 },
      { side: "right", offset: 260, length: 220, width: 12, radius: 6 },
    ],
    supportsLandscape: true,
    colorways: [
      {
        id: "space-gray",
        label: "Space Gray",
        style: {
          bodyFill: "#3a3b3f",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 110, offsetX: 0, offsetY: 48, opacity: 0.3 },
        },
      },
      {
        id: "silver",
        label: "Silver",
        style: {
          bodyFill: "#d7d9db",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 110, offsetX: 0, offsetY: 48, opacity: 0.24 },
        },
      },
    ],
    fidelity: "draft",
  },

  /* --------------------------------- watches -------------------------------- */

  {
    id: "apple-watch",
    name: "Apple Watch",
    brand: "apple",
    category: "watch",
    screenshot: { width: 416, height: 496 },
    viewport: { width: 208, height: 248, scale: 2 },
    body: { width: 484, height: 564, cornerRadius: 170 },
    bezel: { top: 34, right: 34, bottom: 34, left: 34 },
    screen: { x: 34, y: 34, width: 416, height: 496, cornerRadius: 120 },
    notch: {
      kind: "none",
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
      cornerRadius: 0,
    },
    buttons: [
      { side: "right", offset: 150, length: 90, width: 16, radius: 8 },
      { side: "right", offset: 290, length: 110, width: 8, radius: 4 },
    ],
    supportsLandscape: false,
    colorways: [
      {
        id: "jet-black",
        label: "Jet Black",
        style: {
          bodyFill: "#1e1e20",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 60, offsetX: 0, offsetY: 24, opacity: 0.3 },
        },
      },
      {
        id: "silver",
        label: "Silver",
        style: {
          bodyFill: "#d4d6d8",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 60, offsetX: 0, offsetY: 24, opacity: 0.24 },
        },
      },
      {
        id: "rose-gold",
        label: "Rose Gold",
        style: {
          bodyFill: "#e8c8bf",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 60, offsetX: 0, offsetY: 24, opacity: 0.24 },
        },
      },
    ],
    fidelity: "draft",
  },

  {
    id: "apple-watch-ultra",
    name: "Apple Watch Ultra",
    brand: "apple",
    category: "watch",
    screenshot: { width: 422, height: 514 },
    viewport: { width: 211, height: 257, scale: 2 },
    body: { width: 502, height: 594, cornerRadius: 140 },
    bezel: { top: 40, right: 40, bottom: 40, left: 40 },
    screen: { x: 40, y: 40, width: 422, height: 514, cornerRadius: 96 },
    notch: {
      kind: "none",
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
      cornerRadius: 0,
    },
    buttons: [
      { side: "right", offset: 170, length: 110, width: 22, radius: 11 },
      { side: "left", offset: 210, length: 130, width: 14, radius: 7 },
    ],
    supportsLandscape: false,
    colorways: [
      {
        id: "natural-titanium",
        label: "Natural Titanium",
        style: {
          bodyFill: "#b8b3a8",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 60, offsetX: 0, offsetY: 24, opacity: 0.28 },
        },
      },
      {
        id: "black-titanium",
        label: "Black Titanium",
        style: {
          bodyFill: "#3b3b3d",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 60, offsetX: 0, offsetY: 24, opacity: 0.3 },
        },
      },
    ],
    fidelity: "draft",
  },

  /* ------------------------------ Android phones ----------------------------- */

  {
    id: "galaxy-s26",
    name: "Samsung Galaxy S26",
    brand: "samsung",
    category: "phone",
    screenshot: { width: 1080, height: 2340 },
    viewport: { width: 360, height: 780, scale: 3 },
    body: { width: 1128, height: 2388, cornerRadius: 68 },
    bezel: { top: 24, right: 24, bottom: 24, left: 24 },
    screen: { x: 24, y: 24, width: 1080, height: 2340, cornerRadius: 44 },
    notch: {
      kind: "punch-hole",
      width: 54,
      height: 54,
      offsetX: 0,
      offsetY: 24,
      cornerRadius: 27,
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
        id: "icy-blue",
        label: "Icy Blue",
        style: {
          bodyFill: "#bcd3e3",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.24 },
        },
      },
      {
        id: "silver",
        label: "Silver",
        style: {
          bodyFill: "#c9cbc9",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.25 },
        },
      },
    ],
    fidelity: "draft",
  },

  {
    id: "pixel-10-pro",
    name: "Google Pixel 10 Pro",
    brand: "google",
    category: "phone",
    screenshot: { width: 1280, height: 2856 },
    viewport: { width: 427, height: 952, scale: 3 },
    body: { width: 1348, height: 2924, cornerRadius: 110 },
    bezel: { top: 34, right: 34, bottom: 34, left: 34 },
    screen: { x: 34, y: 34, width: 1280, height: 2856, cornerRadius: 76 },
    notch: {
      kind: "punch-hole",
      width: 64,
      height: 64,
      offsetX: 0,
      offsetY: 34,
      cornerRadius: 32,
    },
    buttons: [
      { side: "right", offset: 560, length: 140, width: 11, radius: 5.5 },
      { side: "right", offset: 750, length: 240, width: 11, radius: 5.5 },
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
        id: "porcelain",
        label: "Porcelain",
        style: {
          bodyFill: "#e7e3dc",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.24 },
        },
      },
      {
        id: "moonstone",
        label: "Moonstone",
        style: {
          bodyFill: "#8fa2b4",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.26 },
        },
      },
    ],
    fidelity: "draft",
  },

  {
    id: "nothing-phone-3",
    name: "Nothing Phone 3",
    brand: "nothing",
    category: "phone",
    screenshot: { width: 1260, height: 2800 },
    viewport: { width: 420, height: 933, scale: 3 },
    body: { width: 1320, height: 2860, cornerRadius: 90 },
    bezel: { top: 30, right: 30, bottom: 30, left: 30 },
    screen: { x: 30, y: 30, width: 1260, height: 2800, cornerRadius: 60 },
    notch: {
      kind: "punch-hole",
      width: 60,
      height: 60,
      offsetX: 0,
      offsetY: 30,
      cornerRadius: 30,
    },
    buttons: [
      { side: "right", offset: 540, length: 130, width: 10, radius: 5 },
      { side: "left", offset: 640, length: 220, width: 10, radius: 5 },
    ],
    supportsLandscape: true,
    colorways: [
      {
        id: "black",
        label: "Black",
        style: {
          bodyFill: "#17181a",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.3 },
        },
      },
      {
        id: "white",
        label: "White",
        style: {
          bodyFill: "#e9e9e7",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 95, offsetX: 0, offsetY: 42, opacity: 0.22 },
        },
      },
    ],
    fidelity: "draft",
  },

  /* ------------------------------- desktop & tv ------------------------------ */

  {
    id: "monitor-16-9",
    name: "Desktop monitor (16:9)",
    brand: "generic",
    category: "desktop",
    screenshot: { width: 1920, height: 1080 },
    viewport: { width: 1920, height: 1080, scale: 1 },
    body: { width: 1968, height: 1160, cornerRadius: 24 },
    bezel: { top: 24, right: 24, bottom: 56, left: 24 },
    screen: { x: 24, y: 24, width: 1920, height: 1080, cornerRadius: 8 },
    notch: {
      kind: "none",
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
      cornerRadius: 0,
    },
    // A monitor's native layout is landscape already; "rotating" it would only
    // produce a shape no product ships.
    supportsLandscape: false,
    colorways: [
      {
        id: "black",
        label: "Black",
        style: {
          bodyFill: "#1b1c1e",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 80, offsetX: 0, offsetY: 32, opacity: 0.3 },
        },
      },
      {
        id: "silver",
        label: "Silver",
        style: {
          bodyFill: "#c9cbcd",
          screenFill: "#0b0b0c",
          shadow: { color: "#0f172a", blur: 80, offsetX: 0, offsetY: 32, opacity: 0.24 },
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

/**
 * Untyped lookup for ids that arrive as plain strings — a stored document's
 * `deviceId`, or a capture request. Prefer `resolveDevice` from ./registry,
 * which also knows the admin-authored devices and never returns undefined.
 */
export function findBuiltinDevice(id: string): DeviceSpec | undefined {
  return (DEVICE_LOOKUP as Record<string, DeviceSpec | undefined>)[id];
}

export const DEFAULT_DEVICE_ID: DeviceId = "generic-android";

export function getColorway(device: DeviceSpec, colorwayId: string) {
  return device.colorways.find((c) => c.id === colorwayId) ?? device.colorways[0];
}
