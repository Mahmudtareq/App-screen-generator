"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { DEVICE_TYPE_OPTIONS, deviceTypeOf } from "@/lib/devices/frame-modes";
import { selectOrientedSpec } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { layerAssetKey } from "@/lib/editor/types";
import type { DeviceLayer } from "@/schemas/editor";

import { DevicePickerDialog } from "../devices/device-picker-dialog";
import { ImageDropzone } from "../upload/image-dropzone";
import { UrlCapture } from "../upload/url-capture";
import { Field } from "./panel-section";

type VerticalPosition = "top" | "center" | "bottom";

/**
 * Controls for one device layer.
 *
 * Model and orientation are document-level — one device for the whole set, so
 * five frames of one listing cannot disagree about which phone they are. They
 * are still *surfaced* here, next to everything else about the device, because
 * this is where anyone looks for them; the controls just write through to the
 * document-level setters, same as the toolbar's Setup popover.
 */
export function DeviceLayerPanel({
  screenId,
  layer,
}: {
  screenId: string;
  layer: DeviceLayer;
}) {
  const spec = useEditorStore(selectOrientedSpec);
  const orientation = useEditorStore((s) => s.doc.orientation);
  const artboard = useEditorStore((s) => s.doc.artboard);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const setOrientation = useEditorStore((s) => s.setOrientation);
  const clearAsset = useEditorStore((s) => s.clearAsset);

  const [pickerOpen, setPickerOpen] = useState(false);

  const assetKey = layerAssetKey(screenId, layer.id);
  const asset = useEditorStore((s) => s.assets[assetKey]);

  const patch = (next: Partial<DeviceLayer>) =>
    updateLayer<DeviceLayer>(screenId, layer.id, next);

  const patchScreenshot = (next: Partial<DeviceLayer["screenshot"]>) =>
    patch({ screenshot: { ...layer.screenshot, ...next } });

  const hasImage = Boolean(asset) || Boolean(layer.screenshot.url);

  const deviceType = deviceTypeOf(layer);
  const framed = layer.frameMode === "device";
  const fullBleed = layer.frameMode === "full";
  // Zoom/pan only mean anything while the bitmap is being cover-cropped.
  const cropped = fullBleed || layer.screenshot.fit === "cover";

  const placeVertically = (position: VerticalPosition) => {
    const scaledHeight = spec.body.height * layer.scale;
    const y =
      position === "top"
        ? 0
        : position === "center"
          ? (artboard.height - scaledHeight) / 2
          : artboard.height - scaledHeight;
    patch({ y });
  };

  const applyDeviceType = (id: string) => {
    const option = DEVICE_TYPE_OPTIONS.find((entry) => entry.id === id);
    if (option) {
      patch({ frameMode: option.frameMode, perspective: option.perspective });
    }
  };

  const mismatch =
    asset && isAspectMismatch(asset, spec.screenshot)
      ? `This image is ${asset.width} × ${asset.height}; the ${spec.name} screen is ${spec.screenshot.width} × ${spec.screenshot.height}, so it will be cropped to fit.`
      : null;

  return (
    <div className="space-y-3">
      <Field label="Device">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-full justify-between font-normal"
          onClick={() => setPickerOpen(true)}
        >
          <span className="truncate">{spec.name}</span>
          <RefreshCw className="size-3.5 opacity-60" />
        </Button>
      </Field>
      <DevicePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} />

      <Field label="Device type">
        <Select value={deviceType.id} onValueChange={applyDeviceType}>
          <SelectTrigger className="h-8 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEVICE_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Orientation" hint="all screens">
          <Select
            value={orientation}
            onValueChange={(v) => setOrientation(v as "portrait" | "landscape")}
            disabled={!spec.supportsLandscape}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portrait">Portrait</SelectItem>
              <SelectItem value="landscape">Landscape</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {!fullBleed && (
          <Field label="Fit">
            <Select
              value={layer.screenshot.fit}
              onValueChange={(fit) =>
                patchScreenshot({ fit: fit as "cover" | "contain" })
              }
            >
              <SelectTrigger className="h-8 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Fill (crop)</SelectItem>
                <SelectItem value="contain">Contain</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

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

      {framed && (
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
      )}

      {!fullBleed && (
        <>
          <Field label="Vertical position">
            <div className="grid grid-cols-3 gap-1.5">
              {(["top", "center", "bottom"] as const).map((position) => (
                <Button
                  key={position}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs capitalize"
                  onClick={() => placeVertically(position)}
                >
                  {position}
                </Button>
              ))}
            </div>
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
        </>
      )}

      {hasImage && (
        <>
          {cropped && (
            <Field label="Zoom" hint={`${layer.screenshot.zoom.toFixed(2)}×`}>
              <Slider
                min={1}
                max={3}
                step={0.01}
                value={[layer.screenshot.zoom]}
                onValueChange={([zoom]) => patchScreenshot({ zoom })}
              />
            </Field>
          )}

          {cropped && layer.screenshot.zoom > 1 && (
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
