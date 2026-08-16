import type { SetState, ViewportSlice } from "../state";

export function createViewportSlice(set: SetState): ViewportSlice {
  return {
    containerWidth: 0,
    containerHeight: 0,
    fontsReady: false,
    fontsVersion: 0,

    setContainerSize: (width, height) =>
      set((state) =>
        // Guard against ResizeObserver firing with the same box on every scroll
        // tick — an unchanged write here would re-render every canvas node.
        state.containerWidth === width && state.containerHeight === height
          ? {}
          : { containerWidth: width, containerHeight: height },
      ),

    setFontsReady: (fontsReady) => set({ fontsReady }),

    bumpFontsVersion: () =>
      set((state) => ({ fontsVersion: state.fontsVersion + 1 })),
  };
}
