"use client";

import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group } from "react-konva";

import { dragPatch, normalizeTransform } from "@/lib/canvas/transform";
import { selectColorway, selectImageSource, selectOrientedSpec } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { DEVICE_NODE_ID } from "@/lib/editor/types";

import { DeviceFrame } from "./device-frame";
import { DeviceNotch } from "./device-notch";
import { DeviceScreen } from "./device-screen";

/**
 * The device: body, screenshot and notch, as one draggable group.
 *
 * Children are drawn in device px and the Group's `scale` maps them into artboard
 * px, so the catalog's numbers never have to be re-expressed per artboard.
 */
export function DeviceNode() {
  const device = useEditorStore((s) => s.doc.device);
  const spec = useEditorStore(selectOrientedSpec);
  const colorway = useEditorStore(selectColorway);
  const screenshot = useEditorStore((s) => s.doc.screenshot);
  const screenshotSrc = useEditorStore((s) =>
    selectImageSource(s, "screenshot", s.doc.screenshot.url),
  );

  const commitTransform = useEditorStore((s) => s.commitTransform);
  const select = useEditorStore((s) => s.select);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    commitTransform(DEVICE_NODE_ID, dragPatch(e.target));
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    commitTransform(DEVICE_NODE_ID, normalizeTransform(e.target as Konva.Node, "device"));
  };

  return (
    <Group
      id={DEVICE_NODE_ID}
      name={DEVICE_NODE_ID}
      x={device.x}
      y={device.y}
      scaleX={device.scale}
      scaleY={device.scale}
      rotation={device.rotation}
      draggable
      onMouseDown={() => select(DEVICE_NODE_ID)}
      onTap={() => select(DEVICE_NODE_ID)}
      // Never write state on drag *move*: Konva already moves the node
      // imperatively at 60fps, and a per-tick setState would re-render the whole
      // scene graph behind it.
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      <DeviceFrame spec={spec} colorway={colorway} shadowEnabled={device.shadowEnabled} />
      <DeviceScreen
        spec={spec}
        url={screenshotSrc}
        zoom={screenshot.zoom}
        pan={screenshot.pan}
      />
      <DeviceNotch spec={spec} colorway={colorway} />
    </Group>
  );
}
