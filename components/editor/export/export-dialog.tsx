"use client";

import { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { getStage } from "@/lib/canvas/stage-registry";
import { downloadBlob, toFilename } from "@/lib/export/download";
import { exportStage } from "@/lib/export/export-stage";
import {
  EXPORT_FORMATS,
  EXPORT_SCALES,
  exportDimensions,
  SUPPORTS_ALPHA,
  SUPPORTS_QUALITY,
  supportsWebpExport,
  type ExportFormat,
  type ExportScale,
} from "@/lib/export/formats";
import { selectFitScale, selectImageSource } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";

import { Field } from "../panels/panel-section";

export function ExportDialog() {
  const open = useEditorStore((s) => s.exportOpen);
  const setOpen = useEditorStore((s) => s.setExportOpen);
  const isExporting = useEditorStore((s) => s.isExporting);
  const setExporting = useEditorStore((s) => s.setExporting);
  const artboard = useEditorStore((s) => s.doc.artboard);
  const fitScale = useEditorStore(selectFitScale);
  const background = useEditorStore((s) => s.doc.background);

  const screenshotUrl = useEditorStore((s) =>
    selectImageSource(s, "screenshot", s.doc.screenshot.url),
  );
  const logoUrl = useEditorStore((s) =>
    s.doc.logo ? selectImageSource(s, "logo", s.doc.logo.url) : null,
  );
  const backgroundUrl = useEditorStore((s) =>
    s.doc.background.type === "image"
      ? selectImageSource(s, "background", s.doc.background.url)
      : null,
  );

  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState<ExportScale>(2);
  const [quality, setQuality] = useState(0.92);
  const [transparent, setTransparent] = useState(false);

  const webpAvailable = useMemo(() => supportsWebpExport(), []);

  const dims = exportDimensions(artboard, scale);

  const handleExport = async () => {
    const stage = getStage();
    if (!stage) {
      toast.error("The canvas is not ready yet.");
      return;
    }

    setExporting(true);
    try {
      const blob = await exportStage(
        stage,
        { format, scale, quality, transparent },
        {
          fitScale,
          artboard,
          imageUrls: [screenshotUrl, logoUrl, backgroundUrl],
          opaqueFallback: background.type === "color" ? background.color : "#ffffff",
        },
      );

      const extension =
        EXPORT_FORMATS.find((f) => f.id === format)?.extension ?? "png";
      downloadBlob(blob, toFilename("mockup", extension));
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Export failed. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export mockup</DialogTitle>
          <DialogDescription>
            Rendered at full artboard resolution, not upscaled from the preview.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Format">
            <ToggleGroup
              type="single"
              value={format}
              onValueChange={(v) => v && setFormat(v as ExportFormat)}
              variant="outline"
              className="w-full"
            >
              {EXPORT_FORMATS.map((option) => (
                <ToggleGroupItem
                  key={option.id}
                  value={option.id}
                  className="flex-1 text-xs"
                  // Hiding rather than silently emitting PNG bytes under a .webp
                  // name, which is what the browser does when it cannot encode.
                  disabled={option.id === "webp" && !webpAvailable}
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <Field label="Scale" hint={`${dims.width} × ${dims.height} px`}>
            <ToggleGroup
              type="single"
              value={String(scale)}
              onValueChange={(v) => v && setScale(Number(v) as ExportScale)}
              variant="outline"
              className="w-full"
            >
              {EXPORT_SCALES.map((option) => {
                const optionDims = exportDimensions(artboard, option);
                return (
                  <ToggleGroupItem
                    key={option}
                    value={String(option)}
                    className="flex-1 text-xs"
                    disabled={!optionDims.withinLimits}
                    title={
                      optionDims.withinLimits
                        ? `${optionDims.width} × ${optionDims.height}`
                        : `${optionDims.megapixels.toFixed(0)}MP exceeds what browsers can rasterise`
                    }
                  >
                    {option}×
                  </ToggleGroupItem>
                );
              })}
            </ToggleGroup>
          </Field>

          {SUPPORTS_QUALITY[format] && (
            <Field label="Quality" hint={`${Math.round(quality * 100)}%`}>
              <Slider
                min={0.4}
                max={1}
                step={0.01}
                value={[quality]}
                onValueChange={([q]) => setQuality(q)}
              />
            </Field>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-normal">Transparent background</Label>
              {!SUPPORTS_ALPHA[format] && (
                <p className="text-[11px] text-muted-foreground">
                  JPG cannot store transparency — a solid background is used.
                </p>
              )}
            </div>
            <Switch
              checked={transparent && SUPPORTS_ALPHA[format]}
              disabled={!SUPPORTS_ALPHA[format]}
              onCheckedChange={setTransparent}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || !dims.withinLimits}>
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
