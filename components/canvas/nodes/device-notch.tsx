"use client";

import { Path, Rect } from "react-konva";

import { resolveNotchRect, toKonvaRadius } from "@/lib/devices/geometry";
import type { Colorway, DeviceSpec } from "@/lib/devices/types";

/**
 * The notch, dynamic island or punch-hole.
 *
 * Drawn as an opaque shape *on top of* the screenshot, filled with the body
 * colour — never modelled as a hole cut out of the screen. Visually identical,
 * but it keeps the screen clip a plain rounded rect (no even-odd winding rules to
 * debug) and lets a colourway tint the island separately from the bezel.
 */
export function DeviceNotch({
  spec,
  colorway,
}: {
  spec: DeviceSpec;
  colorway: Colorway;
}) {
  const rect = resolveNotchRect(spec);
  if (!rect) return null;

  // The classic iPhone notch has inverted fillets where it meets the bezel, which
  // a rounded rect cannot express — those devices supply a path instead.
  if (spec.notch.path) {
    return (
      <Path
        data={spec.notch.path}
        x={spec.screen.x}
        y={spec.screen.y}
        fill={colorway.style.bodyFill}
        listening={false}
        perfectDrawEnabled={false}
      />
    );
  }

  return (
    <Rect
      {...rect}
      cornerRadius={toKonvaRadius(spec.notch.cornerRadius)}
      fill={colorway.style.bodyFill}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}
