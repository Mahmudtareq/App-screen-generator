import type { SetState, UiSlice } from "../state";
import { parseAssetKey } from "../types";

export function createUiSlice(set: SetState): UiSlice {
  return {
    assets: {},
    isExporting: false,
    exportScreenId: null,
    projectName: "",

    setAsset: (asset) =>
      set((state) => {
        // Replacing an image orphans the previous object URL; release it here or a
        // session of trying screenshots leaks every one of them.
        const previous = state.assets[asset.key];
        if (previous && previous.localUrl !== asset.localUrl) {
          URL.revokeObjectURL(previous.localUrl);
        }
        return { assets: { ...state.assets, [asset.key]: asset } };
      }),

    updateAsset: (key, patch) =>
      set((state) => {
        const existing = state.assets[key];
        if (!existing) return {};
        return { assets: { ...state.assets, [key]: { ...existing, ...patch } } };
      }),

    clearAsset: (key) =>
      set((state) => {
        const existing = state.assets[key];
        if (!existing) return {};
        URL.revokeObjectURL(existing.localUrl);
        const rest = { ...state.assets };
        delete rest[key];
        return { assets: rest };
      }),

    /**
     * Releases every object URL a screen owns.
     *
     * Keyed by prefix rather than by walking the screen's layers, because this runs
     * as a screen is being deleted and the layer list is about to disappear — and
     * an asset can outlive the layer that created it if a kind was switched.
     */
    clearScreenAssets: (screenId) =>
      set((state) => {
        const rest = { ...state.assets };
        let changed = false;

        for (const [key, asset] of Object.entries(state.assets)) {
          if (parseAssetKey(key)?.screenId !== screenId) continue;
          URL.revokeObjectURL(asset.localUrl);
          delete rest[key];
          changed = true;
        }

        return changed ? { assets: rest } : {};
      }),

    setProjectName: (projectName) => set({ projectName }),

    setExporting: (isExporting) => set({ isExporting }),
    openExport: (exportScreenId) => set({ exportScreenId }),
    closeExport: () => set({ exportScreenId: null }),
  };
}
