"use client";

import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group } from "react-konva";

import { dragPatch, normalizeDeviceTransform } from "@/lib/canvas/transform";
import {
  selectColorwayFor,
  selectImageSource,
  selectLayerById,
  selectOrientedSpec,
} from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { layerAssetKey } from "@/lib/editor/types";
import { isDeviceLayer } from "@/schemas/editor";

import { DeviceFrame } from "./device-frame";
import { DeviceNotch } from "./device-notch";
import { DeviceScreen } from "./device-screen";

/**
 * The device: body, screenshot and notch, as one draggable group.
 *
 * Children are drawn in device px and the Group's `scale` maps them into artboard
 * px, so the catalog's numbers never have to be re-expressed per artboard.
 */
export function DeviceNode({
  screenId,
  layerId,
}: {
  screenId: string;
  layerId: string;
}) {
  const layer = useEditorStore((s) => {
    const found = selectLayerById(screenId, layerId)(s);
    return found && isDeviceLayer(found) ? found : undefined;
  });

  // The spec is document-level: one device model for the whole set, so retargeting
  // the project cannot leave five screens disagreeing about what phone this is.
  const spec = useEditorStore(selectOrientedSpec);
  const screenshotSrc = useEditorStore((s) =>
    layer
      ? selectImageSource(
          s,
          layerAssetKey(screenId, layerId),
          layer.screenshot.url,
        )
      : null,
  );

  const commitTransform = useEditorStore((s) => s.commitTransform);
  const selectLayer = useEditorStore((s) => s.selectLayer);

  if (!layer || !layer.visible) return null;

  const colorway = selectColorwayFor(spec, layer.colorwayId);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    commitTransform(screenId, layerId, dragPatch(e.target));
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    commitTransform(
      screenId,
      layerId,
      normalizeDeviceTransform(e.target as Konva.Node),
    );
  };

  return (
    <Group
      id={layerId}
      name={layerId}
      x={layer.x}
      y={layer.y}
      scaleX={layer.scale}
      scaleY={layer.scale}
      rotation={layer.rotation}
      opacity={layer.opacity}
      draggable={!layer.locked}
      listening={!layer.locked}
      onMouseDown={() => selectLayer(screenId, layerId)}
      onTap={() => selectLayer(screenId, layerId)}
      // Never write state on drag *move*: Konva already moves the node
      // imperatively at 60fps, and a per-tick setState would re-render the whole
      // scene graph behind it.
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      <DeviceFrame
        spec={spec}
        colorway={colorway}
        shadowEnabled={layer.shadowEnabled}
      />
      <DeviceScreen
        spec={spec}
        url={screenshotSrc}
        zoom={layer.screenshot.zoom}
        pan={layer.screenshot.pan}
      />
      <DeviceNotch spec={spec} colorway={colorway} />
    </Group>
  );
}
