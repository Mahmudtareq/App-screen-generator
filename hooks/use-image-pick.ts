"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { ensureLoaded } from "@/lib/canvas/image-cache";
import { createLocalAsset, describeFileError } from "@/lib/editor/assets";
import type { AppliedImage, ImagePick } from "@/lib/editor/image-picks";
import { useEditorStore } from "@/lib/editor/store";
import type { AssetKey } from "@/lib/editor/types";

/**
 * Turns a pick into a registered asset for one slot.
 *
 * Every source funnels through here, which is the point: the rules for what a
 * picked image becomes — decode it locally first, never share an object URL
 * between two layers, keep an already-uploaded URL rather than re-uploading it —
 * are the same whichever tab it came from, and a source that had to know them
 * would be a source that could get them wrong.
 *
 * Returns null when the pick could not be used; the toast has already been shown.
 * The caller applies the result to the document, because assets are session state
 * and the document is not this hook's to write.
 */
export function useApplyImagePick(assetKey: AssetKey) {
  const setAsset = useEditorStore((s) => s.setAsset);
  const clearAsset = useEditorStore((s) => s.clearAsset);

  return useCallback(
    async (pick: ImagePick): Promise<AppliedImage | null> => {
      try {
        if (pick.kind === "file") {
          const problem = describeFileError(pick.file);
          if (problem) {
            toast.error(problem);
            return null;
          }

          const asset = await createLocalAsset(pick.file, assetKey);
          setAsset(asset);
          return { width: asset.width, height: asset.height, url: null };
        }

        if (pick.url.startsWith("blob:")) {
          // Re-read the bytes into this slot's *own* object URL. Two layers
          // pointing at one URL would have the first one deleted revoke the
          // second's bitmap, and the second would go blank with nothing to
          // explain it.
          const blob = await fetch(pick.url).then((response) => response.blob());
          const extension = blob.type.split("/")[1] ?? "png";
          const asset = await createLocalAsset(
            new File([blob], `reused.${extension}`, { type: blob.type }),
            assetKey,
          );

          setAsset(asset);
          return { width: asset.width, height: asset.height, url: null };
        }

        // Already uploaded: keep the URL rather than pulling the bytes back down
        // to push them up again under a second public id.
        const image = await ensureLoaded(pick.url);
        clearAsset(assetKey);

        return {
          width: image.naturalWidth,
          height: image.naturalHeight,
          url: pick.url,
        };
      } catch {
        toast.error("That image could not be read. It may be corrupt.");
        return null;
      }
    },
    [assetKey, setAsset, clearAsset],
  );
}
