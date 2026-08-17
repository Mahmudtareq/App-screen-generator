"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isAspectMismatch } from "@/lib/canvas/cover";
import { selectOrientedSpec } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { layerAssetKey } from "@/lib/editor/types";
import type { DeviceLayer } from "@/schemas/editor";

import { ImageDropzone } from "../upload/image-dropzone";
import { UrlCapture } from "../upload/url-capture";
import { Field } from "./panel-section";

/**
 * Controls for one device layer.
 *
 * Model and orientation are deliberately absent — those are document-level and
 * live in the toolbar's Setup popover. A per-screen model picker would let five
 * frames of one listing disagree about which phone they are, which is never what
 * anyone wants and would make export produce mixed dimensions.
 */
export function DeviceLayerPanel({
  screenId,
  layer,
}: {
  screenId: string;
  layer: DeviceLayer;
}) {
  const spec = useEditorStore(selectOrientedSpec);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const clearAsset = useEditorStore((s) => s.clearAsset);

  const assetKey = layerAssetKey(screenId, layer.id);
  const asset = useEditorStore((s) => s.assets[assetKey]);

  const patch = (next: Partial<DeviceLayer>) =>
    updateLayer<DeviceLayer>(screenId, layer.id, next);

  const patchScreenshot = (next: Partial<DeviceLayer["screenshot"]>) =>
    patch({ screenshot: { ...layer.screenshot, ...next } });

  const hasImage = Boolean(asset) || Boolean(layer.screenshot.url);

  const mismatch =
    asset && isAspectMismatch(asset, spec.screenshot)
      ? `This image is ${asset.width} × ${asset.height}; the ${spec.name} screen is ${spec.screenshot.width} × ${spec.screenshot.height}, so it will be cropped to fit.`
      : null;

  return (
    <div className="space-y-3">
      <Tabs defaultValue="upload">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="text-xs">
            Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs">
            Website URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3">
          <ImageDropzone
            assetKey={assetKey}
            label={hasImage ? "Replace screenshot" : "Add your screenshot"}
            hint="PNG, JPG or WebP · up to 15MB"
          />
        </TabsContent>

        <TabsContent value="url" className="mt-3">
          <UrlCapture screenId={screenId} layerId={layer.id} />
        </TabsContent>
      </Tabs>

      {mismatch && (
        <p className="rounded-md bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
          {mismatch}
        </p>
      )}

      <Field label="Finish">
        <Select
          value={layer.colorwayId}
          onValueChange={(colorwayId) => patch({ colorwayId })}
        >
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {spec.colorways.map((colorway) => (
              <SelectItem key={colorway.id} value={colorway.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full border"
                    style={{ backgroundColor: colorway.style.bodyFill }}
                  />
                  {colorway.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Scale" hint={`${(layer.scale * 100).toFixed(0)}%`}>
        <Slider
          min={0.05}
          max={2}
          step={0.005}
          value={[layer.scale]}
          onValueChange={([scale]) => patch({ scale })}
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

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Drop shadow</span>
        <Switch
          checked={layer.shadowEnabled}
          onCheckedChange={(shadowEnabled) => patch({ shadowEnabled })}
        />
      </div>

      {hasImage && (
        <>
          <Field label="Zoom" hint={`${layer.screenshot.zoom.toFixed(2)}×`}>
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={[layer.screenshot.zoom]}
              onValueChange={([zoom]) => patchScreenshot({ zoom })}
            />
          </Field>

          {layer.screenshot.zoom > 1 && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pan X">
                <Slider
                  min={-1}
                  max={1}
                  step={0.01}
                  value={[layer.screenshot.pan.x]}
                  onValueChange={([x]) =>
                    patchScreenshot({ pan: { ...layer.screenshot.pan, x } })
                  }
                />
              </Field>
              <Field label="Pan Y">
                <Slider
                  min={-1}
                  max={1}
                  step={0.01}
                  value={[layer.screenshot.pan.y]}
                  onValueChange={([y]) =>
                    patchScreenshot({ pan: { ...layer.screenshot.pan, y } })
                  }
                />
              </Field>
            </div>
          )}

          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              clearAsset(assetKey);
              patchScreenshot({ assetId: null, url: null, zoom: 1, pan: { x: 0, y: 0 } });
            }}
          >
            Remove screenshot
          </button>
        </>
      )}
    </div>
  );
}
