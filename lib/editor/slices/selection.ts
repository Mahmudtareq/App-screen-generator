import type { GetState, SelectionSlice, SetState } from "../state";
import { LOGO_NODE_ID, textIdFromNodeId } from "../types";

export function createSelectionSlice(set: SetState, get: GetState): SelectionSlice {
  return {
    selectedId: null,

    select: (id) => set({ selectedId: id }),

    clearSelection: () => set({ selectedId: null }),

    deleteSelected: () => {
      const { selectedId } = get();
      if (!selectedId) return;

      if (selectedId === LOGO_NODE_ID) {
        get().setLogo(null);
        set({ selectedId: null });
        return;
      }

      const textId = textIdFromNodeId(selectedId);
      if (textId) {
        get().removeTextLayer(textId);
        set({ selectedId: null });
      }

      // The device is the subject of the mockup — there is nothing left to show
      // without it, so Delete is deliberately a no-op when it is selected.
    },
  };
}
