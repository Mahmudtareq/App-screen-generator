"use client";

import { Layer } from "react-konva";
import { useShallow } from "zustand/react/shallow";

import { CONTENT_LAYER_NAME } from "@/lib/canvas/layer-names";
import { useEditorStore } from "@/lib/editor/store";

import { DeviceNode } from "../nodes/device-node";
import { LogoNode } from "../nodes/logo-node";
import { TextNode } from "../nodes/text-node";

/**
 * Z-order is fixed — background, device, logo, then text — which matches what the
 * product actually needs and keeps the document a set of named slots rather than
 * a general node graph with an ordering array.
 *
 * This component subscribes only to the list of text layer ids, so adding or
 * removing a caption re-renders here while editing one does not.
 */
export function ContentLayer() {
  const textLayerIds = useEditorStore(
    useShallow((s) => s.doc.textLayers.map((layer) => layer.id)),
  );

  return (
    <Layer name={CONTENT_LAYER_NAME}>
      <DeviceNode />
      <LogoNode />
      {textLayerIds.map((id) => (
        <TextNode key={id} id={id} />
      ))}
    </Layer>
  );
}
