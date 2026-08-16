"use client";

import { useCallback } from "react";

import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useEditorStore } from "@/lib/editor/store";
import type { EditorAsset } from "@/lib/editor/types";

import { ImageDropzone } from "../upload/image-dropzone";
import { Field, PanelSection } from "./panel-section";

/** Fraction of the artboard width a freshly-dropped logo occupies. */
const DEFAULT_LOGO_WIDTH_RATIO = 0.16;
/** Breathing room between the logo and whatever sits below it. */
const LOGO_GAP_RATIO = 0.02;

export function LogoPanel() {
  const logo = useEditorStore((s) => s.doc.logo);
  const artboard = useEditorStore((s) => s.doc.artboard);
  const textLayers = useEditorStore((s) => s.doc.textLayers);
  const setLogo = useEditorStore((s) => s.setLogo);
  const updateLogo = useEditorStore((s) => s.updateLogo);
  const clearAsset = useEditorStore((s) => s.clearAsset);

  /**
   * Placing a new logo needs the asset's real aspect ratio, which is only known
   * once the file has been decoded — hence doing this on accept rather than
   * seeding a placeholder when the panel mounts.
   */
  const handleAccepted = useCallback(
    (asset: EditorAsset) => {
      const width = artboard.width * DEFAULT_LOGO_WIDTH_RATIO;
      const height = asset.width > 0 ? width * (asset.height / asset.width) : width;

      // Sit above the topmost caption rather than at a fixed offset — a fixed one
      // lands directly on the headline, since that is also near the top.
      const gap = artboard.height * LOGO_GAP_RATIO;
      const topText = textLayers.reduce<number | null>(
        (min, layer) => (min === null || layer.y < min ? layer.y : min),
        null,
      );
      const y = topText === null ? gap : Math.max(gap, topText - height - gap);

      setLogo({
        assetId: null,
        // Stays empty until the upload runs on save; the canvas renders from the
        // local object URL in the meantime.
        url: "",
        x: (artboard.width - width) / 2,
        y,
        width,
        height,
        rotation: 0,
        opacity: 1,
        cornerRadius: 0,
        visible: true,
      });
    },
    [artboard.width, artboard.height, textLayers, setLogo],
  );

  return (
    <PanelSection title="Logo">
      <ImageDropzone
        slot="logo"
        label={logo ? "Replace logo" : "Add a logo"}
        hint="Transparent PNG or SVG works best"
        onAccepted={handleAccepted}
      />

      {logo && (
        <>
          <Field label="Size" hint={`${Math.round(logo.width)}px`}>
            <Slider
              min={artboard.width * 0.04}
              max={artboard.width * 0.9}
              step={1}
              value={[logo.width]}
              onValueChange={([width]) =>
                // Height follows width so a logo can never be stretched from
                // this panel; free resizing stays available on the canvas.
                updateLogo({
                  width,
                  height: width * (logo.height / logo.width),
                })
              }
            />
          </Field>

          <Field label="Opacity" hint={`${Math.round(logo.opacity * 100)}%`}>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[logo.opacity]}
              onValueChange={([opacity]) => updateLogo({ opacity })}
            />
          </Field>

          <Field label="Rotation" hint={`${Math.round(logo.rotation)}°`}>
            <Slider
              min={-180}
              max={180}
              step={1}
              value={[logo.rotation]}
              onValueChange={([rotation]) => updateLogo({ rotation })}
            />
          </Field>

          <Field label="Corner radius" hint={`${Math.round(logo.cornerRadius)}px`}>
            <Slider
              min={0}
              max={Math.max(8, Math.min(logo.width, logo.height) / 2)}
              step={1}
              value={[logo.cornerRadius]}
              onValueChange={([cornerRadius]) => updateLogo({ cornerRadius })}
            />
          </Field>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Visible</span>
            <Switch
              checked={logo.visible}
              onCheckedChange={(visible) => updateLogo({ visible })}
            />
          </div>

          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              clearAsset("logo");
              setLogo(null);
            }}
          >
            Remove logo
          </button>
        </>
      )}
    </PanelSection>
  );
}
