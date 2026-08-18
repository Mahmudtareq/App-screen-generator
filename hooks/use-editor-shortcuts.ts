"use client";

import { useEffect } from "react";

import { useEditorStore } from "@/lib/editor/store";

/** True when the user is typing, so editor shortcuts must not hijack the key. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function useEditorShortcuts() {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const store = useEditorStore.getState();
      const temporal = useEditorStore.temporal.getState();

      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === "z") {
        // Undo has to work while a caption textarea has focus — the alternative
        // is the browser undoing text inside the field while the canvas silently
        // disagrees with it.
        event.preventDefault();
        if (event.shiftKey) temporal.redo();
        else temporal.undo();
        return;
      }

      if (isTextEntry(event.target)) return;

      if (event.key === "Escape") {
        // Step out one level at a time: drop the layer first, and only close the
        // inspector on a second press. Collapsing both at once means one stray
        // Escape loses the panel someone was working in.
        if (store.layerId) store.clearLayerSelection();
        else store.clearSelection();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!store.layerId) return;
        event.preventDefault();
        store.deleteSelected();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
