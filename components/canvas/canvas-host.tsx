"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

import { ensureFontsLoaded, watchFontLoading } from "@/lib/canvas/fonts";
import { selectUsedFontKey } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The SSR boundary for every canvas in the app.
 *
 * Imported once at module scope rather than per card, so all five screens share a
 * single lazy chunk — a `dynamic()` call inside the card component would create a
 * separate loader per screen and re-request Konva as each one mounted.
 *
 * This module must itself be a Client Component: in the App Router, `next/dynamic`
 * with `ssr: false` inside a Server Component is a build error.
 */
const CanvasStage = dynamic(() => import("./canvas-stage"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" />,
});

export { CanvasStage };

/**
 * Loads the canvas fonts and reports when they are ready.
 *
 * Called once from the filmstrip rather than per card. Konva bakes text metrics at
 * construction time, so painting before the faces land produces wrong line breaks
 * that then visibly snap into place a moment later — and with five Stages on
 * screen, that snap happens five times.
 *
 * `fontsVersion` covers the other half: a face that arrives *after* first paint
 * has to force a redraw, because nothing in the document changed and React has no
 * reason to re-render on its own.
 */
export function useCanvasFonts() {
  const setFontsReady = useEditorStore((s) => s.setFontsReady);
  const bumpFontsVersion = useEditorStore((s) => s.bumpFontsVersion);
  const fontsReady = useEditorStore((s) => s.fontsReady);
  const usedFontKey = useEditorStore(selectUsedFontKey);

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

  // The self-hosted faces above are always available; a Google family only exists
  // once something asks for it. Opening a saved project is that ask — without this
  // its captions would measure against the fallback until the user happened to
  // open the picker, and export re-awaits exactly the families requested here.
  useEffect(() => {
    if (!usedFontKey) return;
    void ensureFontsLoaded(usedFontKey.split("|"));
  }, [usedFontKey]);

  return fontsReady;
}
