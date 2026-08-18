"use client";

import { uploadToCloudinary, type UploadKind } from "@/lib/cloudinary-upload";
import {
  EDITOR_DOC_VERSION,
  editorDocSchema,
  isDeviceLayer,
  isImageLayer,
  plainTextToRuns,
  type EditorDoc,
  type Screen,
  type ScreenLayer,
} from "@/schemas/editor";

import { newLayerId, newScreenId } from "./defaults";
import type { EditorState } from "./state";
import { backgroundAssetKey, layerAssetKey, type AssetKey } from "./types";

export const DRAFT_KEY = "editor:draft:v1";
/**
 * A sibling key rather than a field inside the draft: the name is a `Project`
 * column, not part of `EditorDoc`, and folding it into the draft would mean the
 * stored draft no longer parses as the document schema it is read back through.
 */
export const DRAFT_NAME_KEY = "editor:draft-name:v1";

/**
 * Migrations from older `doc.version` values, applied in order.
 *
 * They exist because the editor document is stored as an opaque blob under
 * `Project.doc`, which is exactly the arrangement that needs a migration hook to
 * stay changeable. Every saved project predating v2 goes through the function
 * below on load, so it has to keep working for as long as those rows exist.
 */
const MIGRATIONS: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {
  /**
   * v1 → v2: one artboard becomes a set of screens, named slots become an ordered
   * layer array.
   *
   * A v1 document held exactly one frame with a fixed z-order of device, then logo,
   * then captions. That ordering is reproduced literally in the layers array, so a
   * migrated project opens looking identical to how it was saved — the array is
   * bottom-first, which is why the device comes out at index 0.
   */
  1: (doc) => {
    const textLayers = Array.isArray(doc.textLayers) ? doc.textLayers : [];
    const logo = doc.logo as Record<string, unknown> | null | undefined;
    const device = (doc.device ?? {}) as Record<string, unknown>;

    const base = { name: "", visible: true, locked: false, opacity: 1 };

    const layers: Record<string, unknown>[] = [
      {
        ...base,
        ...device,
        id: newLayerId(),
        kind: "device",
        colorwayId: doc.colorwayId ?? "black",
        screenshot: doc.screenshot ?? {
          assetId: null,
          url: null,
          zoom: 1,
          pan: { x: 0, y: 0 },
        },
      },
    ];

    if (logo) {
      layers.push({
        ...base,
        ...logo,
        id: newLayerId(),
        kind: "image",
        // v1 wrote "" for a logo whose upload had not run; that is not a valid URL.
        url: typeof logo.url === "string" && logo.url ? logo.url : null,
        opacity: typeof logo.opacity === "number" ? logo.opacity : 1,
        visible: logo.visible !== false,
      });
    }

    for (const layer of textLayers as Record<string, unknown>[]) {
      layers.push({ ...base, ...layer, id: layer.id ?? newLayerId(), kind: "text" });
    }

    const background = (doc.background ?? { type: "color", color: "#eef2f7" }) as
      Record<string, unknown>;

    if (background.type === "image" && !background.url) background.url = null;

    return {
      version: 2,
      templateId: "aurora",
      deviceId: doc.deviceId,
      orientation: doc.orientation ?? "portrait",
      artboard: doc.artboard,
      screens: [
        { id: newScreenId(), name: "", pinned: false, background, layers },
      ],
    };
  },

  /**
   * v2 → v3: a text layer's plain `text` string becomes an array of styled runs.
   *
   * One run carrying the whole string, with no overrides, renders identically to the
   * uniform Konva Text node it replaces — so a migrated caption looks the same and
   * only becomes styleable once the user touches it.
   */
  2: (doc) => {
    const screens = Array.isArray(doc.screens) ? doc.screens : [];

    return {
      ...doc,
      version: 3,
      screens: screens.map((screen) => {
        const value = screen as Record<string, unknown>;
        const layers = Array.isArray(value.layers) ? value.layers : [];

        return {
          ...value,
          layers: layers.map((entry) => {
            const layer = entry as Record<string, unknown>;
            if (layer.kind !== "text") return layer;

            const { text, ...rest } = layer;
            return {
              ...rest,
              runs: typeof text === "string" ? plainTextToRuns(text) : [],
            };
          }),
        };
      }),
    };
  },

  /**
   * v3 → v4: `fontId` widens from the four self-hosted ids to any font id,
   * including `google:<Family>`.
   *
   * Nothing inside a v3 document needs rewriting — every id it can hold is still
   * valid — so this only stamps the version. That stamp is the point: it is what
   * tells a client running older code that this document may name a font it cannot
   * resolve, rather than letting it fail the enum parse and drop the draft whole.
   */
  3: (doc) => ({ ...doc, version: 4 }),

  /**
   * v4 → v5: an image layer gains `fit` and `align`.
   *
   * Every v4 image box already matched its bitmap's aspect ratio — the panel's size
   * slider drives height from width, the canvas Transformer resizes images with
   * `keepRatio`, and an artboard retarget scales both axes uniformly. So `contain`
   * renders a migrated layer identically to the stretch-to-box it replaces, and the
   * field only starts to matter once someone changes the box deliberately.
   */
  4: (doc) => {
    const screens = Array.isArray(doc.screens) ? doc.screens : [];

    return {
      ...doc,
      version: 5,
      screens: screens.map((screen) => {
        const value = screen as Record<string, unknown>;
        const layers = Array.isArray(value.layers) ? value.layers : [];

        return {
          ...value,
          layers: layers.map((entry) => {
            const layer = entry as Record<string, unknown>;
            if (layer.kind !== "image") return layer;
            return { fit: "contain", align: "center", ...layer };
          }),
        };
      }),
    };
  },

  /**
   * v5 → v6: an image layer gains `tint`.
   *
   * `null` is "no tint", which is exactly what every v5 layer was doing, so this
   * only stamps the version — the field's absence and its null are the same
   * picture.
   */
  5: (doc) => ({ ...doc, version: 6 }),
};

