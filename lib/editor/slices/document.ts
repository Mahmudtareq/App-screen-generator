import { getTemplate, MAX_SCREENS } from "@/config/templates";
import { nearestWeight, type CanvasFontId } from "@/config/fonts";
import { getDevice } from "@/lib/devices/catalog";
import { orientSpec } from "@/lib/devices/orientation";
import {
  isDeviceLayer,
  isImageLayer,
  isTextLayer,
  type Artboard,
  type Background,
  type EditorDoc,
  type LayerKind,
  type Screen,
  type ScreenLayer,
} from "@/schemas/editor";

import { replaceDocColor } from "../colors";
import {
  createBlankScreen,
  createDeviceLayer,
  createDocFromTemplate,
  createImageLayer,
  createTextLayer,
  fitDeviceToArtboard,
  newLayerId,
  newScreenId,
} from "../defaults";
import type { DocumentSlice, GetState, SetState } from "../state";
import {
  backgroundAssetKey,
  layerAssetKey,
  type LayerMove,
  type TransformPatch,
} from "../types";

/** Immutably replaces `doc`, leaving untouched sub-objects referentially stable. */
function patchDoc(set: SetState, update: (doc: EditorDoc) => EditorDoc) {
  set((state) => ({ doc: update(state.doc) }));
}

/**
 * Replaces one screen, leaving every other screen referentially identical.
 *
 * That identity is what makes the canvas subscriptions granular: editing screen 3
 * must not re-render the four Konva Stages either side of it, and each card
 * subscribes to its own screen object.
 */
function patchScreen(
  set: SetState,
  screenId: string,
  update: (screen: Screen) => Screen,
) {
  patchDoc(set, (doc) => {
    const index = doc.screens.findIndex((screen) => screen.id === screenId);
    if (index === -1) return doc;

    const next = update(doc.screens[index]);
    if (next === doc.screens[index]) return doc;

    const screens = [...doc.screens];
    screens[index] = next;
    return { ...doc, screens };
  });
}

function patchLayer(
  set: SetState,
  screenId: string,
  layerId: string,
  update: (layer: ScreenLayer) => ScreenLayer,
) {
  patchScreen(set, screenId, (screen) => {
    const index = screen.layers.findIndex((layer) => layer.id === layerId);
    if (index === -1) return screen;

    const next = update(screen.layers[index]);
    if (next === screen.layers[index]) return screen;

    const layers = [...screen.layers];
    layers[index] = next;
    return { ...screen, layers };
  });
}

/**
 * Rescales a layer when the artboard changes size, so a design built for a 6.9"
 * screenshot still reads correctly when retargeted to a Play Store frame instead
 * of collapsing into a corner.
 *
 * Positions scale per axis; anything that means "size" scales uniformly by the
 * smaller ratio. Scaling type or a device non-uniformly would distort it, and a
 * distorted device frame is worse than a slightly small one.
 */
function rescaleLayer(
  layer: ScreenLayer,
  ratio: { x: number; y: number },
): ScreenLayer {
  const uniform = Math.min(ratio.x, ratio.y);

  if (isDeviceLayer(layer)) {
    return {
      ...layer,
      x: layer.x * ratio.x,
      y: layer.y * ratio.y,
      scale: layer.scale * uniform,
    };
  }

  if (isImageLayer(layer)) {
    return {
      ...layer,
      x: layer.x * ratio.x,
      y: layer.y * ratio.y,
      width: layer.width * uniform,
      height: layer.height * uniform,
    };
  }

  return {
    ...layer,
    x: layer.x * ratio.x,
    y: layer.y * ratio.y,
    // The wrapping box tracks the horizontal ratio so side margins stay
    // proportional; the type size tracks the uniform one so it never stretches.
    width: layer.width * ratio.x,
    fontSize: layer.fontSize * uniform,
  };
}

function moveIndex(length: number, from: number, move: LayerMove): number {
  switch (move) {
    case "up":
      return Math.min(length - 1, from + 1);
    case "down":
      return Math.max(0, from - 1);
    case "top":
      return length - 1;
    case "bottom":
      return 0;
  }
}

function reorder<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** A deep copy of a layer under a fresh id, for duplicate. */
function cloneLayer(layer: ScreenLayer): ScreenLayer {
  return { ...structuredClone(layer), id: newLayerId() };
}

