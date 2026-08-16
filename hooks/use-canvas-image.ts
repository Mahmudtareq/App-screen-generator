"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  ensureLoaded,
  getEntry,
  getServerEntry,
  subscribe,
  type ImageEntry,
} from "@/lib/canvas/image-cache";

/**
 * Subscribes to the canvas image cache for one URL, kicking off the load if it
 * has not started.
 *
 * The load is started in an effect rather than during render because
 * `useSyncExternalStore`'s snapshot must be side-effect free.
 */
export function useCanvasImage(url: string | null | undefined): ImageEntry | undefined {
  const entry = useSyncExternalStore(
    subscribe,
    () => getEntry(url),
    getServerEntry,
  );

  useEffect(() => {
    if (!url) return;
    // Rejection is already recorded on the cache entry; swallow here so a failed
    // image does not surface as an unhandled promise rejection.
    ensureLoaded(url).catch(() => undefined);
  }, [url]);

  return entry;
}

/** Convenience for the common case: the decoded bitmap, or undefined. */
export function useCanvasBitmap(
  url: string | null | undefined,
): HTMLImageElement | undefined {
  const entry = useCanvasImage(url);
  return entry?.status === "loaded" ? entry.image : undefined;
}
