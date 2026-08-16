"use client";

import { Layer } from "react-konva";

import { OVERLAY_LAYER_NAME } from "@/lib/canvas/layer-names";

import { SelectionTransformer } from "../controls/selection-transformer";

/**
 * Editing chrome — selection handles and, later, snap guides.
 *
 * Kept on its own layer so the export pipeline can hide it wholesale. A stray
 * Transformer baked into an exported PNG is the most obvious way for this app to
 * look broken.
 */
export function OverlayLayer({ fitScale }: { fitScale: number }) {
  return (
    <Layer name={OVERLAY_LAYER_NAME}>
      <SelectionTransformer fitScale={fitScale} />
    </Layer>
  );
}
