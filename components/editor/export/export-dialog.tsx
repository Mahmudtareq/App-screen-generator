"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  FolderArchive,
  GalleryHorizontal,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { buildZip, type ZipEntry } from "@/lib/export/zip";
import {
  selectCardScale,
  selectOpaqueFallback,
  selectScreenImageUrls,
} from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { screenLabel } from "@/schemas/editor";
import { cn } from "@/lib/utils";

/** On-screen width of a preview card render, in output px. */
const PREVIEW_WIDTH = 280;

type Section = "preview" | "download";

/**
 * Exports the screen set.
 *
 * Two sections behind a sidebar, deliberately shaped like the tools this app
 * imitates: **Preview** renders every screen as a card, **Download** picks
 * screens and settings and saves them — one file directly when a single screen
 * is selected, a ZIP of the set otherwise.
 *
 * Screens are rasterised **sequentially**, never together: each screen is its
 * own Stage and `exportStage` produces one full-resolution canvas at a time,
 * which is what keeps a five-screen batch from holding five 32MP canvases at
 * once (the iPad failure mode PLAN.md warns about). The ZIP is store-only —
 * the images are already compressed.
 */
export function ExportDialog() {
  const screenId = useEditorStore((s) => s.exportScreenId);

  // Mounted fresh per open, so selection and previews reset without effects.
  if (!screenId) return null;
  return <ExportDialogBody key={screenId} />;
}

