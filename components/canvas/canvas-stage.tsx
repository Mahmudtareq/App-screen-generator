"use client";

import { useEffect, useMemo, useRef } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "react-konva";

import { artboardClipFunc } from "@/lib/canvas/artboard-clip";
import {
  ARTBOARD_CORNER_RADIUS,
  CANVAS_GUTTER_X,
  CANVAS_GUTTER_Y,
} from "@/lib/canvas/fit";
import { setStage } from "@/lib/canvas/stage-registry";
import {
  selectScreen,
  selectScreenArtboard,
  selectScreenScale,
} from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { ZERO_CORNERS } from "@/schemas/editor";

import { BackgroundLayer } from "./layers/background-layer";
import { ContentLayer } from "./layers/content-layer";
import { OverlayLayer } from "./layers/overlay-layer";

/**
 * One screen, as a Konva Stage.
 *
 * The one module in the app that imports `react-konva` at the top level — Konva
 * touches `window` on import and its reconciler cannot render on the server, so
 * this file is only ever reached through the `ssr: false` dynamic import in
 * canvas-host.tsx. A stray `react-konva` import in any shared module would pull
 * Konva back into the server graph and break `next build`, which is exactly what
 * makes the build a useful canary for it.
 *
 * Everything inside the Stage works in artboard px; the Stage itself absorbs the
 * fit-to-strip scale.
 */
export default function CanvasStage({ screenId }: { screenId: string }) {
  const artboard = useEditorStore(selectScreenArtboard(screenId));
  const cardScale = useEditorStore(selectScreenScale(screenId));
  const selectLayer = useEditorStore((s) => s.selectLayer);
  const corners = useEditorStore(
    (s) => selectScreen(screenId)(s)?.corners ?? ZERO_CORNERS,
  );

  const ref = useRef<Konva.Stage>(null);

  useEffect(() => {
    setStage(screenId, ref.current);
    return () => setStage(screenId, null);
  }, [screenId]);

  // Artwork is clipped to the artboard so nothing paints into the gutter — that
  // margin belongs to the selection chrome alone. Each corner rounds by the
  // screen's own radius or the card ring's cosmetic minimum, whichever is
  // larger; export swaps this clip for the document radii alone and crops the
  // gutter away.
  const clipArtboard = useMemo(() => {
    const cosmetic = cardScale > 0 ? ARTBOARD_CORNER_RADIUS / cardScale : 0;
    return artboardClipFunc(artboard, {
      topLeft: Math.max(corners.topLeft, cosmetic),
      topRight: Math.max(corners.topRight, cosmetic),
      bottomRight: Math.max(corners.bottomRight, cosmetic),
      bottomLeft: Math.max(corners.bottomLeft, cosmetic),
    });
  }, [artboard, cardScale, corners]);

  if (cardScale <= 0) return null;

  const handleBackdropPointerDown = (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    // Only a click that lands on the Stage itself — not on a shape — is a
    // deselect. Konva reports the Stage as the target when nothing was hit.
    // The screen stays selected: clicking its empty canvas is not a request to
    // close the inspector that was opened by clicking the same card.
    if (e.target === e.target.getStage()) selectLayer(screenId, null);
  };

  return (
    <Stage
      ref={ref}
      width={artboard.width * cardScale + CANVAS_GUTTER_X * 2}
      height={artboard.height * cardScale + CANVAS_GUTTER_Y * 2}
      x={CANVAS_GUTTER_X}
      y={CANVAS_GUTTER_Y}
      scaleX={cardScale}
      scaleY={cardScale}
      onMouseDown={handleBackdropPointerDown}
      onTouchStart={handleBackdropPointerDown}
    >
      <BackgroundLayer screenId={screenId} clipFunc={clipArtboard} />
      <ContentLayer screenId={screenId} clipFunc={clipArtboard} />
      <OverlayLayer screenId={screenId} cardScale={cardScale} />
    </Stage>
  );
}
