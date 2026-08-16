"use client";

import { create } from "zustand";
import { useStore } from "zustand";
import { temporal } from "zundo";

import { debounce } from "@/lib/utils";

import { createDocumentSlice } from "./slices/document";
import { createSelectionSlice } from "./slices/selection";
import { createUiSlice } from "./slices/ui";
import { createViewportSlice } from "./slices/viewport";
import type { EditorState } from "./state";

/**
 * Undo history is coalesced. Without the debounce, dragging a colour slider or a
 * font-size slider pushes one history entry per pointer move — a few hundred for
 * a single gesture — and Cmd+Z stops meaning anything to the user.
 */
const HISTORY_DEBOUNCE_MS = 350;
const HISTORY_LIMIT = 50;

export const useEditorStore = create<EditorState>()(
  temporal(
    (set, get) => ({
      ...createDocumentSlice(set, get),
      ...createSelectionSlice(set, get),
      ...createViewportSlice(set),
      ...createUiSlice(set),
    }),
    {
      limit: HISTORY_LIMIT,
      // Only the document is undoable. Selection, viewport and upload progress
      // are ephemeral — tracking them would make every click an undo step.
      partialize: (state) => ({ doc: state.doc }),
      handleSet: (handleSet) => debounce(handleSet, HISTORY_DEBOUNCE_MS),
    },
  ),
);

type TemporalState = {
  undo: (steps?: number) => void;
  redo: (steps?: number) => void;
  clear: () => void;
  pastStates: unknown[];
  futureStates: unknown[];
};

/** React binding for zundo's temporal store, which is a separate vanilla store. */
export function useEditorHistory<T>(selector: (state: TemporalState) => T): T {
  return useStore(
    useEditorStore.temporal as unknown as Parameters<typeof useStore>[0],
    selector as (state: unknown) => T,
  );
}
