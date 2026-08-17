import type { EditorDoc, LayerKind } from "@/schemas/editor";

export type { EditorDoc };

/**
 * Selection is a (screen, layer) pair.
 *
 * Two separate fields rather than one object, because they change independently:
 * clicking a card's chrome selects a screen and opens its inspector without
 * touching the layer selection, and Escape drops the layer while leaving the
 * inspector open. An object would make every screen click a new reference and
 * re-render every subscriber of either half.
 *
 * The layer id doubles as the Konva node id — each screen is its own Stage, so a
 * layer id is unique within the scope `stage.findOne("#id")` searches, and no
 * prefixing or lookup table is needed.
 */
export interface EditorSelection {
  screenId: string | null;
  layerId: string | null;
}

/**
 * Where an uploadable image belongs, as a single string.
 *
 * With arbitrary layers there is no longer a fixed set of slots to key assets by,
 * so the key is composed from the ids of the things that own the image. Two forms
 * exist, and `parseAssetKey` is the only place that knows the difference:
 *
 *   "<screenId>/<layerId>"   an image layer, or a device layer's screenshot
 *   "<screenId>/background"  the screen background
 */
export type AssetKey = string;

const BACKGROUND_TARGET = "background";

export function layerAssetKey(screenId: string, layerId: string): AssetKey {
  return `${screenId}/${layerId}`;
}

export function backgroundAssetKey(screenId: string): AssetKey {
  return `${screenId}/${BACKGROUND_TARGET}`;
}

export function parseAssetKey(
  key: AssetKey,
): { screenId: string; layerId: string | null } | null {
  const separator = key.indexOf("/");
  if (separator <= 0) return null;

  const screenId = key.slice(0, separator);
  const target = key.slice(separator + 1);

  return {
    screenId,
    layerId: target === BACKGROUND_TARGET ? null : target,
  };
}

/**
 * A user-supplied image during an editing session.
 *
 * Assets are ephemeral state, deliberately outside the persisted document: they
 * hold an object URL and an upload status, neither of which survives a reload.
 * The document stores only the resulting https URL and, once saved, the database
 * id of the Asset row.
 *
 * Note that `localUrl` stays the render source for the whole session even after
 * the upload finishes — re-fetching the image from Cloudinary just to draw what
 * the browser already has in memory would buy nothing and reintroduce the
 * canvas-tainting risk that the blob-URL pipeline exists to remove.
 */
export type AssetStatus = "local" | "uploading" | "uploaded" | "error";

export interface EditorAsset {
  key: AssetKey;
  localUrl: string;
  width: number;
  height: number;
  status: AssetStatus;
  /** 0..1, only meaningful while status is "uploading". */
  progress: number;
  publicId?: string;
  secureUrl?: string;
  error?: string;
}

/** Everything a Konva transform can change, normalised back into document units. */
export interface TransformPatch {
  x: number;
  y: number;
  rotation: number;
  width?: number;
  height?: number;
  fontSize?: number;
  scale?: number;
}

/** Which kinds the "add layer" menu offers — a device is added with its screen. */
export const ADDABLE_LAYER_KINDS: readonly LayerKind[] = ["image", "text"];

export type LayerMove = "up" | "down" | "top" | "bottom";
