"use client";

import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { EDITOR_DOC_VERSION, editorDocSchema, type EditorDoc } from "@/schemas/editor";

import { createEmptyDoc } from "./defaults";
import type { EditorState } from "./state";
import type { AssetSlot } from "./types";

export const DRAFT_KEY = "editor:draft:v1";

/**
 * Migrations from older `doc.version` values, applied in order.
 *
 * Empty for now — version 1 is the first shape. It exists because the editor
 * document is stored as an opaque blob under `Project.doc`, which is exactly the
 * arrangement that needs a migration hook to stay changeable.
 */
const MIGRATIONS: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {};

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
  // A document we cannot parse is not worth half-restoring — a corrupt draft
  // should drop the user into a clean editor, not a broken one.
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

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing useful to do.
  }
}

export function emptyDoc() {
  return createEmptyDoc();
}

/* ------------------------------ save preparation --------------------------- */

/**
 * Which document field each slot's uploaded URL has to be written back into.
 */
const SLOTS: AssetSlot[] = ["screenshot", "logo", "background"];

function needsUpload(state: EditorState, slot: AssetSlot): boolean {
  const asset = state.assets[slot];
  if (!asset) return false;
  return asset.status !== "uploaded" || !asset.secureUrl;
}

/**
 * Uploads anything still local, then returns a document whose URLs are all real.
 *
 * This step cannot be skipped by accident: `assetUrlSchema` rejects `blob:` and
 * `data:` URLs, so saving a document that still points at an object URL fails
 * validation with a clear message rather than persisting a URL that is dead the
 * moment the tab closes.
 */
export async function prepareDocForSave(
  state: EditorState,
  onProgress?: (slot: AssetSlot, fraction: number) => void,
): Promise<EditorDoc> {
  const uploaded: Partial<Record<AssetSlot, string>> = {};

  for (const slot of SLOTS) {
    const asset = state.assets[slot];
    if (!asset) continue;

    if (!needsUpload(state, slot)) {
      uploaded[slot] = asset.secureUrl;
      continue;
    }

    state.updateAsset(slot, { status: "uploading", progress: 0 });

    try {
      // The original File is not retained, but its object URL still resolves to
      // the same bytes — so re-read it rather than holding a second reference.
      const blob = await fetch(asset.localUrl).then((r) => r.blob());
      const file = new File([blob], `${slot}.${blob.type.split("/")[1] ?? "png"}`, {
        type: blob.type,
      });

      const result = await uploadToCloudinary(file, slot, (fraction) => {
        state.updateAsset(slot, { progress: fraction });
        onProgress?.(slot, fraction);
      });

      state.updateAsset(slot, {
        status: "uploaded",
        progress: 1,
        publicId: result.publicId,
        secureUrl: result.secureUrl,
      });

      uploaded[slot] = result.secureUrl;
    } catch (error) {
      state.updateAsset(slot, {
        status: "error",
        error: error instanceof Error ? error.message : "Upload failed",
      });
      throw error;
    }
  }

  const doc = state.doc;

  return {
    ...doc,
    screenshot: {
      ...doc.screenshot,
      url: uploaded.screenshot ?? doc.screenshot.url,
    },
    logo: doc.logo ? { ...doc.logo, url: uploaded.logo ?? doc.logo.url } : null,
    background:
      doc.background.type === "image"
        ? { ...doc.background, url: uploaded.background ?? doc.background.url }
        : doc.background,
  };
}
