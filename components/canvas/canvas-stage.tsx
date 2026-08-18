"use client";

import { useEffect, useRef } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "react-konva";

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
      width={artboard.width * cardScale}
      height={artboard.height * cardScale}
      scaleX={cardScale}
      scaleY={cardScale}
      onMouseDown={handleBackdropPointerDown}
      onTouchStart={handleBackdropPointerDown}
    >
      <BackgroundLayer screenId={screenId} />
      <ContentLayer screenId={screenId} />
      <OverlayLayer screenId={screenId} cardScale={cardScale} />
    </Stage>
  );
}
