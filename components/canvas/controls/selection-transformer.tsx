"use client";

import { useEffect, useRef } from "react";
import type Konva from "konva";
import { Transformer } from "react-konva";

import { selectLayerById, selectScreen } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { isDeviceLayer, type LayerKind } from "@/schemas/editor";

/** On-screen size of the handles, in CSS px, regardless of how far the artboard is zoomed out. */
const ANCHOR_SCREEN_SIZE = 10;
const BORDER_SCREEN_WIDTH = 1.5;

const ANCHORS_BY_KIND: Record<LayerKind, string[]> = {
  device: ["top-left", "top-right", "bottom-left", "bottom-right"],
  // Images get all eight, because an image layer's box is a *frame* the artwork is
  // fitted into rather than the artwork itself: reshaping it to a tall banner or a
  // square badge is the whole point of `fit`, and that needs an edge handle.
  image: [
    "top-left",
    "top-center",
    "top-right",
    "middle-left",
    "middle-right",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ],
  text: [
    "middle-left",
    "middle-right",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ],
};

export function SelectionTransformer({
  screenId,
  cardScale,
}: {
  screenId: string;
  cardScale: number;
}) {
  // Only this screen's selection matters. Five Stages each mount a Transformer, so
  // reading the raw selection would have all five re-attach on every click.
  const selectedLayerId = useEditorStore((s) =>
    s.screenId === screenId ? s.layerId : null,
  );
  const selectedLayer = useEditorStore((s) =>
    selectedLayerId ? selectLayerById(screenId, selectedLayerId)(s) : undefined,
  );
  const kind = selectedLayer?.kind;
  // A full-bleed device has no meaningful transform — it is pinned to the
  // artboard — so attaching handles to it would only offer edits that go nowhere.
  const fullBleed =
    selectedLayer && isDeviceLayer(selectedLayer) && selectedLayer.frameMode === "full";
  // Re-attaching when this screen changes covers nodes remounted by an edit —
  // restacking a layer, or swapping the device.
  const screen = useEditorStore(selectScreen(screenId));

  const ref = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const transformer = ref.current;
    if (!transformer) return;

    const stage = transformer.getStage();
    const node =
      selectedLayerId && !fullBleed ? stage?.findOne(`#${selectedLayerId}`) : null;

    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedLayerId, fullBleed, screen]);

  // The Stage is scaled to fit, so handle sizes have to be divided back out or
  // they shrink to nothing on a 2796px-tall artboard.
  const inverse = cardScale > 0 ? 1 / cardScale : 1;

  return (
    <Transformer
      ref={ref}
      rotateEnabled
      // Only a device must keep its ratio — its scale is a single document
      // property, and a squashed phone is never what anyone meant. An image is
      // free to be reframed because `fit` decides what happens to the artwork
      // inside, and the default (`contain`) cannot distort it.
      keepRatio={kind === "device"}
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
