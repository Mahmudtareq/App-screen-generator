"use client";

import { useEffect, useRef } from "react";
import type Konva from "konva";
import { Transformer } from "react-konva";

import { useEditorStore } from "@/lib/editor/store";
import { selectionKind } from "@/lib/editor/types";

/** On-screen size of the handles, in CSS px, regardless of how far the artboard is zoomed out. */
const ANCHOR_SCREEN_SIZE = 10;
const BORDER_SCREEN_WIDTH = 1.5;

const ANCHORS_BY_KIND: Record<string, string[]> = {
  device: ["top-left", "top-right", "bottom-left", "bottom-right"],
  image: ["top-left", "top-right", "bottom-left", "bottom-right"],
  text: [
    "middle-left",
    "middle-right",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ],
};

export function SelectionTransformer({ fitScale }: { fitScale: number }) {
  const selectedId = useEditorStore((s) => s.selectedId);
  // Re-attaching when the document changes covers nodes that get remounted by an
  // edit — swapping the device, or adding a text layer.
  const doc = useEditorStore((s) => s.doc);

  const ref = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const transformer = ref.current;
    if (!transformer) return;

    const stage = transformer.getStage();
    const node = selectedId ? stage?.findOne(`#${selectedId}`) : null;

    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, doc]);

  const kind = selectionKind(selectedId);

  // The Stage is scaled to fit, so handle sizes have to be divided back out or
  // they shrink to nothing on a 2796px-tall artboard.
  const inverse = fitScale > 0 ? 1 / fitScale : 1;

  return (
    <Transformer
      ref={ref}
      rotateEnabled
      keepRatio={kind !== "text"}
      enabledAnchors={kind ? ANCHORS_BY_KIND[kind] : []}
      anchorSize={ANCHOR_SCREEN_SIZE * inverse}
      anchorStrokeWidth={1 * inverse}
      anchorCornerRadius={2 * inverse}
      borderStrokeWidth={BORDER_SCREEN_WIDTH * inverse}
      rotateAnchorOffset={24 * inverse}
      padding={4 * inverse}
      ignoreStroke
      // Konva reports the *new* box during a resize; refusing degenerate boxes
      // here stops a fast drag past the opposite edge from flipping the node.
      boundBoxFunc={(oldBox, newBox) =>
        newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
      }
    />
  );
}
