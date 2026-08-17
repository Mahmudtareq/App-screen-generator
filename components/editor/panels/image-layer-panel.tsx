"use client";

import { useCallback } from "react";

import { Slider } from "@/components/ui/slider";
import { useEditorStore } from "@/lib/editor/store";
import { layerAssetKey, type EditorAsset } from "@/lib/editor/types";
import type { ImageLayer } from "@/schemas/editor";

import { ImageDropzone } from "../upload/image-dropzone";
import { Field } from "./panel-section";

/** Controls for one image layer, shown when its row is expanded. */
export function ImageLayerPanel({
  screenId,
  layer,
}: {
  screenId: string;
  layer: ImageLayer;
}) {
  const artboard = useEditorStore((s) => s.doc.artboard);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const clearAsset = useEditorStore((s) => s.clearAsset);

  const assetKey = layerAssetKey(screenId, layer.id);
  const asset = useEditorStore((s) => s.assets[assetKey]);

  const patch = useCallback(
    (next: Partial<ImageLayer>) => updateLayer<ImageLayer>(screenId, layer.id, next),
    [updateLayer, screenId, layer.id],
  );

  /**
   * Re-shape the box to the image's real aspect ratio on accept.
   *
   * The layer was created before any file existed, so its height is a guess. Only
   * the decoded bitmap knows the truth, and correcting it here is what stops a
   * dropped logo from arriving visibly squashed.
   */
  const handleAccepted = useCallback(
    (next: EditorAsset) => {
      if (next.width <= 0) return;
      patch({ height: layer.width * (next.height / next.width) });
    },
    [patch, layer.width],
  );

  const hasImage = Boolean(asset) || Boolean(layer.url);

  return (
    <div className="space-y-3">
      <ImageDropzone
        assetKey={assetKey}
        label={hasImage ? "Replace image" : "Select image"}
        hint="Transparent PNG works best"
        onAccepted={handleAccepted}
      />

      {hasImage && (
        <>
          <Field label="Size" hint={`${Math.round(layer.width)}px`}>
            <Slider
              min={artboard.width * 0.03}
              max={artboard.width}
              step={1}
              value={[layer.width]}
              onValueChange={([width]) =>
                // Height follows width so an image can never be stretched from this
                // panel; free resizing stays available on the canvas.
                patch({ width, height: width * (layer.height / layer.width) })
              }
            />
          </Field>

          <Field label="Opacity" hint={`${Math.round(layer.opacity * 100)}%`}>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[layer.opacity]}
              onValueChange={([opacity]) => patch({ opacity })}
            />
          </Field>

          <Field label="Rotation" hint={`${Math.round(layer.rotation)}°`}>
            <Slider
              min={-180}
              max={180}
              step={1}
              value={[layer.rotation]}
              onValueChange={([rotation]) => patch({ rotation })}
            />
          </Field>

          <Field label="Corner radius" hint={`${Math.round(layer.cornerRadius)}px`}>
            <Slider
              min={0}
              max={Math.max(8, Math.min(layer.width, layer.height) / 2)}
              step={1}
              value={[layer.cornerRadius]}
              onValueChange={([cornerRadius]) => patch({ cornerRadius })}
            />
          </Field>

          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              clearAsset(assetKey);
              patch({ assetId: null, url: null });
            }}
          >
            Remove image
          </button>
        </>
      )}
    </div>
  );
}
