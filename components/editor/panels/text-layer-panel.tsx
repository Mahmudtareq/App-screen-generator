"use client";

import { useId } from "react";

import { ColorPicker } from "@/components/common/color-picker";
import { NumberInput } from "@/components/common/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  CANVAS_FONTS,
  getCanvasFont,
  resolveFontFamily,
  type CanvasFontId,
} from "@/config/fonts";
import { useEditorStore } from "@/lib/editor/store";
import type { TextLayer } from "@/schemas/editor";

import { Field } from "./panel-section";
import { RichTextEditor } from "./rich-text-editor";

/** Controls for one text layer, shown when its row is expanded. */
export function TextLayerPanel({
  screenId,
  layer,
}: {
  screenId: string;
  layer: TextLayer;
}) {
  const updateLayer = useEditorStore((s) => s.updateLayer);

  const patch = (next: Partial<TextLayer>) =>
    updateLayer<TextLayer>(screenId, layer.id, next);

  const font = getCanvasFont(layer.fontId);

  return (
    <div className="space-y-3">
      <RichTextEditor
        runs={layer.runs}
        onChange={(runs) => patch({ runs })}
        fontFamily={resolveFontFamily(layer.fontId)}
        fontWeight={layer.fontWeight}
        italic={layer.italic}
        color={layer.color}
        onColorChange={(color) => patch({ color })}
        uppercase={layer.uppercase}
        onUppercaseChange={(uppercase) => patch({ uppercase })}
        align={layer.align}
        onAlignChange={(align) => patch({ align })}
        placeholder={layer.role === "title" ? "Headline" : "Supporting copy"}
      />

      {/* Weight is three digits wide at most, so it gets a fixed column and the
          family keeps the rest — "Playfair Display" needs the room. */}
      <div className="grid grid-cols-[1fr_5.5rem] gap-2">
        <Field label="Font">
          <Select
            value={layer.fontId}
            onValueChange={(v) => patch({ fontId: v as CanvasFontId })}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CANVAS_FONTS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <span style={{ fontFamily: option.family }}>{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Weight">
          <Select
            value={String(layer.fontWeight)}
            onValueChange={(v) => patch({ fontWeight: Number(v) })}
          >
            <SelectTrigger className="h-8 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {font.weights.map((weight) => (
                <SelectItem key={weight} value={String(weight)}>
                  {weight}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/*
        Typed rather than dragged. All three are values people arrive with a number
        for — a 59px title, a 0.85 line height — and a slider makes hitting one an
        exercise in aim. Sliders stay below for opacity and rotation, which are the
        opposite case: nobody knows they want 43%, they want *less*.
      */}
      <div className="grid grid-cols-3 gap-2">
        <Field label="Size">
          <NumberInput
            label="Font size"
            value={layer.fontSize}
            onChange={(fontSize) => patch({ fontSize })}
            min={8}
            max={400}
            suffix="px"
          />
        </Field>

        <Field label="Line height">
          <NumberInput
            label="Line height"
            value={layer.lineHeight}
            onChange={(lineHeight) => patch({ lineHeight })}
            min={0.8}
            max={2.5}
            step={0.05}
            decimals={2}
          />
        </Field>

        <Field label="Spacing">
          <NumberInput
            label="Letter spacing"
            value={layer.letterSpacing}
            onChange={(letterSpacing) => patch({ letterSpacing })}
            min={-20}
            max={60}
            suffix="px"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Opacity" hint={`${Math.round(layer.opacity * 100)}%`}>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[layer.opacity]}
            onValueChange={([opacity]) => patch({ opacity })}
          />
        </Field>

        <Field label="Rotation" hint={`${Math.round(layer.rotation)}°`}>
          <Slider
            min={-180}
            max={180}
            step={1}
            value={[layer.rotation]}
            onValueChange={([rotation]) => patch({ rotation })}
          />
        </Field>
      </div>

      {/*
        The two switches pair on one line because they are the same kind of decision —
        is this effect on — and reading them as a pair is the point. Their controls
        stay full width below rather than inside half-width cards: a colour picker and
        four sliders in a 120px column is not a saving.
      */}
      <div className="flex gap-2">
        <EffectToggle
          label="Shadow"
          checked={Boolean(layer.shadow)}
          onCheckedChange={(on) =>
            patch({
              shadow: on
                ? { color: "#000000", blur: 12, offsetX: 0, offsetY: 4, opacity: 0.35 }
                : null,
            })
          }
        />

        <EffectToggle
          label="Background pill"
          checked={Boolean(layer.background)}
          onCheckedChange={(on) =>
            patch({
              background: on
                ? {
                    color: "#ffffff",
                    opacity: 1,
                    paddingX: 28,
                    paddingY: 14,
                    cornerRadius: 999,
                  }
                : null,
            })
          }
        />
      </div>

      <ShadowControls layer={layer} patch={patch} />
      <PillControls layer={layer} patch={patch} />
    </div>
  );
}

