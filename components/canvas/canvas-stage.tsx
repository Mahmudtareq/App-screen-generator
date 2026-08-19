"use client";

import { useEffect, useMemo, useRef } from "react";
import type Konva from "konva";
import type { Context } from "konva/lib/Context";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "react-konva";

import {
  ARTBOARD_CORNER_RADIUS,
  CANVAS_GUTTER_X,
  CANVAS_GUTTER_Y,
} from "@/lib/canvas/fit";
import { setStage } from "@/lib/canvas/stage-registry";
import { selectCardScale } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";

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
  const artboard = useEditorStore((s) => s.doc.artboard);
  const cardScale = useEditorStore(selectCardScale);
  const selectLayer = useEditorStore((s) => s.selectLayer);

  const ref = useRef<Konva.Stage>(null);

  useEffect(() => {
    setStage(screenId, ref.current);
    return () => setStage(screenId, null);
  }, [screenId]);

  // Artwork is clipped to the artboard (with the ring's corner rounding) so
  // nothing paints into the gutter — that margin belongs to the selection chrome
  // alone. Export clears this clip and crops the gutter away instead.
  const clipArtboard = useMemo(() => {
    const { width, height } = artboard;
    const radius = Math.min(
      cardScale > 0 ? ARTBOARD_CORNER_RADIUS / cardScale : 0,
      width / 2,
      height / 2,
    );
    return (ctx: Context) => {
      ctx.moveTo(radius, 0);
      ctx.arcTo(width, 0, width, height, radius);
      ctx.arcTo(width, height, 0, height, radius);
      ctx.arcTo(0, height, 0, 0, radius);
      ctx.arcTo(0, 0, width, 0, radius);
      ctx.closePath();
    };
  }, [artboard, cardScale]);

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
