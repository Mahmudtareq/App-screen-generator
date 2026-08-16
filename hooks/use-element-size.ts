"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Observes an element's box and reports it through a callback.
 *
 * Reports via callback rather than component state on purpose: the canvas
 * container resizes on every window drag, and routing that through a `useState`
 * would re-render the editor shell — and therefore the Konva Stage — dozens of
 * times a second. The consumer writes straight into the viewport slice instead,
 * which already de-duplicates unchanged sizes.
 *
 * Measurements are coalesced to one per animation frame.
 */
export function useElementSize<T extends HTMLElement>(
  onResize: (size: { width: number; height: number }) => void,
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const callbackRef = useRef(onResize);

  // Kept in an effect rather than assigned during render — refs must not be
  // written while rendering. Effects run in declaration order, so this lands
  // before the observer below is attached.
  useEffect(() => {
    callbackRef.current = onResize;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const { width, height } = entry.contentRect;
        callbackRef.current({ width, height });
      });
    });

    observer.observe(element);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return ref;
}
