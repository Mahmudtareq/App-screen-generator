"use client";

import { useMemo } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Group, Rect, Text } from "react-konva";

import { resolveFontFamily } from "@/config/fonts";
import { layoutRichText } from "@/lib/canvas/rich-text";
import { dragPatch, normalizeTextTransform } from "@/lib/canvas/transform";
import { selectLayerById } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { isTextLayer } from "@/schemas/editor";

/**
 * One text layer — a run of styled fragments, optionally sitting on a filled pill.
 *
 * Subscribes to its own layer only, so moving one caption does not re-render the
 * others — `updateLayer` maps over the array and leaves untouched layers
 * referentially identical, which is what makes that subscription granular.
 *
 * Every position here comes from `layoutRichText`, including the pill's, so nothing
 * has to be measured off a mounted node after the fact. That is what removed the
 * old measure-then-redraw pass: the pill used to be sized imperatively from the
 * rendered Text, which meant one frame where a fresh string sat behind a stale pill.
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

  const layout = useMemo(() => {
    // Every width below is measured against the font currently resolvable, so a
    // face arriving after first paint invalidates the whole layout.
    void fontsVersion;
    return layer ? layoutRichText(layer) : null;
  }, [layer, fontsVersion]);

  if (!layer || !layout || !layer.visible) return null;

  const shadow = layer.shadow;
  const fontFamily = resolveFontFamily(layer.fontId);

  // Where the content sits inside the wrap box — the pill hugs the copy, not the box.
  const alignOffset =
    layer.align === "center"
      ? (layer.width - layout.width) / 2
      : layer.align === "right"
        ? layer.width - layout.width
        : 0;

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
          x={alignOffset - layer.background.paddingX}
          y={-layer.background.paddingY}
          width={layout.width + layer.background.paddingX * 2}
          height={layout.height + layer.background.paddingY * 2}
          fill={layer.background.color}
          opacity={layer.background.opacity}
          cornerRadius={layer.background.cornerRadius}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}

      {layout.fragments.map(
        (fragment) =>
          fragment.highlight && (
            <Rect
              key={`highlight-${fragment.key}`}
              x={fragment.x}
              y={fragment.lineTop}
              width={fragment.width}
              height={layout.lineHeightPx}
              fill={fragment.highlight}
              listening={false}
              perfectDrawEnabled={false}
            />
          ),
      )}

      {/*
        The group's hit area and the box the Transformer measures, both of which
        used to fall out of the single full-width Text node this replaced. Without
        it the caption would only be grabbable on its glyphs, and the transform
        handles would snap in to hug the copy rather than the wrap box the width
        handle actually edits.
      */}
      <Rect
        x={0}
        y={0}
        width={layer.width}
        height={layout.height}
        fill="transparent"
        perfectDrawEnabled={false}
      />

      {layout.fragments.map((fragment) => (
        <Text
          key={fragment.key}
          x={fragment.x}
          y={fragment.y}
          text={fragment.text}
          fontSize={layer.fontSize}
          fontFamily={fontFamily}
          fontStyle={fragment.fontStyle}
          textDecoration={fragment.textDecoration}
          fill={fragment.fill}
          lineHeight={layer.lineHeight}
          letterSpacing={layer.letterSpacing}
          shadowColor={shadow?.color}
          shadowBlur={shadow?.blur}
          shadowOffsetX={shadow?.offsetX}
          shadowOffsetY={shadow?.offsetY}
          shadowOpacity={shadow?.opacity}
          shadowEnabled={Boolean(shadow)}
          // Already wrapped and placed; letting Konva wrap again would re-break
          // a fragment that is only part of a line.
          wrap="none"
          listening={false}
          perfectDrawEnabled={Boolean(shadow)}
        />
      ))}
    </Group>
  );
}
