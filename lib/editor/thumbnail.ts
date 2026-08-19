"use client";

import { getStage } from "@/lib/canvas/stage-registry";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { exportStage } from "@/lib/export/export-stage";

import {
  selectCardScale,
  selectOpaqueFallback,
  selectScreenImageUrls,
} from "./selectors";
import type { EditorState } from "./state";

/** Target width of a preview card image, in output px. */
const THUMBNAIL_WIDTH = 400;

/**
 * Renders the first screen through the export pipeline at card size and uploads
 * it to Cloudinary, returning the https URL — or null on any failure.
 *
 * One capture serves both preview surfaces: the dashboard's project cards and
 * the template gallery's cards.
 *
 * Null rather than a throw, deliberately: a project or template is fully usable
 * without a preview image (the card falls back to a placeholder), so a
 * Cloudinary hiccup or an unmounted Stage must never block the save itself.
 *
 * Imports only `getStage`/`exportStage`, never Konva values — the same boundary
 * the export dialog respects, so `pnpm build` stays clean.
 */
export async function captureDocThumbnail(
  state: EditorState,
): Promise<string | null> {
  try {
    const screenId = state.doc.screens[0]?.id;
    if (!screenId) return null;

    const stage = getStage(screenId);
    if (!stage) return null;

    const { artboard } = state.doc;

    const blob = await exportStage(
      stage,
      {
        format: "jpeg",
        scale: Math.min(1, THUMBNAIL_WIDTH / artboard.width),
        quality: 0.8,
        transparent: false,
      },
      {
        fitScale: selectCardScale(state),
        artboard,
        imageUrls: selectScreenImageUrls(state, screenId),
        opaqueFallback: selectOpaqueFallback(state, screenId),
      },
    );

    const file = new File([blob], "thumbnail.jpg", {
      type: blob.type || "image/jpeg",
    });

    const uploaded = await uploadToCloudinary(file, "thumbnail");
    return uploaded.secureUrl;
  } catch {
    return null;
  }
}
