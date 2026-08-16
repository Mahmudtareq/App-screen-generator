import type { DeviceId } from "@/lib/devices/catalog";
import type { Orientation } from "@/lib/devices/types";
import type {
  Artboard,
  Background,
  EditorDoc,
  LogoLayer,
  ScreenshotState,
  TextLayer,
} from "@/schemas/editor";

import type { AssetSlot, EditorAsset, SelectedId, TransformPatch } from "./types";

/**
 * The store is split into four slices, and that boundary is load-bearing.
 *
 * Only `doc` is serialised, persisted and tracked for undo. If selection or
 * viewport state lived alongside it, every click and every window resize would
 * become an undo step and would dirty the autosave.
 */

export interface DocumentSlice {
  doc: EditorDoc;

  loadDoc: (doc: EditorDoc) => void;
  resetDoc: () => void;

  setArtboard: (artboard: Artboard) => void;
  setBackground: (background: Background) => void;

  setDevice: (deviceId: DeviceId) => void;
  setColorway: (colorwayId: string) => void;
  setOrientation: (orientation: Orientation) => void;
  setDeviceTransform: (patch: Partial<EditorDoc["device"]>) => void;

  setScreenshot: (patch: Partial<ScreenshotState>) => void;
  clearScreenshot: () => void;

  setLogo: (logo: LogoLayer | null) => void;
  updateLogo: (patch: Partial<LogoLayer>) => void;

  addTextLayer: (role: TextLayer["role"]) => string;
  updateTextLayer: (id: string, patch: Partial<TextLayer>) => void;
  removeTextLayer: (id: string) => void;

  /** Applies a Konva transform that has already been normalised out of scaleX/scaleY. */
  commitTransform: (nodeId: string, patch: TransformPatch) => void;
}

export interface SelectionSlice {
  selectedId: SelectedId;
  select: (id: SelectedId) => void;
  clearSelection: () => void;
  deleteSelected: () => void;
}

export interface ViewportSlice {
  /** Measured size of the canvas container, in CSS px. */
  containerWidth: number;
  containerHeight: number;
  /** True once the canvas webfonts have loaded (or timed out). Gates first paint. */
  fontsReady: boolean;
  /**
   * Bumped whenever the browser finishes loading a font, to force Konva Text
   * nodes to re-measure. Konva measures glyph widths at construction time, so a
   * font that arrives late leaves stale line breaks behind.
   */
  fontsVersion: number;

  setContainerSize: (width: number, height: number) => void;
  setFontsReady: (ready: boolean) => void;
  bumpFontsVersion: () => void;
}

export interface UiSlice {
  /** Keyed by slot, matching the document's fixed screenshot / logo / background slots. */
  assets: Partial<Record<AssetSlot, EditorAsset>>;
  isExporting: boolean;
  exportOpen: boolean;

  setAsset: (asset: EditorAsset) => void;
  updateAsset: (slot: AssetSlot, patch: Partial<EditorAsset>) => void;
  clearAsset: (slot: AssetSlot) => void;
  setExporting: (value: boolean) => void;
  setExportOpen: (value: boolean) => void;
}

export type EditorState = DocumentSlice & SelectionSlice & ViewportSlice & UiSlice;

export type SetState = (
  partial:
    | Partial<EditorState>
    | ((state: EditorState) => Partial<EditorState>),
) => void;

export type GetState = () => EditorState;
