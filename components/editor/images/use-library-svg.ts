"use client";

import { useEffect, useState } from "react";

/**
 * The markup of a library SVG, fetched once per file and cached for the session.
 *
 * Inlining the SVG rather than pointing an `<img>` at it is what makes the tile
 * honest: `currentColor` resolves against CSS only when the markup is in the
 * document, so an inline copy tints exactly the parts the rasteriser will tint and
 * leaves a badge's white cut-outs white. A CSS mask — the obvious alternative —
 * flattens the alpha channel, which turns every badge into a silhouette.
 *
 * The files are static assets in this repo, which is what makes `dangerouslySet`
 * safe here: no library entry is user input.
 */
const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

function load(src: string): Promise<string> {
  const cached = inFlight.get(src);
  if (cached) return cached;

  const request = fetch(src)
    .then((response) => {
      if (!response.ok) throw new Error(`Could not load ${src}`);
      return response.text();
    })
    .then((markup) => {
      cache.set(src, markup);
      return markup;
    })
    .finally(() => inFlight.delete(src));

  inFlight.set(src, request);
  return request;
}

export function useLibrarySvg(src: string | null): string | null {
  // Only a re-render trigger. The markup itself lives in the module cache, which is
  // read during render — a sibling tile has usually already fetched the file, and
  // routing a cache hit through state would flash the fallback for a frame.
  const [arrived, setArrived] = useState<string | null>(null);

  useEffect(() => {
    if (!src || cache.has(src)) return;

    let cancelled = false;

    load(src)
      .then(() => {
        if (!cancelled) setArrived(src);
      })
      // A missing file falls back to the plain <img>, which shows its own broken
      // state — no reason to take the dialog down with it.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [src]);

  void arrived;
  return src ? (cache.get(src) ?? null) : null;
}
