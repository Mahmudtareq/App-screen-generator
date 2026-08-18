"use client";

import { Loader2 } from "lucide-react";

import type { LibraryItem } from "@/config/image-library";
import { cn } from "@/lib/utils";

import { CHECKERBOARD } from "./image-checkerboard";
import { useLibrarySvg } from "./use-library-svg";

/**
 * One piece of built-in artwork.
 *
 * The thumbnail is the SVG itself, inlined so `currentColor` resolves against the
 * tile's own `color`. That keeps the preview honest — it tints exactly what the
 * rasteriser will tint, including leaving a badge's white cut-outs white — with no
 * second copy of the artwork to keep in step.
 */
export function LibraryTile({
  item,
  color,
  busy,
  fixedWidth,
  fit = "contain",
  onSelect,
}: {
  item: LibraryItem;
  /** Undefined for full-colour artwork, which is shown as it is. */
  color?: string;
  busy: boolean;
  fixedWidth: boolean;
  /** `cover` only for artwork that is itself a rectangle, like a backdrop. */
  fit?: "cover" | "contain";
  onSelect: () => void;
}) {
  const markup = useLibrarySvg(color ? item.src : null);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={busy}
      title={item.name}
      aria-label={item.name}
      className={cn(
        "relative flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-colors hover:border-primary disabled:opacity-60",
        fit === "cover" ? "bg-muted/40" : "p-3",
        fixedWidth && "w-26",
      )}
      // A white badge on a white tile is invisible, and "is this transparent or is
      // it broken" is the one question a picker must never leave open.
      style={fit === "contain" && !color ? CHECKERBOARD : undefined}
    >
      {color && markup ? (
        <span
          className="flex size-full items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
          style={{ color }}
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.src}
          alt=""
          className={cn(
            "size-full",
            color && "opacity-0",
            fit === "cover" ? "rounded-md object-cover" : "object-contain",
          )}
          loading="lazy"
        />
      )}

      {busy && (
        <span className="absolute inset-0 flex items-center justify-center bg-background/70">
          <Loader2 className="size-4 animate-spin" />
        </span>
      )}
    </button>
  );
}
