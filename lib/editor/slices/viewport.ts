import type { SetState, ViewportSlice } from "../state";

export function createViewportSlice(set: SetState): ViewportSlice {
  return {
    stripHeight: 0,
    fontsReady: false,
    fontsVersion: 0,

    setStripHeight: (stripHeight) =>
      set((state) =>
        // Guard against ResizeObserver firing with the same box on every scroll
        // tick — an unchanged write here would re-render every canvas node in
        // every screen.
        state.stripHeight === stripHeight ? {} : { stripHeight },
      ),

    setFontsReady: (fontsReady) => set({ fontsReady }),

    bumpFontsVersion: () =>
      set((state) => ({ fontsVersion: state.fontsVersion + 1 })),
  };
}
