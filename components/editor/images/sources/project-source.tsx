"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { collectProjectImages } from "@/lib/editor/image-picks";
import { useEditorStore } from "@/lib/editor/store";

import { ImageTile } from "../image-tile";
import type { ImageSourceProps } from "../image-sources";

/**
 * Images this project already holds, for reuse across screens.
 *
 * A store badge belongs on all five frames, and re-uploading it four times is both
 * slower and four Cloudinary objects where one would do. What is offered comes
 * from walking the document, so it can never list an image nothing draws.
 */
export function ProjectSource({ assetKey, onPick }: ImageSourceProps) {
  const doc = useEditorStore((s) => s.doc);
  const assets = useEditorStore((s) => s.assets);
  const [query, setQuery] = useState("");

  const images = useMemo(
    () => collectProjectImages(doc, assets, assetKey),
    [doc, assets, assetKey],
  );

  const needle = query.trim().toLowerCase();
  const shown = needle
    ? images.filter((image) => image.label.toLowerCase().includes(needle))
    : images;

  if (images.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-16 text-center text-sm text-muted-foreground">
        Nothing else in this project uses an image yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by where it is used…"
          className="h-9 pl-8"
          aria-label="Search this project's images"
        />
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
        {shown.map((image) => (
          <ImageTile
            key={image.id}
            url={image.url}
            label={image.label}
            onSelect={() => onPick({ kind: "url", url: image.url })}
          />
        ))}
      </div>

      {shown.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No image matches “{query}”.
        </p>
      )}
    </div>
  );
}
