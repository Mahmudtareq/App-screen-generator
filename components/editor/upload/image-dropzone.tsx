"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImageUp, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  ACCEPTED_IMAGE_TYPES,
  createLocalAsset,
  describeFileError,
  MAX_UPLOAD_BYTES,
} from "@/lib/editor/assets";
import { useEditorStore } from "@/lib/editor/store";
import type { AssetKey, EditorAsset } from "@/lib/editor/types";

export function ImageDropzone({
  assetKey,
  label,
  hint,
  compact = false,
  onAccepted,
}: {
  assetKey: AssetKey;
  label: string;
  hint?: string;
  /** Tighter styling, for a dropzone nested inside a layer row. */
  compact?: boolean;
  onAccepted?: (asset: EditorAsset) => void;
}) {
  const setAsset = useEditorStore((s) => s.setAsset);
  const asset = useEditorStore((s) => s.assets[assetKey]);

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      const problem = describeFileError(file);
      if (problem) {
        toast.error(problem);
        return;
      }

      try {
        const next = await createLocalAsset(file, assetKey);
        setAsset(next);
        onAccepted?.(next);
      } catch {
        toast.error("That image could not be read. It may be corrupt.");
      }
    },
    [assetKey, setAsset, onAccepted],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_UPLOAD_BYTES,
    multiple: false,
  });

  const uploading = asset?.status === "uploading";

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center transition-colors",
        compact ? "gap-1 p-3" : "p-6",
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-accent/40",
      )}
    >
      <input {...getInputProps()} />

      {uploading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : (
        <ImageUp className={cn("text-muted-foreground", compact ? "size-4" : "size-5")} />
      )}

      <div className="space-y-0.5">
        <p className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{label}</p>
        {!compact && (
          <p className="text-xs text-muted-foreground">
            {hint ?? "Drop an image, or click to browse"}
          </p>
        )}
      </div>

      {asset && (
        <p className="text-[11px] text-muted-foreground">
          {asset.width} × {asset.height}
          {uploading && ` · uploading ${Math.round(asset.progress * 100)}%`}
          {asset.status === "error" && " · upload failed"}
        </p>
      )}
    </div>
  );
}
