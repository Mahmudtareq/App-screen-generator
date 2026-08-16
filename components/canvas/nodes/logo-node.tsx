"use client";

import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Image as KonvaImage } from "react-konva";

import { useCanvasBitmap } from "@/hooks/use-canvas-image";
import { dragPatch, normalizeTransform } from "@/lib/canvas/transform";
import { selectImageSource } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { LOGO_NODE_ID } from "@/lib/editor/types";

export function LogoNode() {
  const logo = useEditorStore((s) => s.doc.logo);
  const src = useEditorStore((s) =>
    s.doc.logo ? selectImageSource(s, "logo", s.doc.logo.url) : null,
  );
  const commitTransform = useEditorStore((s) => s.commitTransform);
  const select = useEditorStore((s) => s.select);

  const bitmap = useCanvasBitmap(src);

  if (!logo || !logo.visible || !bitmap) return null;

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    commitTransform(LOGO_NODE_ID, dragPatch(e.target));
  };

  const handleTransformEnd = (e: KonvaEventObject<Event>) => {
    commitTransform(LOGO_NODE_ID, normalizeTransform(e.target as Konva.Node, "image"));
  };

  return (
    <KonvaImage
      id={LOGO_NODE_ID}
      name={LOGO_NODE_ID}
      image={bitmap}
      x={logo.x}
      y={logo.y}
      width={logo.width}
      height={logo.height}
      rotation={logo.rotation}
      opacity={logo.opacity}
      cornerRadius={logo.cornerRadius}
      draggable
      onMouseDown={() => select(LOGO_NODE_ID)}
      onTap={() => select(LOGO_NODE_ID)}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
    />
  );
}
