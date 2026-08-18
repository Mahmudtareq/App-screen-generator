"use client";

import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Image as KonvaImage, Rect } from "react-konva";

import { useMemo } from "react";

import { useCanvasBitmap } from "@/hooks/use-canvas-image";
import { placeImage } from "@/lib/canvas/object-fit";
import { tintedBitmap } from "@/lib/canvas/tint";
import { dragPatch, normalizeBoxTransform } from "@/lib/canvas/transform";
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
 *
 * The layer is a Group holding a transparent box and the bitmap fitted inside it,
 * the same shape a text layer has. That separation is what `fit` needs to exist at
 * all: the box is what gets dragged, hit-tested and resized, while the bitmap is
 * free to be letterboxed or cropped within it without the two ever disagreeing
 * about where the layer is.
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
  const tint = layer?.tint ?? null;

  // The tinted copy is a bitmap of its own, memoised by source and tint so five
  // screens showing the same badge share one canvas.
  const boxLongEdge = layer ? Math.max(layer.width, layer.height) : 0;

  const painted = useMemo(
    () =>
      (bitmap && src && tint
        ? tintedBitmap(src, bitmap, tint, boxLongEdge)
        : null) ?? bitmap,
    [bitmap, src, tint, boxLongEdge],
  );

  // Nothing is drawn until an image is chosen: a placeholder rectangle on the
  // canvas would end up in an export the moment someone forgot to fill it in.
  if (!layer || !layer.visible || !bitmap || !painted) return null;

  const placement = placeImage(
    { width: bitmap.naturalWidth, height: bitmap.naturalHeight },
    layer,
    layer.fit,
    layer.align,
  );

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    commitTransform(screenId, layerId, dragPatch(e.target));
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    commitTransform(
      screenId,
      layerId,
      normalizeBoxTransform(e.target, {
        width: layer.width,
        height: layer.height,
      }),
    );
  };

  return (
    <Group
      id={layerId}
      name={layerId}
      x={layer.x}
      y={layer.y}
      rotation={layer.rotation}
      opacity={layer.opacity}
      draggable={!layer.locked}
      listening={!layer.locked}
      onMouseDown={() => selectLayer(screenId, layerId)}
      onTap={() => selectLayer(screenId, layerId)}
      // Never write state on drag *move*: Konva already moves the node
      // imperatively at 60fps, and a per-tick setState would re-render the scene.
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    >
      {/*
        The box: the Group's hit area and what the Transformer measures. Without it
        a letterboxed image would only be grabbable on its pixels, and the handles
        would snap in to hug the artwork rather than the frame being resized.
      */}
      <Rect
        x={0}
        y={0}
        width={layer.width}
        height={layer.height}
        fill="transparent"
        perfectDrawEnabled={false}
      />

      <KonvaImage
        image={painted}
        x={placement.x}
        y={placement.y}
        width={placement.width}
        height={placement.height}
        crop={placement.crop}
        cornerRadius={layer.cornerRadius}
        listening={false}
      />
    </Group>
  );
}
