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
import {
  selectCardScale,
  selectOpaqueFallback,
  selectScreenImageUrls,
} from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { screenLabel } from "@/schemas/editor";

import { Field } from "../panels/panel-section";

/**
 * Exports one screen at full artboard resolution.
 *
 * One screen at a time, deliberately: each screen is its own Konva Stage, and a
 * browser holding five 32-megapixel canvases at once is how this runs out of memory
 * on an iPad. Batch export across the whole set is the first feature here that
 * genuinely needs a server to composite — see PLAN.md.
 */
export function ExportDialog() {
  const screenId = useEditorStore((s) => s.exportScreenId);
  const closeExport = useEditorStore((s) => s.closeExport);
  const isExporting = useEditorStore((s) => s.isExporting);
  const setExporting = useEditorStore((s) => s.setExporting);

  const artboard = useEditorStore((s) => s.doc.artboard);
  const cardScale = useEditorStore(selectCardScale);
  const index = useEditorStore((s) =>
    s.doc.screens.findIndex((screen) => screen.id === screenId),
  );
  const screen = useEditorStore((s) =>
    s.doc.screens.find((current) => current.id === screenId),
  );

  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState<ExportScale>(2);
  const [quality, setQuality] = useState(0.92);
  const [transparent, setTransparent] = useState(false);

  const webpAvailable = useMemo(() => supportsWebpExport(), []);

  const dims = exportDimensions(artboard, scale);

  const handleExport = async () => {
    if (!screenId) return;

    const stage = getStage(screenId);
    if (!stage) {
      toast.error("That screen's canvas is not ready yet.");
      return;
    }

    setExporting(true);
    try {
      // Read these at export time rather than subscribing: the dialog does not need
      // to re-render when an upload finishes, only to know the URLs when it fires.
      const state = useEditorStore.getState();

      const blob = await exportStage(
        stage,
        { format, scale, quality, transparent },
        {
          fitScale: cardScale,
          artboard,
          imageUrls: selectScreenImageUrls(state, screenId),
          opaqueFallback: selectOpaqueFallback(state, screenId),
        },
      );

      const extension =
        EXPORT_FORMATS.find((f) => f.id === format)?.extension ?? "png";
      downloadBlob(blob, toFilename(`screen-${index + 1}`, extension));
      closeExport();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Export failed. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={Boolean(screenId)} onOpenChange={(open) => !open && closeExport()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Export {screen ? screenLabel(screen, index) : "screen"}
          </DialogTitle>
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
          <Button variant="ghost" onClick={closeExport}>
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
