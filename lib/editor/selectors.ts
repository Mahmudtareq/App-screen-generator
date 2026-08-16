import { computeFitScale } from "@/lib/canvas/fit";
import { getColorway, getDevice, type DeviceId } from "@/lib/devices/catalog";
import { orientSpec } from "@/lib/devices/orientation";
import type { DeviceSpec } from "@/lib/devices/types";
import type { TextLayer } from "@/schemas/editor";

import type { EditorState } from "./state";
import { textIdFromNodeId, type AssetSlot } from "./types";

/**
 * Derived, not stored: keeping fit scale out of state means it can never drift
 * out of sync with the container size or the artboard that produced it.
 */
export function selectFitScale(state: EditorState): number {
  return computeFitScale(
    { width: state.containerWidth, height: state.containerHeight },
    state.doc.artboard,
  );
}

/** The device spec as it should be rendered, already rotated for the orientation. */
export function selectOrientedSpec(state: EditorState): DeviceSpec {
  return orientSpec(getDevice(state.doc.deviceId as DeviceId), state.doc.orientation);
}

export function selectColorway(state: EditorState) {
  return getColorway(selectOrientedSpec(state), state.doc.colorwayId);
}

export function selectSelectedTextLayer(state: EditorState): TextLayer | null {
  const id = textIdFromNodeId(state.selectedId);
  if (!id) return null;
  return state.doc.textLayers.find((layer) => layer.id === id) ?? null;
}

export function selectTextLayer(id: string) {
  return (state: EditorState): TextLayer | undefined =>
    state.doc.textLayers.find((layer) => layer.id === id);
}

/**
 * Preferred render source for one of the document's image slots.
 *
 * A locally-dropped file keeps its object URL for the whole session, even after
 * it has finished uploading — the bytes are already decoded in memory, and a
 * `blob:` URL can never taint the canvas the way a re-fetched cross-origin URL
 * can. The saved https URL is only used when there is no local file, i.e. after
 * a reload.
 */
export function selectImageSource(
  state: EditorState,
  slot: AssetSlot,
  fallbackUrl: string | null,
): string | null {
  return state.assets[slot]?.localUrl ?? fallbackUrl;
}
