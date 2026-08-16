import { getDevice, getColorway, type DeviceId } from "@/lib/devices/catalog";
import { orientSpec } from "@/lib/devices/orientation";
import type { Orientation } from "@/lib/devices/types";
import type {
  Artboard,
  Background,
  EditorDoc,
  LogoLayer,
  ScreenshotState,
  TextLayer,
} from "@/schemas/editor";

import { createEmptyDoc, createTextLayer, fitDeviceToArtboard } from "../defaults";
import type { DocumentSlice, GetState, SetState } from "../state";
import {
  DEVICE_NODE_ID,
  LOGO_NODE_ID,
  textIdFromNodeId,
  type TransformPatch,
} from "../types";

/** Immutably replaces `doc`, leaving untouched sub-objects referentially stable. */
function patchDoc(set: SetState, update: (doc: EditorDoc) => EditorDoc) {
  set((state) => ({ doc: update(state.doc) }));
}

/**
 * Rescales layer positions when the artboard changes size, so a design built for
 * a 6.9" screenshot still reads correctly when retargeted to a Play Store frame
 * instead of collapsing into a corner.
 */
function rescaleLayers(doc: EditorDoc, next: Artboard): EditorDoc {
  const sx = next.width / doc.artboard.width;
  const sy = next.height / doc.artboard.height;

  const spec = orientSpec(getDevice(doc.deviceId as DeviceId), doc.orientation);

  return {
    ...doc,
    artboard: next,
    device: { ...doc.device, ...fitDeviceToArtboard(spec, next) },
    logo: doc.logo
      ? {
          ...doc.logo,
          x: doc.logo.x * sx,
          y: doc.logo.y * sy,
          width: doc.logo.width * sx,
          height: doc.logo.height * sx,
        }
      : null,
    textLayers: doc.textLayers.map((layer) => ({
      ...layer,
      x: layer.x * sx,
      y: layer.y * sy,
      width: layer.width * sx,
      fontSize: layer.fontSize * sx,
    })),
  };
}

export function createDocumentSlice(set: SetState, get: GetState): DocumentSlice {
  return {
    doc: createEmptyDoc(),

    loadDoc: (doc) => set({ doc, selectedId: null }),

    resetDoc: () => set({ doc: createEmptyDoc(), selectedId: null }),

    setArtboard: (artboard) => patchDoc(set, (doc) => rescaleLayers(doc, artboard)),

    setBackground: (background: Background) =>
      patchDoc(set, (doc) => ({ ...doc, background })),

    setDevice: (deviceId) =>
      patchDoc(set, (doc) => {
        const spec = orientSpec(getDevice(deviceId), doc.orientation);
        // Colourways are per-device, so carry the old one over only if this
        // device offers it; otherwise fall back to its first.
        const colorway = getColorway(spec, doc.colorwayId);
        return {
          ...doc,
          deviceId,
          colorwayId: colorway.id,
          device: { ...doc.device, ...fitDeviceToArtboard(spec, doc.artboard) },
        };
      }),

    setColorway: (colorwayId) => patchDoc(set, (doc) => ({ ...doc, colorwayId })),

    setOrientation: (orientation: Orientation) =>
      patchDoc(set, (doc) => {
        const spec = orientSpec(getDevice(doc.deviceId as DeviceId), orientation);
        return {
          ...doc,
          orientation,
          device: { ...doc.device, ...fitDeviceToArtboard(spec, doc.artboard) },
        };
      }),

    setDeviceTransform: (patch) =>
      patchDoc(set, (doc) => ({ ...doc, device: { ...doc.device, ...patch } })),

    setScreenshot: (patch: Partial<ScreenshotState>) =>
      patchDoc(set, (doc) => ({ ...doc, screenshot: { ...doc.screenshot, ...patch } })),

    clearScreenshot: () =>
      patchDoc(set, (doc) => ({
        ...doc,
        screenshot: { assetId: null, url: null, zoom: 1, pan: { x: 0, y: 0 } },
      })),

    setLogo: (logo: LogoLayer | null) => patchDoc(set, (doc) => ({ ...doc, logo })),

    updateLogo: (patch: Partial<LogoLayer>) =>
      patchDoc(set, (doc) =>
        doc.logo ? { ...doc, logo: { ...doc.logo, ...patch } } : doc,
      ),

    addTextLayer: (role) => {
      const layer = createTextLayer(role, get().doc.artboard);
      patchDoc(set, (doc) => ({ ...doc, textLayers: [...doc.textLayers, layer] }));
      return layer.id;
    },

    updateTextLayer: (id, patch: Partial<TextLayer>) =>
      patchDoc(set, (doc) => ({
        ...doc,
        // Map rather than clone-all: untouched layers keep their identity, so a
        // text node's store subscription does not fire when a sibling moves.
        textLayers: doc.textLayers.map((layer) =>
          layer.id === id ? { ...layer, ...patch } : layer,
        ),
      })),

    removeTextLayer: (id) =>
      patchDoc(set, (doc) => ({
        ...doc,
        textLayers: doc.textLayers.filter((layer) => layer.id !== id),
      })),

    commitTransform: (nodeId, patch: TransformPatch) => {
      if (nodeId === DEVICE_NODE_ID) {
        get().setDeviceTransform({
          x: patch.x,
          y: patch.y,
          rotation: patch.rotation,
          ...(patch.scale !== undefined ? { scale: patch.scale } : {}),
        });
        return;
      }

      if (nodeId === LOGO_NODE_ID) {
        get().updateLogo({
          x: patch.x,
          y: patch.y,
          rotation: patch.rotation,
          ...(patch.width !== undefined ? { width: patch.width } : {}),
          ...(patch.height !== undefined ? { height: patch.height } : {}),
        });
        return;
      }

      const textId = textIdFromNodeId(nodeId);
      if (textId) {
        get().updateTextLayer(textId, {
          x: patch.x,
          y: patch.y,
          rotation: patch.rotation,
          ...(patch.width !== undefined ? { width: patch.width } : {}),
          ...(patch.fontSize !== undefined ? { fontSize: patch.fontSize } : {}),
        });
      }
    },
  };
}
