import type { SetState, UiSlice } from "../state";

export function createUiSlice(set: SetState): UiSlice {
  return {
    assets: {},
    isExporting: false,
    exportOpen: false,

    setAsset: (asset) =>
      set((state) => {
        // Replacing a slot's image orphans the previous object URL; release it
        // here or a session of trying screenshots leaks every one of them.
        const previous = state.assets[asset.slot];
        if (previous && previous.localUrl !== asset.localUrl) {
          URL.revokeObjectURL(previous.localUrl);
        }
        return { assets: { ...state.assets, [asset.slot]: asset } };
      }),

    updateAsset: (slot, patch) =>
      set((state) => {
        const existing = state.assets[slot];
        if (!existing) return {};
        return { assets: { ...state.assets, [slot]: { ...existing, ...patch } } };
      }),

    clearAsset: (slot) =>
      set((state) => {
        const existing = state.assets[slot];
        if (!existing) return {};
        URL.revokeObjectURL(existing.localUrl);
        const rest = { ...state.assets };
        delete rest[slot];
        return { assets: rest };
      }),

    setExporting: (isExporting) => set({ isExporting }),
    setExportOpen: (exportOpen) => set({ exportOpen }),
  };
}
