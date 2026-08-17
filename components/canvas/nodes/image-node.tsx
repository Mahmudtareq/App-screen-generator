"use client";

import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Image as KonvaImage } from "react-konva";

import { useCanvasBitmap } from "@/hooks/use-canvas-image";
import { dragPatch, normalizeTransform } from "@/lib/canvas/transform";
import { selectImageSource, selectLayerById } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { layerAssetKey } from "@/lib/editor/types";
import { isImageLayer } from "@/schemas/editor";

/**
 * A free-floating image — a logo, a badge, a decorative shape.
 *
 * Any number of these can sit anywhere in a screen's stack, which is what the
 * ordered layer array buys over the single logo slot it replaced: a badge behind
 * the device and a caption sticker in front of it are the same component twice,
 * differing only in where they sit in `layers`.
 */
export function ImageNode({
  screenId,
  layerId,
}: {
  screenId: string;
  layerId: string;
}) {
  const layer = useEditorStore((s) => {
    const found = selectLayerById(screenId, layerId)(s);
    return found && isImageLayer(found) ? found : undefined;
  });

  const src = useEditorStore((s) =>
    layer
      ? selectImageSource(s, layerAssetKey(screenId, layerId), layer.url)
      : null,
  );

  const commitTransform = useEditorStore((s) => s.commitTransform);
  const selectLayer = useEditorStore((s) => s.selectLayer);

  const bitmap = useCanvasBitmap(src);

  // Nothing is drawn until an image is chosen: a placeholder rectangle on the
  // canvas would end up in an export the moment someone forgot to fill it in.
  if (!layer || !layer.visible || !bitmap) return null;

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    commitTransform(screenId, layerId, dragPatch(e.target));
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    commitTransform(
      screenId,
      layerId,
      normalizeTransform(e.target as Konva.Node, "image"),
    );
  };

  return (
    <KonvaImage
      id={layerId}
      name={layerId}
      image={bitmap}
      x={layer.x}
      y={layer.y}
      width={layer.width}
      height={layer.height}
      rotation={layer.rotation}
      opacity={layer.opacity}
      cornerRadius={layer.cornerRadius}
      draggable={!layer.locked}
      listening={!layer.locked}
      onMouseDown={() => selectLayer(screenId, layerId)}
      onTap={() => selectLayer(screenId, layerId)}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    />
  );
}
