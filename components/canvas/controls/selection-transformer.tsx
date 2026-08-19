"use client";

import type Konva from "konva";
import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";

import { selectLayerById, selectScreen } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { isDeviceLayer, type LayerKind } from "@/schemas/editor";

/** On-screen size of the handles, in CSS px, regardless of how far the artboard is zoomed out. */
const ANCHOR_SCREEN_SIZE = 6;
/** The grab target is much larger than the dot itself — small handles, easy to hit. */
const ANCHOR_HIT_SCREEN_SIZE = 10;
const BORDER_SCREEN_WIDTH = 1;

const ANCHORS_BY_KIND: Record<LayerKind, string[]> = {
  device: ["top-left", "top-right", "bottom-left", "bottom-right"],
  // Images get all eight, because an image layer's box is a *frame* the artwork is
  // fitted into rather than the artwork itself: reshaping it to a tall banner or a
  // square badge is the whole point of `fit`, and that needs an edge handle.
  image: [
    "top-left",
    // "top-center",
    "top-right",
    // "middle-left",
    // "middle-right",
    "bottom-left",
    // "bottom-center",
    "bottom-right",
  ],
  text: [
    // "middle-left",
    // "middle-right",
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
    selectedLayer &&
    isDeviceLayer(selectedLayer) &&
    selectedLayer.frameMode === "full";
  // Re-attaching when this screen changes covers nodes remounted by an edit —
  // restacking a layer, or swapping the device.
  const screen = useEditorStore(selectScreen(screenId));

  const ref = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const transformer = ref.current;
    if (!transformer) return;

    const stage = transformer.getStage();
    const node =
      selectedLayerId && !fullBleed
        ? stage?.findOne(`#${selectedLayerId}`)
        : null;

    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selectedLayerId, fullBleed, screen]);

  // The Stage is scaled to fit, so handle sizes have to be divided back out or
  // they shrink to nothing on a 2796px-tall artboard.
  const inverse = cardScale > 0 ? 1 / cardScale : 1;

  // The dashed border is white, which vanishes over light artwork. A whisper of
  // shadow keeps it legible everywhere; Konva has no border-shadow props, so the
  // internal `back` shape (border rect + rotate stalk) is styled directly.
  useEffect(() => {
    const back = ref.current?.findOne<Konva.Shape>(".back");
    if (!back) return;
    back.shadowColor("rgba(0, 0, 0, 0.4)");
    back.shadowBlur(2 * inverse);
    back.shadowEnabled(true);
  }, [inverse]);

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
      anchorFill="#ffffff"
      anchorStroke="#d4d4d8"
      anchorStrokeWidth={1 * inverse}
      // Round handles with a drop shadow read on light and dark artwork alike;
      // shadows are not exposed as Transformer props, only through this hook.
      anchorStyleFunc={(anchor) => {
        anchor.cornerRadius(anchor.width() / 2);
        anchor.shadowColor("rgba(0, 0, 0, 0.35)");
        anchor.shadowBlur(3 * inverse);
        anchor.shadowOffset({ x: 0, y: 1 * inverse });
        anchor.shadowEnabled(true);
        // The visible dot is small on purpose; the invisible grab target is not.
        const pad = Math.max(
          0,
          (ANCHOR_HIT_SCREEN_SIZE * inverse - anchor.width()) / 2,
        );
        anchor.hitFunc((ctx, shape) => {
          ctx.beginPath();
          ctx.rect(
            -pad,
            -pad,
            shape.width() + pad * 2,
            shape.height() + pad * 2,
          );
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        });
      }}
      borderStroke="rgba(255, 255, 255, 0.9)"
      borderDash={[4 * inverse, 3 * inverse]}
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
