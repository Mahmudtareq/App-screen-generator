"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

import { useElementSize } from "@/hooks/use-element-size";
import { CANVAS_PADDING } from "@/lib/canvas/fit";
import { ensureFontsLoaded, watchFontLoading } from "@/lib/canvas/fonts";
import { useEditorStore } from "@/lib/editor/store";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The SSR boundary for the whole canvas.
 *
 * This component must itself be a Client Component: in the App Router,
 * `next/dynamic` with `ssr: false` inside a Server Component is a build error.
 */
const CanvasStage = dynamic(() => import("./canvas-stage"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full max-h-[70vh] max-w-sm" />,
});

export function CanvasHost() {
  const setContainerSize = useEditorStore((s) => s.setContainerSize);
  const setFontsReady = useEditorStore((s) => s.setFontsReady);
  const bumpFontsVersion = useEditorStore((s) => s.bumpFontsVersion);
  const fontsReady = useEditorStore((s) => s.fontsReady);
  const containerWidth = useEditorStore((s) => s.containerWidth);

  const ref = useElementSize<HTMLDivElement>(({ width, height }) =>
    setContainerSize(width, height),
  );

  // Gate the first Stage render on the canvas fonts. Konva bakes text metrics at
  // construction time, so painting before the faces land produces wrong line
  // breaks that then visibly snap into place a moment later.
  useEffect(() => {
    let cancelled = false;

    ensureFontsLoaded().then(() => {
      if (!cancelled) setFontsReady(true);
    });

    const unwatch = watchFontLoading(bumpFontsVersion);

    return () => {
      cancelled = true;
      unwatch();
    };
  }, [setFontsReady, bumpFontsVersion]);

  // No separate "mounted" flag is needed to avoid a hydration mismatch: the Stage
  // is already behind `ssr: false`, and containerWidth is only ever non-zero once
  // the client-side ResizeObserver has measured the box.
  const ready = fontsReady && containerWidth > 0;

  return (
    <div
      ref={ref}
      className="relative flex h-full w-full items-center justify-center overflow-hidden bg-muted/40"
      style={{ padding: CANVAS_PADDING }}
    >
      {ready ? (
        <CanvasStage />
      ) : (
        <Skeleton className="h-full max-h-[70vh] w-full max-w-sm" />
      )}
    </div>
  );
}
