import type {
  ButtonEdge,
  CornerRadius,
  DeviceSpec,
  Orientation,
  Rect,
} from "./types";

/**
 * Rotating a device to landscape is a pure transform of its spec, not a rotation
 * of the Konva group.
 *
 * Rotating the group would be fewer lines and wrong: a landscape screenshot is
 * natively landscape and must not be turned on its side, the notch has to end up
 * on the correct physical edge, and a rotated group's bounding box makes snapping
 * and auto-layout much harder to reason about.
 *
 * Everything below is a 90° clockwise rotation.
 */

const ROTATED_EDGE: Record<ButtonEdge, ButtonEdge> = {
  left: "top",
  top: "right",
  right: "bottom",
  bottom: "left",
};

/** [tl, tr, br, bl] rotated 90° clockwise: the old bottom-left becomes the new top-left. */
function rotateCorners(radius: CornerRadius): CornerRadius {
  if (typeof radius === "number") return radius;
  const [tl, tr, br, bl] = radius;
  return [bl, tl, tr, br];
}

/**
 * A rect inside a `W × H` box, mapped into the `H × W` box you get by rotating
 * 90° clockwise: `(x, y, w, h) -> (H - y - h, x, h, w)`.
 */
function rotateRect(rect: Rect, containerHeight: number): Rect {
  return {
    x: containerHeight - (rect.y + rect.height),
    y: rect.x,
    width: rect.height,
    height: rect.width,
  };
}

function rotateSpec(spec: DeviceSpec): DeviceSpec {
  const H = spec.body.height;
  const screen = rotateRect(spec.screen, H);

  // The notch's screen-local anchor has to be re-expressed against the rotated
  // screen rect. Its centre in portrait screen-local coords is (cx, cy); after
  // rotation that lands at (screenHeightPortrait - cy, cx).
  const portraitScreen = spec.screen;
  const cx = portraitScreen.width / 2 + spec.notch.offsetX;
  const cy = spec.notch.offsetY + spec.notch.height / 2;

  const rotatedCx = portraitScreen.height - cy;
  const rotatedCy = cx;

  const notchWidth = spec.notch.height;
  const notchHeight = spec.notch.width;

  return {
    ...spec,
    body: {
      width: spec.body.height,
      height: spec.body.width,
      cornerRadius: rotateCorners(spec.body.cornerRadius),
    },
    bezel: {
      top: spec.bezel.left,
      right: spec.bezel.top,
      bottom: spec.bezel.right,
      left: spec.bezel.bottom,
    },
    screen: { ...screen, cornerRadius: rotateCorners(spec.screen.cornerRadius) },
    notch: {
      ...spec.notch,
      width: notchWidth,
      height: notchHeight,
      offsetX: rotatedCx - screen.width / 2,
      offsetY: rotatedCy - notchHeight / 2,
      cornerRadius: rotateCorners(spec.notch.cornerRadius),
      // A path override is authored for one orientation only; drop it rather than
      // render it rotated the wrong way, and fall back to the primitive shape.
      path: undefined,
    },
    buttons: spec.buttons?.map((button) => ({
      ...button,
      // 90° clockwise walks the edges round: the left edge becomes the top, the
      // top becomes the right, and so on.
      side: ROTATED_EDGE[button.side],
      // A point (x, y) maps to (H - y, x), so a run spanning [offset, offset +
      // length] down the old edge spans [H - offset - length, H - offset] along
      // the new one.
      offset: H - (button.offset + button.length),
    })),
    screenshot: {
      width: spec.screenshot.height,
      height: spec.screenshot.width,
    },
    viewport: {
      width: spec.viewport.height,
      height: spec.viewport.width,
      scale: spec.viewport.scale,
    },
    bodyPath: undefined,
  };
}

/**
 * Rotated specs are memoised, and that is a correctness requirement rather than
 * an optimisation.
 *
 * Zustand v5 compares selector results with `Object.is`. A selector returning a
 * freshly-built spec on every call therefore looks like a state change on every
 * render, and the component re-renders forever — which is exactly what happened
 * the first time landscape was selected. Portrait hid the bug, because it returns
 * the catalog object itself.
 *
 * Device specs are immutable static data, so caching them is trivially safe.
 */
// Keyed by the spec object, not its id: an admin-edited custom device arrives as
// a fresh object under the same id, and an id-keyed cache would keep serving the
// rotation of the geometry it used to have.
const rotatedCache = new WeakMap<DeviceSpec, DeviceSpec>();

/** Returns the spec as it should be rendered for the given orientation. */
export function orientSpec(spec: DeviceSpec, orientation: Orientation): DeviceSpec {
  if (orientation === "portrait" || !spec.supportsLandscape) return spec;

  const cached = rotatedCache.get(spec);
  if (cached) return cached;

  const rotated = rotateSpec(spec);
  rotatedCache.set(spec, rotated);
  return rotated;
}
