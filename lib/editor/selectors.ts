import { computeCardScale } from "@/lib/canvas/fit";
import { getColorway, getDevice } from "@/lib/devices/catalog";
import { orientSpec } from "@/lib/devices/orientation";
import type { Colorway, DeviceSpec } from "@/lib/devices/types";
import {
  isDeviceLayer,
  isImageLayer,
  isTextLayer,
  type Screen,
  type ScreenLayer,
  type TextRole,
} from "@/schemas/editor";

import type { EditorState } from "./state";
import { backgroundAssetKey, layerAssetKey, type AssetKey } from "./types";

/**
 * Derived, not stored: keeping fit scale out of state means it can never drift
 * out of sync with the strip height or the artboard that produced it.
 */
export function selectCardScale(state: EditorState): number {
  return computeCardScale(state.stripHeight, state.doc.artboard);
}

/** The device spec as it should be rendered, already rotated for the orientation. */
export function selectOrientedSpec(state: EditorState): DeviceSpec {
  return orientSpec(getDevice(state.doc.deviceId), state.doc.orientation);
}

export function selectScreen(screenId: string) {
  return (state: EditorState): Screen | undefined =>
    state.doc.screens.find((screen) => screen.id === screenId);
}

export function selectLayerById(screenId: string, layerId: string) {
  return (state: EditorState): ScreenLayer | undefined =>
    selectScreen(screenId)(state)?.layers.find((layer) => layer.id === layerId);
}

/**
 * Ids of a screen's layers, bottom-first.
 *
 * Subscribing to the ids alone rather than to the layer objects is what keeps the
 * canvas granular: adding, removing or restacking a layer re-renders the layer
 * list, while editing one re-renders only that node.
 */
export function selectLayerIds(screenId: string) {
  return (state: EditorState): string[] =>
    selectScreen(screenId)(state)?.layers.map((layer) => layer.id) ?? [];
}

/**
 * The font shared by every text layer of one role, or null if they disagree.
 *
 * Null is the honest answer for a set whose titles have been styled apart — the
 * Globals popover shows "Mixed" rather than picking one screen's font and implying
 * the others match it. Pinned screens count: they are excluded from the write, so
 * letting them drag the reading to "Mixed" is what tells the user why their change
 * did not reach everything.
 */
export function selectRoleFontId(role: TextRole) {
  return (state: EditorState): string | null => {
    let font: string | null = null;

    for (const screen of state.doc.screens) {
      for (const layer of screen.layers) {
        if (!isTextLayer(layer) || layer.role !== role) continue;
        if (font === null) font = layer.fontId;
        else if (font !== layer.fontId) return null;
      }
    }

    return font;
  };
}

/**
 * Every font the document currently uses, as a stable string key.
 *
 * A key rather than an array because Zustand v5 compares with `Object.is`: a fresh
 * array per render would re-fire the subscriber on every keystroke. The consumer
 * splits it back apart to load the faces.
 */
export function selectUsedFontKey(state: EditorState): string {
  const ids = new Set<string>();

  for (const screen of state.doc.screens) {
    for (const layer of screen.layers) {
      if (isTextLayer(layer)) ids.add(layer.fontId);
    }
  }

  return [...ids].sort().join("|");
}

export function selectColorwayFor(spec: DeviceSpec, colorwayId: string): Colorway {
  return getColorway(spec, colorwayId);
}

/**
 * Preferred render source for one of the document's images.
 *
 * A locally-dropped file keeps its object URL for the whole session, even after it
 * has finished uploading — the bytes are already decoded in memory, and a `blob:`
 * URL can never taint the canvas the way a re-fetched cross-origin URL can. The
 * saved https URL is only used when there is no local file, i.e. after a reload.
 */
export function selectImageSource(
  state: EditorState,
  key: AssetKey,
  fallbackUrl: string | null,
): string | null {
  return state.assets[key]?.localUrl ?? fallbackUrl;
}

/**
 * Every image URL one screen draws, for the export pipeline to await.
 *
 * Export has to know these up front: `whenAllSettled` blocks until each bitmap is
 * decoded, and rasterising a frame whose background is still loading silently
 * produces a half-empty PNG.
 */
export function selectScreenImageUrls(
  state: EditorState,
  screenId: string,
): (string | null)[] {
  const screen = selectScreen(screenId)(state);
  if (!screen) return [];

  const urls: (string | null)[] = [];

  if (screen.background.type === "image") {
    urls.push(
      selectImageSource(
        state,
        backgroundAssetKey(screen.id),
        screen.background.url,
      ),
    );
  }

  for (const layer of screen.layers) {
    const key = layerAssetKey(screen.id, layer.id);

    if (isDeviceLayer(layer)) {
      urls.push(selectImageSource(state, key, layer.screenshot.url));
    } else if (isImageLayer(layer)) {
      urls.push(selectImageSource(state, key, layer.url));
    }
  }

  return urls.filter(Boolean);
}

/** Opaque fill for formats that cannot store alpha. */
export function selectOpaqueFallback(
  state: EditorState,
  screenId: string,
): string {
  const background = selectScreen(screenId)(state)?.background;

  if (background?.type === "color") return background.color;
  if (background?.type === "gradient") return background.stops[0].color;
  return "#ffffff";
}
