"use client";

import { RotateCw } from "lucide-react";

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { isAspectMismatch } from "@/lib/canvas/cover";
import { DEVICES, type DeviceId } from "@/lib/devices/catalog";
import { selectOrientedSpec } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";

import { ImageDropzone } from "../upload/image-dropzone";
import { UrlCapture } from "../upload/url-capture";
import { Field, PanelSection } from "./panel-section";

export function DevicePanel() {
  const deviceId = useEditorStore((s) => s.doc.deviceId);
  const colorwayId = useEditorStore((s) => s.doc.colorwayId);
  const orientation = useEditorStore((s) => s.doc.orientation);
  const shadowEnabled = useEditorStore((s) => s.doc.device.shadowEnabled);
  const screenshot = useEditorStore((s) => s.doc.screenshot);
  const spec = useEditorStore(selectOrientedSpec);
  const asset = useEditorStore((s) => s.assets.screenshot);

  const setDevice = useEditorStore((s) => s.setDevice);
  const setColorway = useEditorStore((s) => s.setColorway);
  const setOrientation = useEditorStore((s) => s.setOrientation);
  const setDeviceTransform = useEditorStore((s) => s.setDeviceTransform);
  const setScreenshot = useEditorStore((s) => s.setScreenshot);
  const clearAsset = useEditorStore((s) => s.clearAsset);
  const clearScreenshot = useEditorStore((s) => s.clearScreenshot);

  const mismatch =
    asset && isAspectMismatch(asset, spec.screenshot)
      ? `This image is ${asset.width} × ${asset.height}; the ${spec.name} screen is ${spec.screenshot.width} × ${spec.screenshot.height}, so it will be cropped to fit.`
      : null;

  return (
    <>
      <PanelSection title="Device">
        <Field label="Model">
          <Select value={deviceId} onValueChange={(v) => setDevice(v as DeviceId)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEVICES.map((device) => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Finish">
          <Select value={colorwayId} onValueChange={setColorway}>
            <SelectTrigger className="w-full">
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

        <Field label="Orientation">
          <ToggleGroup
            type="single"
            value={orientation}
            onValueChange={(v) => v && setOrientation(v as "portrait" | "landscape")}
            variant="outline"
            className="w-full"
            disabled={!spec.supportsLandscape}
          >
            <ToggleGroupItem value="portrait" className="flex-1 text-xs">
              Portrait
            </ToggleGroupItem>
            <ToggleGroupItem value="landscape" className="flex-1 text-xs">
              <RotateCw className="size-3" />
              Landscape
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>

        <div className="flex items-center justify-between">
          <Field label="Drop shadow">
            <span className="sr-only">Drop shadow</span>
          </Field>
          <Switch
            checked={shadowEnabled}
            onCheckedChange={(v) => setDeviceTransform({ shadowEnabled: v })}
          />
        </div>
      </PanelSection>

      <PanelSection title="Screenshot">
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
              slot="screenshot"
              label={asset ? "Replace screenshot" : "Add your screenshot"}
              hint="PNG, JPG or WebP · up to 15MB"
            />
          </TabsContent>

          <TabsContent value="url" className="mt-3">
            <UrlCapture />
          </TabsContent>
        </Tabs>

        {mismatch && (
          <p className="rounded-md bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
            {mismatch}
          </p>
        )}

        {asset && (
          <>
            <Field label="Zoom" hint={`${screenshot.zoom.toFixed(2)}×`}>
              <Slider
                min={1}
                max={3}
                step={0.01}
                value={[screenshot.zoom]}
                onValueChange={([zoom]) => setScreenshot({ zoom })}
              />
            </Field>

            {screenshot.zoom > 1 && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Pan X">
                  <Slider
                    min={-1}
                    max={1}
                    step={0.01}
                    value={[screenshot.pan.x]}
                    onValueChange={([x]) =>
                      setScreenshot({ pan: { ...screenshot.pan, x } })
                    }
                  />
                </Field>
                <Field label="Pan Y">
                  <Slider
                    min={-1}
                    max={1}
                    step={0.01}
                    value={[screenshot.pan.y]}
                    onValueChange={([y]) =>
                      setScreenshot({ pan: { ...screenshot.pan, y } })
                    }
                  />
                </Field>
              </div>
            )}

            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => {
                clearAsset("screenshot");
                clearScreenshot();
              }}
            >
              Remove screenshot
            </button>
          </>
        )}
      </PanelSection>
    </>
  );
}
