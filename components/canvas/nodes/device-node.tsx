"use client";

import { useMemo } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Rect } from "react-konva";

import { dragPatch, normalizeDeviceTransform } from "@/lib/canvas/transform";
import { toKonvaRadius } from "@/lib/devices/geometry";
import { perspectiveProps } from "@/lib/devices/frame-modes";
import {
  selectColorwayFor,
  selectImageSource,
  selectLayerById,
  selectOrientedSpec,
} from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { layerAssetKey } from "@/lib/editor/types";
import { isDeviceLayer, type DeviceLayer } from "@/schemas/editor";

import { DeviceFrame } from "./device-frame";
import { DeviceNotch } from "./device-notch";
import { DeviceScreen, ScreenshotImage } from "./device-screen";

/**
 * The device: body, screenshot and notch, as one draggable group.
 *
 * Children are drawn in device px and the Group's `scale` maps them into artboard
 * px, so the catalog's numbers never have to be re-expressed per artboard.
 *
 * The layer's `frameMode` decides how much of that is drawn: the full frame, the
 * bare screenshot with the screen's rounded corners, or a full-artboard bleed
 * that ignores the transform entirely. The pseudo-3D lean lives on an *inner*
 * group pivoting on the body centre — the outer group's scale belongs to the
 * Transformer, and `normalizeDeviceTransform` assumes it stays uniform.
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

  if (layer.frameMode === "full") {
    return (
      <FullBleedDevice
        layer={layer}
        url={screenshotSrc}
        screenFill={colorway.style.screenFill}
        onSelect={() => selectLayer(screenId, layerId)}
      />
    );
  }

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

  const framed = layer.frameMode === "device";
  const tilt = perspectiveProps(layer.perspective);
  const centerX = spec.body.width / 2;
  const centerY = spec.body.height / 2;
  const shadow = layer.shadowEnabled ? colorway.style.shadow : undefined;

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
      <Group
        x={centerX}
        y={centerY}
        offsetX={centerX}
        offsetY={centerY}
        skewY={tilt.skewY}
        scaleX={tilt.scaleX}
      >
        {framed ? (
          <DeviceFrame
            spec={spec}
            colorway={colorway}
            shadowEnabled={layer.shadowEnabled}
          />
        ) : (
          // Bare-screenshot mode: this rect is the placeholder before an upload,
          // the letterbox fill under `contain`, the drop shadow's caster, and —
          // being the one listening shape — the group's hit area.
          <Rect
            x={spec.screen.x}
            y={spec.screen.y}
            width={spec.screen.width}
            height={spec.screen.height}
            cornerRadius={toKonvaRadius(spec.screen.cornerRadius)}
            fill={colorway.style.screenFill}
            shadowColor={shadow?.color}
            shadowBlur={shadow?.blur}
            shadowOffsetX={shadow?.offsetX}
            shadowOffsetY={shadow?.offsetY}
            shadowOpacity={shadow?.opacity}
          />
        )}
        <DeviceScreen
          spec={spec}
          url={screenshotSrc}
          fit={layer.screenshot.fit}
          zoom={layer.screenshot.zoom}
          pan={layer.screenshot.pan}
        />
        {framed && <DeviceNotch spec={spec} colorway={colorway} />}
      </Group>
    </Group>
  );
}

/**
 * Full-screen mode: the screenshot bleeds across the whole artboard.
 *
 * Pinned at the origin and not draggable — there is nowhere for a full-bleed
 * image to be dragged to — but still selectable, so the panel stays reachable by
 * clicking the artwork. The selection Transformer skips it for the same reason
 * (see selection-transformer.tsx).
 */
function FullBleedDevice({
  layer,
  url,
  screenFill,
  onSelect,
}: {
  layer: DeviceLayer;
  url: string | null;
  screenFill: string;
  onSelect: () => void;
}) {
  const artboard = useEditorStore((s) => s.doc.artboard);

  const rect = useMemo(
    () => ({ x: 0, y: 0, width: artboard.width, height: artboard.height }),
    [artboard.width, artboard.height],
  );

  return (
    <Group
      id={layer.id}
      name={layer.id}
      x={0}
      y={0}
      opacity={layer.opacity}
      listening={!layer.locked}
      onMouseDown={onSelect}
      onTap={onSelect}
    >
      <Rect {...rect} fill={screenFill} />
      <ScreenshotImage
        rect={rect}
        cornerRadius={0}
        url={url}
        // Cover is forced: letterboxing a mode whose whole point is edge-to-edge
        // would just re-invent the framed modes with extra bars.
        fit="cover"
        zoom={layer.screenshot.zoom}
        pan={layer.screenshot.pan}
      />
    </Group>
  );
}
