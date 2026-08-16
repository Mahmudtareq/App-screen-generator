"use client";

import { CaseUpper, Italic, Plus, Trash2, Underline } from "lucide-react";

import { ColorPicker } from "@/components/common/color-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CANVAS_FONTS, getCanvasFont, type CanvasFontId } from "@/config/fonts";
import { useEditorStore } from "@/lib/editor/store";
import { textNodeId } from "@/lib/editor/types";
import { cn } from "@/lib/utils";
import type { TextLayer } from "@/schemas/editor";

import { Field, PanelSection } from "./panel-section";

export function TextPanel() {
  const layers = useEditorStore((s) => s.doc.textLayers);
  const selectedId = useEditorStore((s) => s.selectedId);
  const addTextLayer = useEditorStore((s) => s.addTextLayer);
  const select = useEditorStore((s) => s.select);

  return (
    <PanelSection title="Text">
      <div className="space-y-3">
        {layers.map((layer) => (
          <TextLayerEditor
            key={layer.id}
            layer={layer}
            expanded={selectedId === textNodeId(layer.id)}
            onFocus={() => select(textNodeId(layer.id))}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => select(textNodeId(addTextLayer("title")))}
        >
          <Plus className="size-3" /> Heading
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => select(textNodeId(addTextLayer("body")))}
        >
          <Plus className="size-3" /> Body
        </Button>
      </div>
    </PanelSection>
  );
}

function TextLayerEditor({
  layer,
  expanded,
  onFocus,
}: {
  layer: TextLayer;
  expanded: boolean;
  onFocus: () => void;
}) {
  const updateTextLayer = useEditorStore((s) => s.updateTextLayer);
  const removeTextLayer = useEditorStore((s) => s.removeTextLayer);

  const patch = (next: Partial<TextLayer>) => updateTextLayer(layer.id, next);
  const font = getCanvasFont(layer.fontId);

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        expanded ? "border-primary/60 bg-accent/30" : "bg-card",
      )}
    >
      <div className="flex items-start gap-2">
        <textarea
          value={layer.text}
          onFocus={onFocus}
          onChange={(e) => patch({ text: e.target.value })}
          rows={2}
          placeholder={layer.role === "title" ? "Headline" : "Supporting copy"}
          className="min-h-10 flex-1 resize-y rounded-md border bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground"
          onClick={() => removeTextLayer(layer.id)}
          aria-label="Delete text layer"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
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
                    <span style={{ fontFamily: option.family }}>
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
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

            <Field label="Align">
              <ToggleGroup
                type="single"
                value={layer.align}
                onValueChange={(v) =>
                  v && patch({ align: v as TextLayer["align"] })
                }
                variant="outline"
                size="sm"
                className="w-full"
              >
                <ToggleGroupItem
                  value="left"
                  aria-label="Align left"
                  className="flex-1 text-xs"
                >
                  L
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="center"
                  aria-label="Align centre"
                  className="flex-1 text-xs"
                >
                  C
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="right"
                  aria-label="Align right"
                  className="flex-1 text-xs"
                >
                  R
                </ToggleGroupItem>
              </ToggleGroup>
            </Field>
          </div>

          <Field label="Size" hint={`${Math.round(layer.fontSize)}px`}>
            <Slider
              min={8}
              max={400}
              step={1}
              value={[layer.fontSize]}
              onValueChange={([fontSize]) => patch({ fontSize })}
            />
          </Field>

          <Field label="Line height" hint={layer.lineHeight.toFixed(2)}>
            <Slider
              min={0.8}
              max={2.5}
              step={0.01}
              value={[layer.lineHeight]}
              onValueChange={([lineHeight]) => patch({ lineHeight })}
            />
          </Field>

          <Field
            label="Letter spacing"
            hint={`${layer.letterSpacing.toFixed(0)}px`}
          >
            <Slider
              min={-20}
              max={60}
              step={1}
              value={[layer.letterSpacing]}
              onValueChange={([letterSpacing]) => patch({ letterSpacing })}
            />
          </Field>

          <Field label="Colour">
            <ColorPicker
              value={layer.color}
              onChange={(color) => patch({ color })}
            />
          </Field>

          <Field label="Style">
            <ToggleGroup
              type="multiple"
              variant="outline"
              size="sm"
              className="w-full"
              value={[
                layer.italic ? "italic" : "",
                layer.underline ? "underline" : "",
                layer.uppercase ? "uppercase" : "",
              ].filter(Boolean)}
              onValueChange={(values) =>
                patch({
                  italic: values.includes("italic"),
                  underline: values.includes("underline"),
                  uppercase: values.includes("uppercase"),
                })
              }
            >
              {/* Icon-only, so each needs an accessible name of its own. */}
              <ToggleGroupItem
                value="italic"
                aria-label="Italic"
                className="flex-1"
              >
                <Italic className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="underline"
                aria-label="Underline"
                className="flex-1"
              >
                <Underline className="size-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="uppercase"
                aria-label="Uppercase"
                className="flex-1"
              >
                <CaseUpper className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </Field>

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

          <ShadowControls layer={layer} patch={patch} />
          <PillControls layer={layer} patch={patch} />
        </div>
      )}
    </div>
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

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Shadow</span>
        <Switch
          checked={Boolean(shadow)}
          onCheckedChange={(on) =>
            patch({
              shadow: on
                ? {
                    color: "#000000",
                    blur: 12,
                    offsetX: 0,
                    offsetY: 4,
                    opacity: 0.35,
                  }
                : null,
            })
          }
        />
      </div>

      {shadow && (
        <>
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
                onValueChange={([offsetX]) =>
                  patch({ shadow: { ...shadow, offsetX } })
                }
              />
            </Field>
            <Field label="Offset Y" hint={`${Math.round(shadow.offsetY)}`}>
              <Slider
                min={-80}
                max={80}
                step={1}
                value={[shadow.offsetY]}
                onValueChange={([offsetY]) =>
                  patch({ shadow: { ...shadow, offsetY } })
                }
              />
            </Field>
          </div>

          <Field label="Strength" hint={`${Math.round(shadow.opacity * 100)}%`}>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[shadow.opacity]}
              onValueChange={([opacity]) =>
                patch({ shadow: { ...shadow, opacity } })
              }
            />
          </Field>
        </>
      )}
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

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Background pill</span>
        <Switch
          checked={Boolean(background)}
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

      {background && (
        <>
          <ColorPicker
            value={background.color}
            onChange={(color) =>
              patch({ background: { ...background, color } })
            }
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Padding X"
              hint={`${Math.round(background.paddingX)}`}
            >
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
            <Field
              label="Padding Y"
              hint={`${Math.round(background.paddingY)}`}
            >
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

          <Field
            label="Opacity"
            hint={`${Math.round(background.opacity * 100)}%`}
          >
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
        </>
      )}
    </div>
  );
}
