"use client";

import { useEffect, useRef } from "react";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "react-konva";

import { setStage } from "@/lib/canvas/stage-registry";
import { selectFitScale } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";

import { BackgroundLayer } from "./layers/background-layer";
import { ContentLayer } from "./layers/content-layer";
import { OverlayLayer } from "./layers/overlay-layer";

/**
 * The one module in the app that imports `react-konva` at the top level.
 *
 * Konva touches `window` on import and its reconciler cannot render on the
 * server, so this file is only ever reached through the `ssr: false` dynamic
 * import in canvas-host.tsx. A stray `react-konva` import in any shared module
 * would pull Konva back into the server graph and break `next build` — which is
 * exactly what makes the build a useful canary for it.
 *
 * Everything inside the Stage works in artboard px; the Stage itself absorbs the
 * fit-to-container scale.
 */
export default function CanvasStage() {
  const artboard = useEditorStore((s) => s.doc.artboard);
  const fitScale = useEditorStore(selectFitScale);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const ref = useRef<Konva.Stage>(null);

  useEffect(() => {
    setStage(ref.current);
    return () => setStage(null);
  }, []);

  if (fitScale <= 0) return null;

  const handleBackdropPointerDown = (
    e: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    // Only a click that lands on the Stage itself — not on a shape — is a
    // deselect. Konva reports the Stage as the target when nothing was hit.
    if (e.target === e.target.getStage()) clearSelection();
  };

  return (
    <Stage
      ref={ref}
      width={artboard.width * fitScale}
      height={artboard.height * fitScale}
      scaleX={fitScale}
      scaleY={fitScale}
      onMouseDown={handleBackdropPointerDown}
      onTouchStart={handleBackdropPointerDown}
      className="rounded-lg shadow-xl"
    >
      <BackgroundLayer />
      <ContentLayer />
      <OverlayLayer fitScale={fitScale} />
    </Stage>
  );
}
