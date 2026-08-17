"use client";

import { useLayoutEffect, useRef } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Rect, Text } from "react-konva";

import { resolveFontFamily } from "@/config/fonts";
import { dragPatch, normalizeTextTransform } from "@/lib/canvas/transform";
import { selectLayerById } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { isTextLayer } from "@/schemas/editor";

/**
 * One text layer, optionally sitting on a filled pill.
 *
 * Subscribes to its own layer only, so moving one caption does not re-render the
 * others — `updateLayer` maps over the array and leaves untouched layers
 * referentially identical, which is what makes that subscription granular.
 */
export function TextNode({
  screenId,
  layerId,
}: {
  screenId: string;
  layerId: string;
}) {
  const layer = useEditorStore((s) => {
    const found = selectLayerById(screenId, layerId)(s);
    return found && isTextLayer(found) ? found : undefined;
  });

  const fontsVersion = useEditorStore((s) => s.fontsVersion);
  const commitTransform = useEditorStore((s) => s.commitTransform);
  const selectLayer = useEditorStore((s) => s.selectLayer);

  const textRef = useRef<Konva.Text>(null);
  const pillRef = useRef<Konva.Rect>(null);

  /**
   * The pill is sized from the text's measured bounds rather than from stored
   * numbers, so it keeps hugging the copy as the wording, font or size changes.
   *
   * Done imperatively rather than through React state on purpose: measuring in
   * an effect and then setting state would render twice per keystroke, and the
   * intermediate frame would show a stale pill behind fresh text.
   *
   * `layer` is a fresh object on any edit to this caption, so depending on it is
   * enough to catch every change that moves the metrics; `fontsVersion` covers
   * the separate case of a face arriving after first paint.
   */
  useLayoutEffect(() => {
    const text = textRef.current;
    if (!text) return;

    // Re-measure with the current font before anything reads the metrics; Konva
    // caches them from construction time.
    text.getLayer()?.batchDraw();

    const pill = pillRef.current;
    if (!pill || !layer?.background) return;

    const { paddingX, paddingY } = layer.background;
    // getTextWidth is the widest rendered line, which is what should be hugged —
    // width() is the wrapping box and is usually much wider.
    const contentWidth = Math.min(text.getTextWidth(), layer.width);
    const contentHeight = text.height();

    const alignOffset =
      layer.align === "center"
        ? (layer.width - contentWidth) / 2
        : layer.align === "right"
          ? layer.width - contentWidth
          : 0;

    pill.setAttrs({
      x: alignOffset - paddingX,
      y: -paddingY,
      width: contentWidth + paddingX * 2,
      height: contentHeight + paddingY * 2,
    });

    pill.getLayer()?.batchDraw();
  }, [layer, fontsVersion]);

  if (!layer || !layer.visible) return null;

  const shadow = layer.shadow;

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    commitTransform(screenId, layerId, dragPatch(e.target));
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    commitTransform(
      screenId,
      layerId,
      normalizeTextTransform(e.target, {
        width: layer.width,
        fontSize: layer.fontSize,
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
      {layer.background && (
        <Rect
          ref={pillRef}
          fill={layer.background.color}
          opacity={layer.background.opacity}
          cornerRadius={layer.background.cornerRadius}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      <Text
        ref={textRef}
        // Konva has no text-transform, so the casing is applied to the string.
        // The document keeps the original, so toggling it back is lossless.
        text={layer.uppercase ? layer.text.toUpperCase() : layer.text}
        width={layer.width}
        fontSize={layer.fontSize}
        fontFamily={resolveFontFamily(layer.fontId)}
        fontStyle={`${layer.italic ? "italic " : ""}${layer.fontWeight}`}
        textDecoration={layer.underline ? "underline" : ""}
        fill={layer.color}
        align={layer.align}
        lineHeight={layer.lineHeight}
        letterSpacing={layer.letterSpacing}
        shadowColor={shadow?.color}
        shadowBlur={shadow?.blur}
        shadowOffsetX={shadow?.offsetX}
        shadowOffsetY={shadow?.offsetY}
        shadowOpacity={shadow?.opacity}
        shadowEnabled={Boolean(shadow)}
        wrap="word"
        // The one listening shape in the group — it gives the Group its hit area,
        // so the caption is clickable and draggable by its glyphs.
        perfectDrawEnabled={Boolean(shadow)}
      />
    </Group>
  );
}
