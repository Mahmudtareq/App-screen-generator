export type ExportFormat = "png" | "jpeg" | "webp";

export const EXPORT_FORMATS: { id: ExportFormat; label: string; extension: string }[] = [
  { id: "png", label: "PNG", extension: "png" },
  { id: "jpeg", label: "JPG", extension: "jpg" },
  { id: "webp", label: "WebP", extension: "webp" },
];

export const MIME: Record<ExportFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const SUPPORTS_ALPHA: Record<ExportFormat, boolean> = {
  png: true,
  jpeg: false,
  webp: true,
};

export const SUPPORTS_QUALITY: Record<ExportFormat, boolean> = {
  png: false,
  jpeg: true,
  webp: true,
};

export type ExportScale = 1 | 2 | 3;

export const EXPORT_SCALES: ExportScale[] = [1, 2, 3];

/**
 * Ceiling on the exported bitmap.
 *
 * Browsers cap canvas dimensions — roughly 16384px per side and ~268MP total on
 * desktop Chrome, but far lower on iOS Safari (~16.7MP). A 1290 × 2796 artboard
 * at 3x is 3870 × 8388 = 32MP and will fail on some iPads. Exceeding the cap does
 * not throw: `toBlob` returns null or a blank image, which is much worse than a
 * disabled button, so the export dialog checks against this first.
 */
export const MAX_EXPORT_PIXELS = 16_000_000;
export const MAX_EXPORT_SIDE = 16_384;

export interface ExportDimensions {
  width: number;
  height: number;
  megapixels: number;
  withinLimits: boolean;
}

export function exportDimensions(
  artboard: { width: number; height: number },
  scale: ExportScale,
): ExportDimensions {
  const width = Math.round(artboard.width * scale);
  const height = Math.round(artboard.height * scale);
  const pixels = width * height;

  return {
    width,
    height,
    megapixels: pixels / 1_000_000,
    withinLimits:
      pixels <= MAX_EXPORT_PIXELS &&
      width <= MAX_EXPORT_SIDE &&
      height <= MAX_EXPORT_SIDE,
  };
}

let webpSupport: boolean | undefined;

/**
 * Feature-detects WebP encoding once.
 *
 * Without this the browser silently falls back to PNG bytes under a `.webp`
 * filename, which looks like it worked until someone inspects the file.
 */
export function supportsWebpExport(): boolean {
  if (webpSupport !== undefined) return webpSupport;
  if (typeof document === "undefined") return false;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return webpSupport;
}
