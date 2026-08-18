import type Konva from "konva";

import type { TransformPatch } from "@/lib/editor/types";

/**
 * Konva's Transformer resizes by mutating `scaleX` / `scaleY`, not `width` /
 * `height`.
 *
 * Persisting those raw is a trap: a text node resized once stores `scaleX: 2.4`,
 * and from then on its stroke, shadow blur and letter spacing all render at
 * 2.4x too, while successive resizes compound into non-uniform garbage. So every
 * transform is normalised here — scale is reset to 1 and folded into the property
 * that actually means "size" for that kind of node.
 *
 * This lives in one place on purpose. Doing it ad hoc inside each canvas
 * component is how the drift gets reintroduced.
 *
 * There is one function per node *shape* rather than one with a `kind` switch,
 * because the shapes genuinely differ in what they can report: text and image
 * layers are Groups holding a transparent box, and a Group reports no size of its
 * own, so the current values have to be passed in from the document.
 */

const MIN_SIZE = 8;
const MIN_FONT_SIZE = 4;
const MIN_DEVICE_SCALE = 0.01;

/** Scale off the node, so the caller only has to fold it into its own units. */
function takeScale(group: Konva.Node): { x: number; y: number } {
  const scale = { x: group.scaleX(), y: group.scaleY() };

  group.scaleX(1);
  group.scaleY(1);

  return scale;
}

function position(node: Konva.Node) {
  return { x: node.x(), y: node.y(), rotation: node.rotation() };
}

/**
 * A text layer's size lives in two properties: `width` is the wrapping box and
 * `fontSize` is the type size, so a horizontal drag rewraps and a vertical one
 * resizes the type.
 */
export function normalizeTextTransform(
  group: Konva.Node,
  current: { width: number; fontSize: number },
): TransformPatch {
  const scale = takeScale(group);

  return {
    ...position(group),
    width: Math.max(MIN_SIZE, current.width * scale.x),
    fontSize: Math.max(MIN_FONT_SIZE, current.fontSize * scale.y),
  };
}

/**
 * An image layer's size is its box.
 *
 * The bitmap inside is positioned by `placeImage` and is not what the handles
 * measure — resizing changes the frame the image is fitted into, which is the only
 * reading under which `fit` and `align` keep meaning anything.
 */
export function normalizeBoxTransform(
  group: Konva.Node,
  current: { width: number; height: number },
): TransformPatch {
  const scale = takeScale(group);

  return {
    ...position(group),
    width: Math.max(MIN_SIZE, current.width * scale.x),
    height: Math.max(MIN_SIZE, current.height * scale.y),
  };
}

/**
 * A device Group's scale *is* a document property, so the Transformer's scale is
 * kept rather than baked away into a width.
 */
export function normalizeDeviceTransform(group: Konva.Node): TransformPatch {
  // keepRatio is on for devices, so the two axes agree; averaging is insurance
  // against float drift rather than a real disagreement.
  const scale = (group.scaleX() + group.scaleY()) / 2;

  return {
    ...position(group),
    scale: Math.max(MIN_DEVICE_SCALE, scale),
  };
}

/** Position-only commit, for a plain drag where no scaling happened. */
export function dragPatch(node: Konva.Node): TransformPatch {
  return position(node);
}
