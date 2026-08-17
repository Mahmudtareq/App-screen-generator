import type { DeviceId } from "@/lib/devices/catalog";
import type { Orientation } from "@/lib/devices/types";
import type {
  Artboard,
  Background,
  EditorDoc,
  LayerKind,
  Screen,
  ScreenLayer,
} from "@/schemas/editor";

import type {
  AssetKey,
  EditorAsset,
  EditorSelection,
  LayerMove,
  TransformPatch,
} from "./types";

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
  /** Rebuilds the document from a template, discarding the current screens. */
  applyTemplate: (templateId: string) => void;

  /* ------------------------------ document level ----------------------------- */

  /** Retargets the canvas, rescaling every unpinned screen's layout to match. */
  setArtboard: (artboard: Artboard) => void;
  setDeviceId: (deviceId: DeviceId) => void;
  setOrientation: (orientation: Orientation) => void;

  /* -------------------------------- screens --------------------------------- */

  addScreen: (afterScreenId?: string) => string | null;
  duplicateScreen: (screenId: string) => string | null;
  removeScreen: (screenId: string) => void;
  moveScreen: (screenId: string, direction: "left" | "right") => void;
  renameScreen: (screenId: string, name: string) => void;
  setScreenPinned: (screenId: string, pinned: boolean) => void;
  /** Restores a screen's layout to the template's defaults, keeping its copy and images. */
  resetScreen: (screenId: string) => void;
  setScreenBackground: (screenId: string, background: Background) => void;
  /** Copies one screen's background onto every other unpinned screen. */
  applyBackgroundToAll: (screenId: string) => void;

  /* --------------------------------- layers --------------------------------- */

  /** Adds a layer on top of the stack and returns its id. */
  addLayer: (screenId: string, kind: LayerKind) => string | null;
  updateLayer: <T extends ScreenLayer>(
    screenId: string,
    layerId: string,
    patch: Partial<T>,
  ) => void;
  removeLayer: (screenId: string, layerId: string) => void;
  duplicateLayer: (screenId: string, layerId: string) => string | null;
  moveLayer: (screenId: string, layerId: string, move: LayerMove) => void;
  /** Applies a Konva transform that has already been normalised out of scaleX/scaleY. */
  commitTransform: (
    screenId: string,
    layerId: string,
    patch: TransformPatch,
  ) => void;
  /** Centres a layer horizontally in the artboard. */
  centerLayer: (screenId: string, layerId: string) => void;
}

export interface SelectionSlice extends EditorSelection {
  /** Opens a screen's inspector without changing which layer is selected. */
  selectScreen: (screenId: string | null) => void;
  selectLayer: (screenId: string, layerId: string | null) => void;
  clearLayerSelection: () => void;
  clearSelection: () => void;
  deleteSelected: () => void;
}

export interface ViewportSlice {
  /**
   * Measured height of the filmstrip, in CSS px.
   *
   * Height alone drives the fit scale: every card is the same artboard, laid out
   * in a horizontally scrolling row, so the cards are sized to fill the available
   * height and their width follows from the aspect ratio. Width is not a
   * constraint — that is what the scrollbar is for.
   */
  stripHeight: number;
  fontsReady: boolean;
  /** Bumped when a webfont lands after first paint, to force a Konva redraw. */
  fontsVersion: number;

  setStripHeight: (height: number) => void;
  setFontsReady: (ready: boolean) => void;
  bumpFontsVersion: () => void;
}

export interface UiSlice {
  assets: Record<AssetKey, EditorAsset>;
  isExporting: boolean;
  /** Which screen the export dialog is open for; null means closed. */
  exportScreenId: string | null;

  setAsset: (asset: EditorAsset) => void;
  updateAsset: (key: AssetKey, patch: Partial<EditorAsset>) => void;
  clearAsset: (key: AssetKey) => void;
  /** Releases every object URL belonging to a screen, when that screen is deleted. */
  clearScreenAssets: (screenId: string) => void;

  setExporting: (isExporting: boolean) => void;
  openExport: (screenId: string) => void;
  closeExport: () => void;
}

export type EditorState = DocumentSlice & SelectionSlice & ViewportSlice & UiSlice;

export type SetState = (
  partial:
    | Partial<EditorState>
    | ((state: EditorState) => Partial<EditorState>),
) => void;

export type GetState = () => EditorState;

/* -------------------------------- doc helpers ------------------------------- */

/**
 * Shared read helpers.
 *
 * They live next to the state contract rather than in the selectors module because
 * the slices themselves need them — a slice reducer looking up the screen it is
 * about to patch should not have to reimplement the lookup each time.
 */
export function findScreen(doc: EditorDoc, screenId: string): Screen | undefined {
  return doc.screens.find((screen) => screen.id === screenId);
}

export function findLayer(
  doc: EditorDoc,
  screenId: string,
  layerId: string,
): ScreenLayer | undefined {
  return findScreen(doc, screenId)?.layers.find((layer) => layer.id === layerId);
}
