"use client";

import { useEffect, useMemo, useRef } from "react";
import { ImageOff } from "lucide-react";

import { useCanvasBitmap } from "@/hooks/use-canvas-image";
import { tintedBitmap } from "@/lib/canvas/tint";
import { cn } from "@/lib/utils";
import type { ImageTint } from "@/schemas/editor";

import { CHECKERBOARD } from "./image-checkerboard";

/**
 * The layer's current artwork, on a transparency checkerboard.
 *
 * Shown at the top of the inspector because an image layer is otherwise identified
 * only by "layer 4 (top)" — with five screens and a stack each, the fastest way to
 * know which layer a panel is editing is to see the picture in it.
 *
 * The tint is applied here too, from the same cached canvas the node draws. A
 * thumbnail showing the untinted original while the frame beside it shows crimson
 * is worse than no thumbnail: it is a control panel disagreeing with its own canvas.
 */
export function ImagePreview({
  url,
  tint,
  boxLongEdge,
  className,
}: {
  url: string | null;
  tint?: ImageTint | null;
  /**
   * The layer's longest side, passed through so this shares the canvas node's
   * tinted copy rather than making a second one of its own.
   */
  boxLongEdge?: number;
  className?: string;
}) {
  const bitmap = useCanvasBitmap(url);

  const tinted = useMemo(
    () =>
      bitmap && url && tint ? tintedBitmap(url, bitmap, tint, boxLongEdge) : null,
    [bitmap, url, tint, boxLongEdge],
  );

  const ref = useRef<HTMLCanvasElement>(null);

  // Copied into a canvas of this preview's own rather than mounted directly: the
  // cached one is shared with every Konva node drawing the same source, and a DOM
  // element can only be in one place at a time.
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !tinted) return;

    canvas.width = tinted.width;
    canvas.height = tinted.height;
    canvas.getContext("2d")?.drawImage(tinted, 0, 0);
  }, [tinted]);

  return (
    <div
      className={cn(
        "flex aspect-square items-center justify-center overflow-hidden rounded-lg border p-2",
        className,
      )}
      style={url ? CHECKERBOARD : undefined}
    >
      {!url ? (
        <span className="flex flex-col items-center gap-1 text-muted-foreground">
          <ImageOff className="size-5" />
          <span className="text-[11px]">No image</span>
        </span>
      ) : tinted ? (
        <canvas ref={ref} className="max-h-full max-w-full object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="max-h-full max-w-full object-contain" />
      )}
    </div>
  );
}
