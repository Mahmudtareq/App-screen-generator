/**
 * Device frame geometry.
 *
 * Every measurement in this file is in "device px" — the coordinate space of the
 * device's own native screenshot. The numbers only have to be internally
 * consistent with each other, not absolutely correct, because the device group is
 * uniformly scaled to fit the artboard before it is drawn.
 *
 * Frames are drawn programmatically from these specs (see
 * components/canvas/nodes/device-frame.tsx) rather than composited from PNG
 * assets, so they stay crisp at any export scale and carry no asset licensing.
 */

export type Orientation = "portrait" | "landscape";

/**
 * Konva's per-corner radius order: top-left, top-right, bottom-right, bottom-left.
 * Readonly so the device catalog can be declared `as const` — use `toKonvaRadius`
 * from ./geometry to hand one to Konva.
 */
export type Corners = readonly [tl: number, tr: number, br: number, bl: number];

export type CornerRadius = number | Corners;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type NotchKind = "none" | "notch" | "dynamic-island" | "punch-hole";

/**
 * The notch is drawn as an opaque shape on top of the screenshot, filled with the
 * body colour — it is never modelled as a hole in the screen. That keeps the
 * screen clip a plain rounded rect and lets a colourway tint the island
 * independently of the bezel.
 */
export interface NotchSpec {
  kind: NotchKind;
  /** Screen-local width. Ignored when kind is "none". */
  width: number;
  /** Screen-local height. */
  height: number;
  /** Gap between the top edge of the screen and the top of the notch. */
  offsetY: number;
  /** Horizontal offset of the notch centre from the screen centre. Punch-holes are often off-centre. */
  offsetX: number;
  cornerRadius: CornerRadius;
  /**
   * Optional SVG path override, in screen-local coordinates. Wins over the
   * primitive shape. Needed for the classic iPhone notch, whose inverted fillets
   * where it meets the bezel cannot be expressed as a rounded rect.
   */
  path?: string;
}

export interface ShadowSpec {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

export interface FrameStyle {
  bodyFill: string;
  bodyStroke?: string;
  bodyStrokeWidth?: number;
  /** Shown in the screen area when no screenshot has been loaded yet. */
  screenFill: string;
  shadow?: ShadowSpec;
}

export interface Colorway {
  id: string;
  label: string;
  style: FrameStyle;
}

/**
 * All four edges are representable because rotating to landscape moves a button
 * from a vertical edge to a horizontal one — a left-edge power button becomes a
 * top-edge one, lying down.
 */
export type ButtonEdge = "left" | "right" | "top" | "bottom";

export interface SideButton {
  side: ButtonEdge;
  /**
   * Distance along the edge from its start: measured from the body's top for a
   * vertical edge, from its left for a horizontal one.
   */
  offset: number;
  /** Extent along the edge. */
  length: number;
  /** How far the button protrudes from the body. */
  width: number;
  radius: number;
}

/**
 * Kept as unions rather than free strings so the picker's category tabs are a
 * closed set the filters can switch over. Adding a brand means adding it here,
 * to the admin form's options, and nowhere else.
 */
export type DeviceBrand = "apple" | "google" | "samsung" | "nothing" | "generic";

export type DeviceCategory = "phone" | "tablet" | "watch" | "desktop";

export interface DeviceSpec {
  id: string;
  name: string;
  brand: DeviceBrand;
  category: DeviceCategory;
  /** Native screenshot resolution, used to warn when an upload's aspect ratio will be cropped. */
  screenshot: { width: number; height: number };
  /**
   * The browser viewport this device presents, in CSS pixels.
   *
   * Distinct from `screenshot`, which is in device pixels: a website capture has
   * to be told 393 × 852 at a scale factor of 3, not 1179 × 2556, or the page
   * lays itself out as a tablet. `width * scale` should equal `screenshot.width`.
   */
  viewport: { width: number; height: number; scale: number };
  body: { width: number; height: number; cornerRadius: CornerRadius };
  bezel: { top: number; right: number; bottom: number; left: number };
  /**
   * Stored explicitly rather than derived from body minus bezel, so it can be
   * hand-nudged during visual tuning without the bezel numbers having to lie.
   */
  screen: Rect & { cornerRadius: CornerRadius };
  notch: NotchSpec;
  buttons?: SideButton[];
  /** Replaces the primitive body rect entirely. Escape hatch for foldables and true superellipse corners. */
  bodyPath?: string;
  supportsLandscape: boolean;
  colorways: readonly Colorway[];
  /**
   * "draft" means the numbers came from a datasheet and have never been eyeballed
   * against a product photo. Bezel width, corner radii and notch geometry are the
   * difference between "looks like a phone" and "looks like a cheap phone", so
   * every device needs a visual tuning pass before it ships.
   */
  fidelity: "draft" | "tuned";
}
