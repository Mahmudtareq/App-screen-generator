"use client";

import { Layer } from "react-konva";
import { useShallow } from "zustand/react/shallow";

import { CONTENT_LAYER_NAME } from "@/lib/canvas/layer-names";
import { selectScreen } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import type { LayerKind } from "@/schemas/editor";

import { DeviceNode } from "../nodes/device-node";
import { ImageNode } from "../nodes/image-node";
import { TextNode } from "../nodes/text-node";

/**
 * A screen's layers, painted in array order — index 0 first, so it ends up at the
 * back.
 *
 * Subscribes to `(id, kind)` pairs only, so restacking or adding a layer
 * re-renders here while editing one does not. The kind has to come along because
 * it decides which component to mount, and reading it inside the node would mean a
 * second subscription per layer.
 */
export function ContentLayer({ screenId }: { screenId: string }) {
  const entries = useEditorStore(
    useShallow((s) => {
      const screen = selectScreen(screenId)(s);
      return (screen?.layers ?? []).map(
        (layer) => `${layer.kind}:${layer.id}` as `${LayerKind}:${string}`,
      );
    }),
  );

  return (
    <Layer name={CONTENT_LAYER_NAME}>
      {entries.map((entry) => {
        const separator = entry.indexOf(":");
        const kind = entry.slice(0, separator) as LayerKind;
        const layerId = entry.slice(separator + 1);

        if (kind === "device") {
          return <DeviceNode key={layerId} screenId={screenId} layerId={layerId} />;
        }
        if (kind === "image") {
          return <ImageNode key={layerId} screenId={screenId} layerId={layerId} />;
        }
        return <TextNode key={layerId} screenId={screenId} layerId={layerId} />;
      })}
    </Layer>
  );
}
