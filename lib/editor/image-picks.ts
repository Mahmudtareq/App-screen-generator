import {
  isDeviceLayer,
  isImageLayer,
  layerLabel,
  type EditorDoc,
} from "@/schemas/editor";

import {
  backgroundAssetKey,
  layerAssetKey,
  type AssetKey,
  type EditorAsset,
} from "./types";

/**
 * What a picker source hands back.
 *
 * Two cases, not one per source: a source either produces bytes the browser is
 * holding (a dropped or pasted file) or a URL that already exists (an image this
 * project uses elsewhere, and — if a source is ever added for it — anything
 * fetched from the network). Keeping the union this small is what lets a new tab
 * be a component and a registry line rather than a change to how picks are
 * applied.
 */
export type ImagePick =
  | { kind: "file"; file: File }
  | { kind: "url"; url: string };

/** What a pick turned into, once the bytes are decoded and the asset is registered. */
export interface AppliedImage {
  width: number;
  height: number;
  /**
   * The URL to persist, or null when the image is a local file the save step still
   * has to upload.
   */
  url: string | null;
}

/* ----------------------------- images in reach ----------------------------- */

/** One image this project already holds, offered for reuse. */
export interface ProjectImage {
  /** Asset key it lives under — unique per slot, and the React key. */
  id: AssetKey;
  /** What to render, and what a pick hands back. */
  url: string;
  /** Where it is used, e.g. "Screen 2 · Image". */
  label: string;
}

/**
 * Every image already in the document, newest slot last.
 *
 * Reuse reads from the document rather than from an uploads table because the
 * document is the thing that is actually true right now: an asset row can outlive
 * the layer that referenced it, and offering a picture nothing draws any more is
 * how a picker fills up with rubbish.
 *
 * `exclude` is the layer being filled, so it is never offered its own image back.
 */
export function collectProjectImages(
  doc: EditorDoc,
  assets: Record<AssetKey, EditorAsset>,
  exclude?: AssetKey,
): ProjectImage[] {
  const images: ProjectImage[] = [];
  const seen = new Set<string>();

  const add = (id: AssetKey, label: string, saved: string | null) => {
    if (id === exclude) return;

    // The session's own object URL wins over the saved one for the same reason the
    // canvas prefers it: the bytes are already decoded, and a blob URL can never
    // taint a canvas the way a re-fetched remote one can.
    const url = assets[id]?.localUrl ?? saved;
    if (!url || seen.has(url)) return;

    seen.add(url);
    images.push({ id, url, label });
  };

  doc.screens.forEach((screen, index) => {
    const where = screen.name || `Screen ${index + 1}`;

    if (screen.background.type === "image") {
      add(backgroundAssetKey(screen.id), `${where} · Background`, screen.background.url);
    }

    for (const layer of screen.layers) {
      const id = layerAssetKey(screen.id, layer.id);

      if (isDeviceLayer(layer)) {
        add(id, `${where} · Screenshot`, layer.screenshot.url);
      } else if (isImageLayer(layer)) {
        add(id, `${where} · ${layerLabel(layer)}`, layer.url);
      }
    }
  });

  return images;
}
