"use client";

import { useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, Upload } from "lucide-react";

import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/editor/assets";
import { cn } from "@/lib/utils";

import type { ImageSourceProps } from "../image-sources";

/**
 * Bytes from this machine: dropped, pasted, or chosen from the file dialog.
 *
 * Paste is here rather than on the layer panel because this is the surface that is
 * open and focused when someone has just copied a screenshot — a global listener
 * would fight the caption editor for the same keystroke.
 */
export function UploadSource({ onPick }: ImageSourceProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      const file = files[0];
      if (file) onPick({ kind: "file", file });
    },
    accept: ACCEPTED_IMAGE_TYPES,
    maxSize: MAX_UPLOAD_BYTES,
    multiple: false,
  });

  useEffect(() => {
    const handler = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.items ?? [])]
        .find((item) => item.kind === "file")
        ?.getAsFile();

      if (file) {
        event.preventDefault();
        onPick({ kind: "file", file });
      }
    };

    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [onPick]);

  return (
    <div className="flex min-h-full flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Upload className="size-4" />
        </span>
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Add image</p>
          <p className="text-xs text-muted-foreground">
            Drag and drop, paste, or click to upload. PNG, JPG or WebP up to{" "}
            {MAX_UPLOAD_BYTES / 1024 / 1024}MB.
          </p>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-56 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/40",
        )}
      >
        <input {...getInputProps()} />
        <ImagePlus className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Drop a file or click to add a local image</p>
        <p className="text-xs text-muted-foreground">
          Transparent PNG works best for logos and badges.
        </p>
      </div>
    </div>
  );
}