/**
 * A switch with its whole card as the hit target.
 *
 * The association is explicit rather than left to the label's first labelable
 * descendant, which is what a bare wrapper would rely on: that rule silently picks a
 * different control the moment anything else clickable joins the card, and the
 * failure is a padding area that quietly stops working.
 */
function EffectToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="flex flex-1 cursor-pointer items-center justify-between gap-2 rounded-md border p-3"
    >
      <span className="text-xs font-medium">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}

function ShadowControls({
  layer,
  patch,
}: {
  layer: TextLayer;
  patch: (next: Partial<TextLayer>) => void;
}) {
  const shadow = layer.shadow;
  if (!shadow) return null;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <span className="text-xs font-medium">Shadow</span>

      <ColorPicker
        value={shadow.color}
        onChange={(color) => patch({ shadow: { ...shadow, color } })}
      />

      <Field label="Blur" hint={`${Math.round(shadow.blur)}px`}>
        <Slider
          min={0}
          max={120}
          step={1}
          value={[shadow.blur]}
          onValueChange={([blur]) => patch({ shadow: { ...shadow, blur } })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Offset X" hint={`${Math.round(shadow.offsetX)}`}>
          <Slider
            min={-80}
            max={80}
            step={1}
            value={[shadow.offsetX]}
            onValueChange={([offsetX]) => patch({ shadow: { ...shadow, offsetX } })}
          />
        </Field>
        <Field label="Offset Y" hint={`${Math.round(shadow.offsetY)}`}>
          <Slider
            min={-80}
            max={80}
            step={1}
            value={[shadow.offsetY]}
            onValueChange={([offsetY]) => patch({ shadow: { ...shadow, offsetY } })}
          />
        </Field>
      </div>

      <Field label="Strength" hint={`${Math.round(shadow.opacity * 100)}%`}>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[shadow.opacity]}
          onValueChange={([opacity]) => patch({ shadow: { ...shadow, opacity } })}
        />
      </Field>
    </div>
  );
}

function PillControls({
  layer,
  patch,
}: {
  layer: TextLayer;
  patch: (next: Partial<TextLayer>) => void;
}) {
  const background = layer.background;
  if (!background) return null;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <span className="text-xs font-medium">Background pill</span>

      <ColorPicker
        value={background.color}
        onChange={(color) => patch({ background: { ...background, color } })}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Padding X" hint={`${Math.round(background.paddingX)}`}>
          <Slider
            min={0}
            max={160}
            step={1}
            value={[background.paddingX]}
            onValueChange={([paddingX]) =>
              patch({ background: { ...background, paddingX } })
            }
          />
        </Field>
        <Field label="Padding Y" hint={`${Math.round(background.paddingY)}`}>
          <Slider
            min={0}
            max={160}
            step={1}
            value={[background.paddingY]}
            onValueChange={([paddingY]) =>
              patch({ background: { ...background, paddingY } })
            }
          />
        </Field>
      </div>

      <Field
        label="Corner radius"
        hint={
          background.cornerRadius >= 999
            ? "pill"
            : `${Math.round(background.cornerRadius)}px`
        }
      >
        <Slider
          min={0}
          max={999}
          step={1}
          value={[background.cornerRadius]}
          onValueChange={([cornerRadius]) =>
            patch({ background: { ...background, cornerRadius } })
          }
        />
      </Field>

      <Field label="Opacity" hint={`${Math.round(background.opacity * 100)}%`}>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[background.opacity]}
          onValueChange={([opacity]) =>
            patch({ background: { ...background, opacity } })
          }
        />
      </Field>
    </div>
  );
}
