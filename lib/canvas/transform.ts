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
 */

const MIN_SIZE = 8;
const MIN_FONT_SIZE = 4;
const MIN_DEVICE_SCALE = 0.01;

export type TransformKind = "device" | "image";

/**
 * Text layers are a Group (pill + text), so the Transformer scales the Group
 * while the values that mean "size" live on the layer: `width` is the wrapping
 * box and `fontSize` is the type size. Both are passed in rather than read off
 * the node, because a Group reports neither.
 */
export function normalizeTextTransform(
  group: Konva.Node,
  current: { width: number; fontSize: number },
): TransformPatch {
  const scaleX = group.scaleX();
  const scaleY = group.scaleY();

  group.scaleX(1);
  group.scaleY(1);

  return {
    x: group.x(),
    y: group.y(),
    rotation: group.rotation(),
    width: Math.max(MIN_SIZE, current.width * scaleX),
    fontSize: Math.max(MIN_FONT_SIZE, current.fontSize * scaleY),
  };
}

export function normalizeTransform(
  node: Konva.Node,
  kind: TransformKind,
): TransformPatch {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();

  const base = {
    x: node.x(),
    y: node.y(),
    rotation: node.rotation(),
  };

  if (kind === "device") {
    // The device Group's scale *is* a document property, so the Transformer's
    // scale is kept rather than baked away. Transformer runs with keepRatio, so
    // the two axes agree; average them to be safe against float drift.
    return {
      ...base,
      scale: Math.max(MIN_DEVICE_SCALE, (scaleX + scaleY) / 2),
    };
  }

  node.scaleX(1);
  node.scaleY(1);

  return {
    ...base,
    width: Math.max(MIN_SIZE, node.width() * scaleX),
    height: Math.max(MIN_SIZE, node.height() * scaleY),
  };
}

/** Position-only commit, for a plain drag where no scaling happened. */
export function dragPatch(node: Konva.Node): TransformPatch {
  return { x: node.x(), y: node.y(), rotation: node.rotation() };
}
