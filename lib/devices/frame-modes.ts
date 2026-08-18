import type { DeviceLayer, DevicePerspective, FrameMode } from "@/schemas/editor";

/**
 * The "Device type" control, as one flat list.
 *
 * The document stores two orthogonal fields — what is drawn (`frameMode`) and
 * how it leans (`perspective`) — because they vary independently and a single
 * seven-value enum would force every consumer to decode combinations. The UI
 * still presents one dropdown, matching how people think about it, so this
 * table is the mapping between the two shapes.
 */
export interface DeviceTypeOption {
  id: string;
  label: string;
  frameMode: FrameMode;
  perspective: DevicePerspective;
}

export const DEVICE_TYPE_OPTIONS: readonly DeviceTypeOption[] = [
  { id: "flat", label: "Flat device mockup", frameMode: "device", perspective: "none" },
  { id: "3d-right", label: "3D device mockup (right)", frameMode: "device", perspective: "right" },
  { id: "3d-left", label: "3D device mockup (left)", frameMode: "device", perspective: "left" },
  { id: "screenshot", label: "Screenshot only", frameMode: "screenshot", perspective: "none" },
  { id: "3d-screenshot-right", label: "3D screenshot (right)", frameMode: "screenshot", perspective: "right" },
  { id: "3d-screenshot-left", label: "3D screenshot (left)", frameMode: "screenshot", perspective: "left" },
  { id: "full-screen", label: "Full screen", frameMode: "full", perspective: "none" },
];

/** The option a layer's stored fields correspond to, for the select's value. */
export function deviceTypeOf(
  layer: Pick<DeviceLayer, "frameMode" | "perspective">,
): DeviceTypeOption {
  return (
    DEVICE_TYPE_OPTIONS.find(
      (option) =>
        option.frameMode === layer.frameMode &&
        // Full-screen ignores perspective entirely, so any stored lean still
        // reads back as the one full-screen option.
        (option.frameMode === "full" || option.perspective === layer.perspective),
    ) ?? DEVICE_TYPE_OPTIONS[0]
  );
}

/**
 * The affine lean, as Konva node props.
 *
 * `skewY` is a tangent, not degrees: 0.14 tilts horizontal edges ~8°. The slight
 * `scaleX` narrows the body the way foreshortening would. Applied to an inner
 * group pivoting on the body's centre — never to the outer draggable group,
 * whose scaleX/scaleY the Transformer owns and `normalizeTransform` expects to
 * stay uniform.
 */
export function perspectiveProps(perspective: DevicePerspective): {
  skewY: number;
  scaleX: number;
} {
  switch (perspective) {
    case "left":
      return { skewY: 0.14, scaleX: 0.92 };
    case "right":
      return { skewY: -0.14, scaleX: 0.92 };
    case "none":
      return { skewY: 0, scaleX: 1 };
  }
}
