"use client";

import { useCallback, useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";

import { ColorPicker } from "@/components/common/color-picker";
import { NumberInput } from "@/components/common/number-input";
import { ImagePickerDialog } from "@/components/editor/images/image-picker-dialog";
import { ImagePreview } from "@/components/editor/images/image-preview";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApplyImagePick } from "@/hooks/use-image-pick";
import { clearTintCache } from "@/lib/canvas/tint";
import type { ImagePick } from "@/lib/editor/image-picks";
import { selectImageSource } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { layerAssetKey } from "@/lib/editor/types";
import type { ImageAlign, ImageFit, ImageLayer } from "@/schemas/editor";

import { EffectToggle } from "./effect-toggle";
import { Field } from "./panel-section";

const FIT_OPTIONS: readonly { value: ImageFit; label: string; hint: string }[] = [
  { value: "contain", label: "Contain", hint: "Whole image inside the box" },
  { value: "cover", label: "Cover", hint: "Fills the box, crops the overflow" },
  { value: "fill", label: "Stretch", hint: "Distorts to the box exactly" },
];

const ALIGN_OPTIONS: readonly { value: ImageAlign; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "center", label: "Center" },
  { value: "bottom", label: "Bottom" },
];

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
  const source = useEditorStore((s) => selectImageSource(s, assetKey, layer.url));
  const applyPick = useApplyImagePick(assetKey);

  const [picking, setPicking] = useState(false);

  const patch = useCallback(
    (next: Partial<ImageLayer>) => updateLayer<ImageLayer>(screenId, layer.id, next),
    [updateLayer, screenId, layer.id],
  );

  /**
   * Re-shape the box to the image's real aspect ratio on accept.
   *
   * The layer was created before any file existed, so its height is a guess. Only
   * the decoded bitmap knows the truth, and correcting it here is what stops a
   * dropped logo from arriving letterboxed inside a box the wrong shape.
   */
  const handlePick = useCallback(
    async (pick: ImagePick) => {
      const applied = await applyPick(pick);
      if (!applied || applied.width <= 0) return;

      patch({
        assetId: null,
        url: applied.url,
        height: layer.width * (applied.height / applied.width),
      });
    },
    [applyPick, patch, layer.width],
  );

  const hasImage = Boolean(source);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[7.5rem_1fr] gap-3">
        <ImagePreview
          url={source}
          tint={layer.tint}
          boxLongEdge={Math.max(layer.width, layer.height)}
        />

        <div className="space-y-2">
          <Field label="Fit">
            <Select
              value={layer.fit}
              onValueChange={(value) => patch({ fit: value as ImageFit })}
              disabled={!hasImage}
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Vertical position">
            <Select
              value={layer.align}
              onValueChange={(value) => patch({ align: value as ImageAlign })}
              // Stretching leaves no slack to align within, so the control would be
              // present and inert — which reads as broken rather than as not applicable.
              disabled={!hasImage || layer.fit === "fill"}
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALIGN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>

      <Button className="w-full" onClick={() => setPicking(true)}>
        <ImageIcon className="size-4" />
        {hasImage ? "Replace image" : "Select image"}
      </Button>

      <ImagePickerDialog
        open={picking}
        onOpenChange={setPicking}
        assetKey={assetKey}
        onPick={handlePick}
        title={hasImage ? "Replace this image" : "Choose an image"}
      />

      {hasImage && (
        <>
          {/*
            Typed rather than dragged. Every one of these is a value people arrive
            with a number for — a 264px badge, a 90% wash, an 8px radius — and a
            slider makes hitting one an exercise in aim. Arrow keys still nudge,
            with Shift for a coarse step, so the drag-ish gesture is not lost.
          */}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Size">
              <NumberInput
                label="Width"
                value={layer.width}
                onChange={(width) =>
                  // Height follows width so an image can never be stretched from
                  // this panel; free reframing stays available on the canvas.
                  patch({ width, height: width * (layer.height / layer.width) })
                }
                min={Math.round(artboard.width * 0.03)}
                max={artboard.width}
                suffix="px"
              />
            </Field>

            <Field label="Opacity">
              <NumberInput
                label="Opacity"
                value={Math.round(layer.opacity * 100)}
                onChange={(percent) => patch({ opacity: percent / 100 })}
                min={0}
                max={100}
                suffix="%"
              />
            </Field>

            <Field label="Rotation">
              <NumberInput
                label="Rotation"
                value={layer.rotation}
                onChange={(rotation) => patch({ rotation })}
                min={-180}
                max={180}
                suffix="°"
              />
            </Field>

            <Field label="Corner radius">
              <NumberInput
                label="Corner radius"
                value={layer.cornerRadius}
                onChange={(cornerRadius) => patch({ cornerRadius })}
                min={0}
                max={Math.round(Math.max(8, Math.min(layer.width, layer.height) / 2))}
                suffix="px"
              />
            </Field>
          </div>

          <EffectToggle
            label="Tint"
            checked={Boolean(layer.tint)}
            onCheckedChange={(on) =>
              patch({ tint: on ? { color: "#4f46e5", strength: 1 } : null })
            }
          />

          <TintControls layer={layer} patch={patch} />

          <Button
            variant="outline"
            className="w-full text-muted-foreground hover:text-destructive"
            onClick={() => {
              clearTintCache(source ?? undefined);
              clearAsset(assetKey);
              patch({ assetId: null, url: null });
            }}
          >
            <Trash2 className="size-4" />
            Remove image
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * The colour painted over the image.
 *
 * Strength earns its place next to the swatch: the two ends of the range are
 * different features — 100% turns a transparent logo into a flat silhouette in the
 * brand colour, while 30% washes a photo without hiding what it is of.
 */
function TintControls({
  layer,
  patch,
}: {
  layer: ImageLayer;
  patch: (next: Partial<ImageLayer>) => void;
}) {
  const tint = layer.tint;
  if (!tint) return null;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <span className="text-xs font-medium">Tint</span>

      <ColorPicker
        value={tint.color}
        onChange={(color) => patch({ tint: { ...tint, color } })}
      />

      <Field label="Strength">
        <NumberInput
          label="Tint strength"
          value={Math.round(tint.strength * 100)}
          onChange={(percent) => patch({ tint: { ...tint, strength: percent / 100 } })}
          min={0}
          max={100}
          suffix="%"
        />
      </Field>
    </div>
  );
}
