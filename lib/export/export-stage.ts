import type Konva from "konva";

import { CANVAS_GUTTER_X, CANVAS_GUTTER_Y } from "@/lib/canvas/fit";
import { ensureFontsLoaded } from "@/lib/canvas/fonts";
import { whenAllSettled } from "@/lib/canvas/image-cache";
import {
  BACKGROUND_LAYER_NAME,
  CONTENT_LAYER_NAME,
  OVERLAY_LAYER_NAME,
} from "@/lib/canvas/layer-names";
import {
  MIME,
  SUPPORTS_ALPHA,
  SUPPORTS_QUALITY,
  type ExportFormat,
} from "./formats";

export interface ExportOptions {
  format: ExportFormat;
  /**
   * Output pixels per artboard px. The export dialog offers the integer
   * `ExportScale` steps; fractional values are valid too — the thumbnail
   * pipeline renders at well under 1.
   */
  scale: number;
  /** 0..1. Ignored for PNG. */
  quality: number;
  transparent: boolean;
}

export interface ExportContext {
  /** Current fit-to-container scale of the Stage; needed to work out the pixel ratio. */
  fitScale: number;
  artboard: { width: number; height: number };
  /** URLs of every image the document references, awaited before rasterising. */
  imageUrls: readonly (string | null | undefined)[];
  /** Fill painted under everything for formats that cannot store alpha. */
  opaqueFallback?: string;
}

function findLayer(stage: Konva.Stage, name: string): Konva.Layer | undefined {
  return stage.getLayers().find((layer) => layer.name() === name);
}

/**
 * Rasterises the Stage to a Blob at full artboard resolution.
 *
 * The Stage on screen is `artboard × fitScale` CSS px, so emitting
 * `artboard × scale` real px means asking Konva for a pixel ratio of
 * `scale / fitScale`. Konva re-renders the whole scene into an offscreen canvas
 * at that ratio, which genuinely re-rasterises the vector device frame and the
 * text — it does not upscale the preview.
 */
export async function exportStage(
  stage: Konva.Stage,
  options: ExportOptions,
  context: ExportContext,
): Promise<Blob> {
  const overlay = findLayer(stage, OVERLAY_LAYER_NAME);
  const background = findLayer(stage, BACKGROUND_LAYER_NAME);
  const content = findLayer(stage, CONTENT_LAYER_NAME);

  const keepAlpha = options.transparent && SUPPORTS_ALPHA[options.format];

  let backdrop: Konva.Rect | undefined;

  // On screen the artwork layers are clipped to a rounded artboard rect (the
  // Stage carries a gutter for selection chrome). The crop below covers exactly
  // the artboard, so the clip must come off for the render or the preview's
  // rounded corners would export as transparent pixels.
  const clippedLayers = [background, content].filter(
    (layer): layer is Konva.Layer => Boolean(layer),
  );
  // The getter's type carries an extra `shape` parameter the config type lacks;
  // the runtime value is the same function that was set via the config.
  const savedClips = clippedLayers.map(
    (layer) => layer.clipFunc() as unknown as Konva.LayerConfig["clipFunc"],
  );

  try {
    // Selection handles baked into the export is the single most obvious way for
    // this to look broken.
    overlay?.visible(false);
    if (keepAlpha) background?.visible(false);
    clippedLayers.forEach((layer) => layer.setAttrs({ clipFunc: undefined }));

    if (!SUPPORTS_ALPHA[options.format] && background) {
      // JPEG cannot store alpha, and an encoder handed a transparent canvas
      // produces black in Chrome and white in Safari. Painting an explicit
      // backdrop makes the result the same everywhere.
      //
      // Konva is imported lazily so this module stays safe to import from a
      // Client Component, which Next still renders on the server.
      const { default: KonvaLib } = await import("konva");
      backdrop = new KonvaLib.Rect({
        x: 0,
        y: 0,
        width: context.artboard.width,
        height: context.artboard.height,
        fill: context.opaqueFallback ?? "#ffffff",
        listening: false,
      });
      background.add(backdrop);
      backdrop.moveToBottom();
    }

    // Fonts are awaited again here, not just at startup: a user who switches font
    // and exports 200ms later would otherwise get the fallback face's metrics.
    await ensureFontsLoaded();
    await whenAllSettled(context.imageUrls);

    const pixelRatio =
      context.fitScale > 0 ? options.scale / context.fitScale : options.scale;

    const blob = await stage.toBlob({
      mimeType: MIME[options.format],
      quality: SUPPORTS_QUALITY[options.format] ? options.quality : undefined,
      pixelRatio,
      // Crop the selection-chrome gutter back out, so the output is exactly the
      // artboard at `artboard × scale` px.
      x: CANVAS_GUTTER_X,
      y: CANVAS_GUTTER_Y,
      width: context.artboard.width * context.fitScale,
      height: context.artboard.height * context.fitScale,
    });

    if (!(blob instanceof Blob)) {
      throw new Error(
        "The browser could not produce an image at this size. Try a smaller export scale.",
      );
    }

    return blob;
  } finally {
    // Restoring in `finally` matters: a throw between here and the toBlob call
    // would otherwise leave the editor showing a hidden background and no
    // selection handles, with no obvious way back.
    backdrop?.destroy();
    overlay?.visible(true);
    background?.visible(true);
    clippedLayers.forEach((layer, i) =>
      layer.setAttrs({ clipFunc: savedClips[i] }),
    );
    stage.batchDraw();
  }
}