/**
 * Parses and, if necessary, upgrades a stored document.
 *
 * Returns null rather than a partial document: one we cannot parse is not worth
 * half-restoring, and a corrupt draft should drop the user into a clean editor
 * rather than a broken one.
 */
export function migrateDoc(raw: unknown): EditorDoc | null {
  if (!raw || typeof raw !== "object") return null;

  let working = raw as Record<string, unknown>;
  let version = typeof working.version === "number" ? working.version : 1;

  while (version < EDITOR_DOC_VERSION) {
    const migration = MIGRATIONS[version];
    if (!migration) break;
    working = migration(working);
    version += 1;
  }

  const parsed = editorDocSchema.safeParse({ ...working, version: EDITOR_DOC_VERSION });
  return parsed.success ? parsed.data : null;
}

/* ------------------------------- local drafts ------------------------------ */

export function saveDraft(doc: EditorDoc) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(doc));
  } catch {
    // Private browsing and full quotas both throw here. Losing an autosave is
    // not worth interrupting the user over.
  }
}

export function loadDraft(): EditorDoc | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? migrateDoc(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveDraftName(name: string) {
  try {
    localStorage.setItem(DRAFT_NAME_KEY, name);
  } catch {
    // Same reasoning as saveDraft: an autosave is not worth an interruption.
  }
}

export function loadDraftName(): string {
  try {
    return localStorage.getItem(DRAFT_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(DRAFT_NAME_KEY);
  } catch {
    // Nothing useful to do.
  }
}

/* ------------------------------ save preparation --------------------------- */

/**
 * Every place in a document an uploadable image can live, paired with its asset
 * key.
 *
 * Collected by walking the document rather than by reading `state.assets`, because
 * the document is the authority on what still needs a URL — an asset entry can
 * outlive the layer that owns it, and uploading an orphan would burn quota on
 * bytes nothing renders.
 */
interface UploadTarget {
  key: AssetKey;
  layerId: string | null;
  /** Which Cloudinary folder it belongs in. */
  kind: UploadKind;
}

function collectTargets(doc: EditorDoc): UploadTarget[] {
  const targets: UploadTarget[] = [];

  for (const screen of doc.screens) {
    if (screen.background.type === "image") {
      targets.push({
        key: backgroundAssetKey(screen.id),
        layerId: null,
        kind: "background",
      });
    }

    for (const layer of screen.layers) {
      if (isDeviceLayer(layer)) {
        targets.push({
          key: layerAssetKey(screen.id, layer.id),
          layerId: layer.id,
          kind: "screenshot",
        });
      } else if (isImageLayer(layer)) {
        targets.push({
          key: layerAssetKey(screen.id, layer.id),
          layerId: layer.id,
          kind: "image",
        });
      }
    }
  }

  return targets;
}

/** Writes an uploaded URL back into whichever field the target names. */
function applyUrl(layer: ScreenLayer, url: string): ScreenLayer {
  if (isDeviceLayer(layer)) {
    return { ...layer, screenshot: { ...layer.screenshot, url } };
  }
  if (isImageLayer(layer)) {
    return { ...layer, url };
  }
  return layer;
}

/**
 * Uploads anything still local, then returns a document whose URLs are all real.
 *
 * This step cannot be skipped by accident: `assetUrlSchema` rejects anything that
 * is not https, so saving a document that still points at an object URL fails
 * validation with a clear message rather than persisting a URL that is dead the
 * moment the tab closes.
 *
 * Uploads run one at a time rather than in parallel. Five screens with a
 * screenshot and a background each is ten files; firing them all at once on a
 * phone tether is how a save turns into a spinner that never resolves, and the
 * per-file progress a sequential run reports is the only honest thing to show.
 */
export async function prepareDocForSave(
  state: EditorState,
  onProgress?: (key: AssetKey, fraction: number) => void,
): Promise<EditorDoc> {
  const doc = state.doc;
  const uploaded = new Map<AssetKey, string>();

  for (const target of collectTargets(doc)) {
    const asset = state.assets[target.key];

    if (!asset) continue;

    if (asset.status === "uploaded" && asset.secureUrl) {
      uploaded.set(target.key, asset.secureUrl);
      continue;
    }

    state.updateAsset(target.key, { status: "uploading", progress: 0 });

    try {
      // The original File is not retained, but its object URL still resolves to
      // the same bytes — so re-read it rather than holding a second reference.
      const blob = await fetch(asset.localUrl).then((r) => r.blob());
      const extension = blob.type.split("/")[1] ?? "png";
      const file = new File([blob], `${target.layerId ?? "background"}.${extension}`, {
        type: blob.type,
      });

      const result = await uploadToCloudinary(file, target.kind, (fraction) => {
        state.updateAsset(target.key, { progress: fraction });
        onProgress?.(target.key, fraction);
      });

      state.updateAsset(target.key, {
        status: "uploaded",
        progress: 1,
        publicId: result.publicId,
        secureUrl: result.secureUrl,
      });

      uploaded.set(target.key, result.secureUrl);
    } catch (error) {
      state.updateAsset(target.key, {
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      });
      throw error;
    }
  }

  if (uploaded.size === 0) return doc;

  const screens: Screen[] = doc.screens.map((screen) => {
    const backgroundUrl = uploaded.get(backgroundAssetKey(screen.id));

    return {
      ...screen,
      background:
        screen.background.type === "image" && backgroundUrl
          ? { ...screen.background, url: backgroundUrl }
          : screen.background,
      layers: screen.layers.map((layer) => {
        const url = uploaded.get(layerAssetKey(screen.id, layer.id));
        return url ? applyUrl(layer, url) : layer;
      }),
    };
  });

  return { ...doc, screens };
}
