import type { EditorDoc } from "@/schemas/editor";

export type { EditorDoc };

/**
 * Selection is addressed by the same string used as the Konva node id, so the
 * Transformer can attach with `stage.findOne("#" + selectedId)` and no lookup
 * table is needed.
 */
export const DEVICE_NODE_ID = "device";
export const LOGO_NODE_ID = "logo";
export const textNodeId = (id: string) => `text:${id}`;

export type SelectedId = string | null;

export type SelectionKind = "device" | "logo" | "text" | null;

export function selectionKind(selectedId: SelectedId): SelectionKind {
  if (!selectedId) return null;
  if (selectedId === DEVICE_NODE_ID) return "device";
  if (selectedId === LOGO_NODE_ID) return "logo";
  if (selectedId.startsWith("text:")) return "text";
  return null;
}

export function textIdFromNodeId(selectedId: SelectedId): string | null {
  return selectedId?.startsWith("text:") ? selectedId.slice("text:".length) : null;
}

/**
 * A user-supplied image during an editing session.
 *
 * Assets are ephemeral state, deliberately outside the persisted document: they
 * hold an object URL and an upload status, neither of which survives a reload.
 * The document stores only the resulting https URL and, once saved, the database
 * id of the Asset row.
 *
 * They are keyed by *slot* rather than by a generated id. The document has fixed
 * slots — one screenshot, one logo, one background — so a slot key is enough to
 * link a dropped file to where it renders, and it avoids inventing a client-side
 * id that would then have to be kept out of the document's `assetId` fields
 * (those hold real database ObjectIds).
 *
 * Note that `localUrl` stays the render source for the whole session even after
 * the upload finishes — re-fetching the image from Cloudinary just to draw what
 * the browser already has in memory would buy nothing and reintroduce the
 * canvas-tainting risk that the blob-URL pipeline exists to remove.
 */
export type AssetSlot = "screenshot" | "logo" | "background";

export type AssetStatus = "local" | "uploading" | "uploaded" | "error";

export interface EditorAsset {
  slot: AssetSlot;
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
