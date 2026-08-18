import { isDeviceLayer } from "@/schemas/editor";

import type { GetState, SelectionSlice, SetState } from "../state";

export function createSelectionSlice(
  set: SetState,
  get: GetState,
): SelectionSlice {
  return {
    screenId: null,
    layerId: null,

    /**
     * Opening a different screen's inspector drops the layer selection.
     *
     * A layer id is only unique within its screen, so carrying one across screens
     * would either address nothing or — worse — collide with an unrelated layer.
     */
    selectScreen: (screenId) =>
      set((state) =>
        state.screenId === screenId
          ? {}
          : { screenId, layerId: null },
      ),

    selectLayer: (screenId, layerId) =>
      set((state) => {
        const layer = layerId
          ? state.doc.screens
              .find((screen) => screen.id === screenId)
              ?.layers.find((l) => l.id === layerId)
          : null;

        // A locked layer stays clickable through the layer list but must not become
        // the Transformer's target, or it can be dragged despite being locked.
        if (layer?.locked) return { screenId, layerId: null };

        return { screenId, layerId };
      }),

    clearLayerSelection: () => set({ layerId: null }),

    clearSelection: () => set({ screenId: null, layerId: null }),

    deleteSelected: () => {
      const { screenId, layerId, doc } = get();
      if (!screenId || !layerId) return;

      const layer = doc.screens
        .find((screen) => screen.id === screenId)
        ?.layers.find((l) => l.id === layerId);

      // Deleting the device would leave a mockup with nothing to mock up, so the
      // key is a no-op there rather than something to undo in a panic.
      if (!layer || isDeviceLayer(layer)) return;

      get().removeLayer(screenId, layerId);
    },
  };
}
