import { ensureLoaded } from "@/lib/canvas/image-cache";

import type { AssetKey, EditorAsset } from "./types";

export const ACCEPTED_IMAGE_TYPES = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
} as const;

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/**
 * Turns a dropped file into a renderable asset, without touching the network.
 *
 * The screenshot appears in the device frame in well under a tenth of a second
 * this way, and the Cloudinary upload runs afterwards in the background. Waiting
 * on a round trip before showing the user their own image is the single most
 * noticeable way this kind of editor feels slow.
 */
export async function createLocalAsset(
  file: File,
  key: AssetKey,
): Promise<EditorAsset> {
  const localUrl = URL.createObjectURL(file);

  try {
    // Route it through the same cache the canvas reads from, so the node has the
    // decoded bitmap available on its very next render.
    const image = await ensureLoaded(localUrl);

    return {
      key,
      localUrl,
      width: image.naturalWidth,
      height: image.naturalHeight,
      status: "local",
      progress: 0,
    };
  } catch (error) {
    URL.revokeObjectURL(localUrl);
    throw error;
  }
}

export function describeFileError(file: File): string | null {
  if (!(file.type in ACCEPTED_IMAGE_TYPES)) {
    return "That file type is not supported — use a PNG, JPG or WebP.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${
      MAX_UPLOAD_BYTES / 1024 / 1024
    }MB.`;
  }
  return null;
}