export function createDocumentSlice(
  set: SetState,
  get: GetState,
): DocumentSlice {
  /** Layers a fresh screen would get, used by reset. */
  const templateSpec = (doc: EditorDoc) =>
    orientSpec(getDevice(doc.deviceId), doc.orientation);

  return {
    doc: createDocFromTemplate(),

    loadDoc: (doc) => set({ doc, screenId: null, layerId: null }),

    /**
     * Restyles the existing screens rather than replacing them.
     *
     * Screen and layer ids survive, which matters for more than tidiness: assets
     * are keyed by `screenId/layerId`, so rebuilding the screens from scratch
     * would orphan every screenshot the user had already dropped in. Copy is left
     * alone for the same reason — swapping template is a change of look, not a
     * request to throw the words away.
     */
    applyTemplate: (templateId) =>
      patchDoc(set, (doc) => {
        const template = getTemplate(templateId);
        const fontId = template.type.fontId as CanvasFontId;

        return {
          ...doc,
          templateId: template.id as EditorDoc["templateId"],
          screens: doc.screens.map((screen) => {
            if (screen.pinned) return screen;

            return {
              ...screen,
              background: structuredClone(template.background),
              layers: screen.layers.map((layer) => {
                if (isDeviceLayer(layer)) {
                  return { ...layer, colorwayId: template.colorwayId };
                }
                if (isTextLayer(layer)) {
                  const isTitle = layer.role === "title";
                  return {
                    ...layer,
                    fontId,
                    color: isTitle
                      ? template.type.titleColor
                      : template.type.bodyColor,
                    fontWeight: isTitle
                      ? template.type.titleWeight
                      : template.type.bodyWeight,
                  };
                }
                return layer;
              }),
            };
          }),
        };
      }),

    /* ----------------------------- document level ---------------------------- */

    setArtboard: (artboard: Artboard) =>
      patchDoc(set, (doc) => {
        if (
          artboard.width === doc.artboard.width &&
          artboard.height === doc.artboard.height &&
          artboard.preset === doc.artboard.preset
        ) {
          return doc;
        }

        const ratio = {
          x: artboard.width / doc.artboard.width,
          y: artboard.height / doc.artboard.height,
        };

        return {
          ...doc,
          artboard,
          screens: doc.screens.map((screen) =>
            screen.pinned
              ? screen
              : {
                  ...screen,
                  layers: screen.layers.map((layer) => rescaleLayer(layer, ratio)),
                },
          ),
        };
      }),

    /**
     * Changing the model refits every device layer.
     *
     * A new spec has different body dimensions, so the scale that centred the old
     * one leaves the new one either overflowing the artboard or floating in the
     * middle of it. Refitting is the only behaviour that is right in both cases.
     */
    setDeviceId: (deviceId) =>
      patchDoc(set, (doc) => {
        if (deviceId === doc.deviceId) return doc;

        const spec = orientSpec(getDevice(deviceId), doc.orientation);
        const colorwayId = spec.colorways[0].id;

        return {
          ...doc,
          deviceId,
          screens: doc.screens.map((screen) => ({
            ...screen,
            layers: screen.layers.map((layer) =>
              isDeviceLayer(layer)
                ? {
                    ...layer,
                    // The old colourway id almost never exists on the new device.
                    colorwayId:
                      spec.colorways.find((c) => c.id === layer.colorwayId)?.id ??
                      colorwayId,
                    ...fitDeviceToArtboard(spec, doc.artboard),
                  }
                : layer,
            ),
          })),
        };
      }),

    setOrientation: (orientation) =>
      patchDoc(set, (doc) => {
        if (orientation === doc.orientation) return doc;

        const spec = orientSpec(getDevice(doc.deviceId), orientation);

        return {
          ...doc,
          orientation,
          screens: doc.screens.map((screen) => ({
            ...screen,
            layers: screen.layers.map((layer) =>
              isDeviceLayer(layer)
                ? { ...layer, ...fitDeviceToArtboard(spec, doc.artboard) }
                : layer,
            ),
          })),
        };
      }),

    /**
     * The global font for a role — every title, or every subtitle, across the set.
     *
     * Pinned screens are skipped like they are by every other bulk write, and the
     * weight is snapped rather than carried over: the new family may not ship the
     * old weight, and a 800 headline that silently paints at 700 is worse than one
     * whose control admits what it is showing.
     */
    setRoleFont: (role, fontId) =>
      patchDoc(set, (doc) => ({
        ...doc,
        screens: doc.screens.map((screen) => {
          if (screen.pinned) return screen;

          return {
            ...screen,
            layers: screen.layers.map((layer) =>
              isTextLayer(layer) && layer.role === role
                ? {
                    ...layer,
                    fontId,
                    fontWeight: nearestWeight(fontId, layer.fontWeight),
                  }
                : layer,
            ),
          };
        }),
      })),

    /**
     * Swaps a colour for another across the whole set.
     *
     * A find-and-replace rather than a palette the layers point at: the document
     * has no colour indirection, and adding one would mean every existing project
     * migrating into it. Walking the fields is the honest version of the same
     * gesture — and it stays honest, because the panel's "current colours" list is
     * built by the same traversal that does the rewriting.
     */
    replaceColor: (from, to) =>
      patchDoc(set, (doc) => replaceDocColor(doc, from, to)),

    /* -------------------------------- screens ------------------------------- */

    addScreen: (afterScreenId) => {
      const doc = get().doc;
      if (doc.screens.length >= MAX_SCREENS) return null;

      const index = afterScreenId
        ? doc.screens.findIndex((screen) => screen.id === afterScreenId)
        : doc.screens.length - 1;

      const screen = createBlankScreen(
        doc,
        index >= 0 ? doc.screens[index] : undefined,
      );

      patchDoc(set, (current) => {
        const at = index >= 0 ? index + 1 : current.screens.length;
        const screens = [...current.screens];
        screens.splice(at, 0, screen);
        return { ...current, screens };
      });

      return screen.id;
    },

    /**
     * A copy sitting immediately after the original.
     *
     * Layer ids are regenerated, which means the copy's images start empty rather
     * than sharing the original's asset entries — two layers pointing at one
     * object URL would have the first delete revoke the second's bitmap. The saved
     * https URLs are copied, so a duplicated *saved* screen keeps its artwork.
     */
    duplicateScreen: (screenId) => {
      const doc = get().doc;
      if (doc.screens.length >= MAX_SCREENS) return null;

      const index = doc.screens.findIndex((screen) => screen.id === screenId);
      if (index === -1) return null;

      const source = doc.screens[index];
      const copy: Screen = {
        ...structuredClone(source),
        id: newScreenId(),
        name: source.name ? `${source.name} copy` : "",
        pinned: false,
        layers: source.layers.map(cloneLayer),
      };

      patchDoc(set, (current) => {
        const screens = [...current.screens];
        screens.splice(index + 1, 0, copy);
        return { ...current, screens };
      });

      return copy.id;
    },

    removeScreen: (screenId) => {
      const { doc, screenId: selectedScreenId } = get();
      // A project with no screens has nothing to render and no way back, so the
      // last one is deliberately undeletable.
      if (doc.screens.length <= 1) return;

      get().clearScreenAssets(screenId);

      patchDoc(set, (current) => ({
        ...current,
        screens: current.screens.filter((screen) => screen.id !== screenId),
      }));

      if (selectedScreenId === screenId) {
        set({ screenId: null, layerId: null });
      }
    },

    moveScreen: (screenId, direction) =>
      patchDoc(set, (doc) => {
        const from = doc.screens.findIndex((screen) => screen.id === screenId);
        if (from === -1) return doc;

        const to = direction === "left" ? from - 1 : from + 1;
        if (to < 0 || to >= doc.screens.length) return doc;

        return { ...doc, screens: reorder(doc.screens, from, to) };
      }),

    renameScreen: (screenId, name) =>
      patchScreen(set, screenId, (screen) => ({ ...screen, name })),

    setScreenPinned: (screenId, pinned) =>
      patchScreen(set, screenId, (screen) => ({ ...screen, pinned })),

    /**
     * Puts the layout back to the template's defaults without discarding content.
     *
     * Copy, colours and uploaded images survive; only geometry is recomputed. This
     * is the escape hatch for a screen that has been dragged into an unrecoverable
     * mess, and losing the words in the process would make it useless.
     */
    resetScreen: (screenId) => {
      const doc = get().doc;
      const spec = templateSpec(doc);

      patchScreen(set, screenId, (screen) => ({
        ...screen,
        layers: screen.layers.map((layer) => {
          if (isDeviceLayer(layer)) {
            return { ...layer, ...fitDeviceToArtboard(spec, doc.artboard) };
          }
          if (isTextLayer(layer)) {
            const fresh = createTextLayer(layer.role, doc.artboard);
            return {
              ...layer,
              x: fresh.x,
              y: fresh.y,
              width: fresh.width,
              fontSize: fresh.fontSize,
              rotation: 0,
            };
          }
          const fresh = createImageLayer(doc.artboard, {
            width: layer.width,
            height: layer.height,
          });
          return { ...layer, x: fresh.x, y: fresh.y, rotation: 0 };
        }),
      }));
    },

    setScreenBackground: (screenId, background: Background) =>
      patchScreen(set, screenId, (screen) => ({ ...screen, background })),

    applyBackgroundToAll: (screenId) =>
      patchDoc(set, (doc) => {
        const source = doc.screens.find((screen) => screen.id === screenId);
        if (!source) return doc;

        return {
          ...doc,
          screens: doc.screens.map((screen) =>
            screen.id === screenId || screen.pinned
              ? screen
              : { ...screen, background: structuredClone(source.background) },
          ),
        };
      }),

    /* --------------------------------- layers ------------------------------- */

    addLayer: (screenId, kind: LayerKind) => {
      const doc = get().doc;
      const screen = doc.screens.find((s) => s.id === screenId);
      if (!screen) return null;

      let layer: ScreenLayer;

      if (kind === "device") {
        layer = createDeviceLayer(
          templateSpec(doc),
          doc.artboard,
          getTemplate(doc.templateId).colorwayId,
        );
      } else if (kind === "image") {
        layer = createImageLayer(doc.artboard);
      } else {
        // Whichever role is missing is almost certainly the one wanted; a screen
        // with a headline needs a subtitle next, not a second headline.
        const hasTitle = screen.layers.some(
          (l) => isTextLayer(l) && l.role === "title",
        );
        layer = createTextLayer(hasTitle ? "body" : "title", doc.artboard);
      }

      patchScreen(set, screenId, (current) => ({
        ...current,
        // Pushed onto the end, which is the top of the stack — a layer the user
        // just added should be visible, not buried behind the device.
        layers: [...current.layers, layer],
      }));

      return layer.id;
    },

    updateLayer: (screenId, layerId, patch) =>
      patchLayer(set, screenId, layerId, (layer) =>
        ({ ...layer, ...patch }) as ScreenLayer,
      ),

    removeLayer: (screenId, layerId) => {
      const { doc, layerId: selectedLayerId } = get();
      const screen = doc.screens.find((s) => s.id === screenId);
      const layer = screen?.layers.find((l) => l.id === layerId);
      if (!layer) return;

      // The device is the subject of the mockup — there is nothing left to show
      // without it, so deleting it is deliberately refused rather than allowed
      // and then worked around with an empty state.
      if (isDeviceLayer(layer)) return;

      get().clearAsset(layerAssetKey(screenId, layerId));

      patchScreen(set, screenId, (current) => ({
        ...current,
        layers: current.layers.filter((l) => l.id !== layerId),
      }));

      if (selectedLayerId === layerId) set({ layerId: null });
    },

    duplicateLayer: (screenId, layerId) => {
      const doc = get().doc;
      const screen = doc.screens.find((s) => s.id === screenId);
      const index = screen?.layers.findIndex((l) => l.id === layerId) ?? -1;
      if (!screen || index === -1) return null;

      const copy = cloneLayer(screen.layers[index]);

      patchScreen(set, screenId, (current) => {
        const layers = [...current.layers];
        layers.splice(index + 1, 0, copy);
        return { ...current, layers };
      });

      return copy.id;
    },

    moveLayer: (screenId, layerId, move) =>
      patchScreen(set, screenId, (screen) => {
        const from = screen.layers.findIndex((layer) => layer.id === layerId);
        if (from === -1) return screen;

        const to = moveIndex(screen.layers.length, from, move);
        if (to === from) return screen;

        return { ...screen, layers: reorder(screen.layers, from, to) };
      }),

    commitTransform: (screenId, layerId, patch: TransformPatch) =>
      patchLayer(set, screenId, layerId, (layer) => {
        if (isDeviceLayer(layer)) {
          return {
            ...layer,
            x: patch.x,
            y: patch.y,
            rotation: patch.rotation,
            scale: patch.scale ?? layer.scale,
          };
        }

        if (isImageLayer(layer)) {
          return {
            ...layer,
            x: patch.x,
            y: patch.y,
            rotation: patch.rotation,
            width: patch.width ?? layer.width,
            height: patch.height ?? layer.height,
          };
        }

        return {
          ...layer,
          x: patch.x,
          y: patch.y,
          rotation: patch.rotation,
          width: patch.width ?? layer.width,
          fontSize: patch.fontSize ?? layer.fontSize,
        };
      }),

    centerLayer: (screenId, layerId) => {
      const doc = get().doc;
      const spec = templateSpec(doc);

      patchLayer(set, screenId, layerId, (layer) => {
        const width = isDeviceLayer(layer)
          ? spec.body.width * layer.scale
          : layer.width;

        return { ...layer, x: (doc.artboard.width - width) / 2 };
      });
    },
  };
}

/** Asset keys a screen owns, for releasing object URLs when it is deleted. */
export function screenAssetKeys(screen: Screen): string[] {
  return [
    backgroundAssetKey(screen.id),
    ...screen.layers.map((layer) => layerAssetKey(screen.id, layer.id)),
  ];
}