function ExportDialogBody() {
  const closeExport = useEditorStore((s) => s.closeExport);
  const isExporting = useEditorStore((s) => s.isExporting);
  const setExporting = useEditorStore((s) => s.setExporting);

  const artboard = useEditorStore((s) => s.doc.artboard);
  const screens = useEditorStore((s) => s.doc.screens);
  const cardScale = useEditorStore(selectCardScale);
  const projectName = useEditorStore((s) => s.projectName);

  const [section, setSection] = useState<Section>("download");
  // Opened from the toolbar → the whole set; from a screen card's action →
  // just that screen, with the rest one click away.
  const [selected, setSelected] = useState<string[]>(() => {
    const state = useEditorStore.getState();
    return state.exportScope === "all" || !state.exportScreenId
      ? state.doc.screens.map((screen) => screen.id)
      : [state.exportScreenId];
  });
  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState<ExportScale>(2);
  const [quality, setQuality] = useState(0.92);
  const [transparent, setTransparent] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  // Preview renders are object URLs; the ref survives re-renders so unmount
  // can revoke whatever was created.
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const previewUrls = useRef<string[]>([]);
  const previewsStarted = useRef(false);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // Generate previews the first time the Preview section opens — sequentially,
  // like the real export, and small enough to be quick.
  useEffect(() => {
    if (section !== "preview" || previewsStarted.current) return;
    previewsStarted.current = true;

    let cancelled = false;

    void (async () => {
      const state = useEditorStore.getState();
      for (const screen of state.doc.screens) {
        const stage = getStage(screen.id);
        if (!stage || cancelled) continue;

        try {
          const blob = await exportStage(
            stage,
            {
              format: "jpeg",
              scale: Math.min(1, PREVIEW_WIDTH / state.doc.artboard.width),
              quality: 0.8,
              transparent: false,
            },
            {
              fitScale: selectCardScale(state),
              artboard: state.doc.artboard,
              imageUrls: selectScreenImageUrls(state, screen.id),
              opaqueFallback: selectOpaqueFallback(state, screen.id),
            },
          );

          if (cancelled) break;
          const url = URL.createObjectURL(blob);
          previewUrls.current.push(url);
          setPreviews((current) => ({ ...current, [screen.id]: url }));
        } catch {
          // A failed preview is a blank card, not a broken dialog.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [section]);

  const webpAvailable = useMemo(() => supportsWebpExport(), []);
  const dims = exportDimensions(artboard, scale);
  const formatLabel =
    EXPORT_FORMATS.find((f) => f.id === format)?.label ?? "PNG";

  const toggleScreen = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );

  const handleDownload = async () => {
    const chosen = screens.filter((screen) => selected.includes(screen.id));
    if (chosen.length === 0) {
      toast.error("Select at least one screen to download.");
      return;
    }

    setExporting(true);
    setProgress({ done: 0, total: chosen.length });
    try {
      const state = useEditorStore.getState();
      const extension =
        EXPORT_FORMATS.find((f) => f.id === format)?.extension ?? "png";

      const entries: ZipEntry[] = [];

      // One screen at a time — see the component comment.
      for (const [index, screen] of chosen.entries()) {
        const stage = getStage(screen.id);
        if (!stage) {
          throw new Error(
            `${screenLabel(screen, screens.indexOf(screen))} is not ready to export yet.`,
          );
        }

        const blob = await exportStage(
          stage,
          { format, scale, quality, transparent },
          {
            fitScale: cardScale,
            artboard,
            imageUrls: selectScreenImageUrls(state, screen.id),
            opaqueFallback: selectOpaqueFallback(state, screen.id),
          },
        );

        const position = screens.indexOf(screen);
        entries.push({
          name: `${String(position + 1).padStart(2, "0")}-${toFilename(
            screenLabel(screen, position),
            extension,
          )}`,
          data: new Uint8Array(await blob.arrayBuffer()),
        });

        setProgress({ done: index + 1, total: chosen.length });
      }

      if (entries.length === 1) {
        // No point wrapping a single file in an archive.
        downloadBlob(new Blob([entries[0].data]), entries[0].name);
      } else {
        downloadBlob(
          buildZip(entries),
          toFilename(`${projectName.trim() || "mockup"} screenshots`, "zip"),
        );
      }

      closeExport();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Export failed. Please try again.",
      );
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isExporting && closeExport()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="flex max-h-[82dvh] min-h-[480px]">
          {/* Sidebar — more sections (app-store upload, history) arrive here later. */}
          <aside className="hidden w-48 shrink-0 flex-col border-r bg-muted/40 p-3 sm:flex">
            <p className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Preview & Export
            </p>
            <div className="space-y-1">
              <SectionButton
                active={section === "preview"}
                onClick={() => setSection("preview")}
                icon={<GalleryHorizontal className="size-4" />}
                label="Preview"
              />
              <SectionButton
                active={section === "download"}
                onClick={() => setSection("download")}
                icon={<FolderArchive className="size-4" />}
                label="Download"
              />
            </div>

            <p className="mt-auto px-3 pb-1 text-[11px] leading-relaxed text-muted-foreground">
              Everything renders in your browser — nothing is uploaded.
            </p>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {section === "preview" ? (
              <>
                <header className="space-y-1 border-b px-6 pb-4 pt-6">
                  <DialogTitle>Preview screenshots</DialogTitle>
                  <DialogDescription>
                    Every screen exactly as it will export — rendered from the
                    real canvas, not the strip thumbnails.
                  </DialogDescription>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {screens.map((screen, index) => (
                      <figure key={screen.id} className="group space-y-2">
                        <div className="relative overflow-hidden rounded-xl border bg-muted/40 shadow-sm transition-shadow group-hover:shadow-md">
                          {previews[screen.id] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={previews[screen.id]}
                              alt={`Preview of ${screenLabel(screen, index)}`}
                              className="w-full"
                              style={{
                                aspectRatio: `${artboard.width} / ${artboard.height}`,
                              }}
                            />
                          ) : (
                            <div
                              className="grid w-full place-items-center text-muted-foreground"
                              style={{
                                aspectRatio: `${artboard.width} / ${artboard.height}`,
                              }}
                            >
                              <Loader2 className="size-4 animate-spin" />
                            </div>
                          )}
                          <span className="absolute left-2 top-2 grid size-5 place-items-center rounded-full bg-background/90 text-[10px] font-semibold tabular-nums shadow-sm">
                            {index + 1}
                          </span>
                        </div>
                        <figcaption className="truncate text-center text-[11px] text-muted-foreground">
                          {screenLabel(screen, index)}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>

                <footer className="flex items-center justify-between border-t px-6 py-4">
                  <p className="text-xs text-muted-foreground">
                    {screens.length} {screens.length === 1 ? "screen" : "screens"} ·{" "}
                    {artboard.width} × {artboard.height} px
                  </p>
                  <Button onClick={() => setSection("download")}>
                    Continue to download
                  </Button>
                </footer>
              </>
            ) : (
              <>
                <header className="space-y-1 border-b px-6 pb-4 pt-6">
                  <DialogTitle>Download screenshot files</DialogTitle>
                  <DialogDescription>
                    Pick the screens and settings, then save them — one image, or
                    the whole set as a ZIP.
                  </DialogDescription>
                </header>

                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                  <section className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <Label className="text-xs font-medium">Screens</Label>
                      <button
                        type="button"
                        className="text-[11px] font-medium text-primary hover:underline"
                        onClick={() =>
                          setSelected(
                            selected.length === screens.length
                              ? []
                              : screens.map((screen) => screen.id),
                          )
                        }
                      >
                        {selected.length === screens.length
                          ? "Deselect all"
                          : "Select all"}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {screens.map((screen, index) => {
                        const checked = selected.includes(screen.id);
                        return (
                          <button
                            key={screen.id}
                            type="button"
                            onClick={() => toggleScreen(screen.id)}
                            className={cn(
                              "flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-colors",
                              checked
                                ? "border-primary/50 bg-primary/5"
                                : "hover:bg-muted/60",
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-4.5 shrink-0 place-items-center rounded border transition-colors",
                                checked
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "bg-background",
                              )}
                            >
                              {checked && <Check className="size-3" />}
                            </span>
                            <span className="truncate text-xs font-medium">
                              {screenLabel(screen, index)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <section className="space-y-2">
                      <Label className="text-xs font-medium">Format</Label>
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
                            // Hiding rather than silently emitting PNG bytes
                            // under a .webp name, which is what the browser does
                            // when it cannot encode.
                            disabled={option.id === "webp" && !webpAvailable}
                          >
                            {option.label}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </section>

                    <section className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <Label className="text-xs font-medium">Scale</Label>
                        <span className="text-[11px] text-muted-foreground">
                          {dims.width} × {dims.height} px
                        </span>
                      </div>
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
                    </section>
                  </div>

                  {SUPPORTS_QUALITY[format] && (
                    <section className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <Label className="text-xs font-medium">Quality</Label>
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {Math.round(quality * 100)}%
                        </span>
                      </div>
                      <Slider
                        min={0.4}
                        max={1}
                        step={0.01}
                        value={[quality]}
                        onValueChange={([q]) => setQuality(q)}
                      />
                    </section>
                  )}

                  <section className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-medium">
                        Transparent background
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        {SUPPORTS_ALPHA[format]
                          ? "Exports without the backdrop, for compositing elsewhere."
                          : "JPG cannot store transparency — a solid background is used."}
                      </p>
                    </div>
                    <Switch
                      checked={transparent && SUPPORTS_ALPHA[format]}
                      disabled={!SUPPORTS_ALPHA[format]}
                      onCheckedChange={setTransparent}
                    />
                  </section>
                </div>

                <footer className="flex items-center justify-between gap-3 border-t px-6 py-4">
                  <p className="text-xs text-muted-foreground">
                    {selected.length} of {screens.length}{" "}
                    {screens.length === 1 ? "screen" : "screens"} · {formatLabel} ·{" "}
                    {scale}×
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={closeExport}
                      disabled={isExporting}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDownload}
                      disabled={
                        isExporting || !dims.withinLimits || selected.length === 0
                      }
                    >
                      {isExporting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      {progress
                        ? `Exporting ${progress.done}/${progress.total}…`
                        : selected.length > 1
                          ? `Download ZIP (${selected.length})`
                          : "Download"}
                    </Button>
                  </div>
                </footer>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active
          ? "border bg-background font-medium text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      <span className={cn(active && "text-primary")}>{icon}</span>
      {label}
    </button>
  );
}
