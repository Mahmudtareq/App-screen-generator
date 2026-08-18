"use client";

import { useEffect, useRef } from "react";
import {
  AlignCenterHorizontal,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Smartphone,
  Trash2,
  Type,
  Unlock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/editor/store";
import { cn } from "@/lib/utils";
import {
  isDeviceLayer,
  isImageLayer,
  isTextLayer,
  layerLabel,
  type LayerKind,
  type ScreenLayer,
} from "@/schemas/editor";

import { DeviceLayerPanel } from "./device-layer-panel";
import { ImageLayerPanel } from "./image-layer-panel";
import { TextLayerPanel } from "./text-layer-panel";

const KIND_ICONS: Record<LayerKind, typeof ImageIcon> = {
  device: Smartphone,
  image: ImageIcon,
  text: Type,
};

/**
 * One row of the layer list.
 *
 * Rows are rendered top-first while `layers` is stored bottom-first, so the
 * position label is computed from the index within the array, not the row's place
 * on screen — "layer 5 (top)" has to mean the last element regardless of how the
 * list happens to be ordered visually.
 */
export function LayerRow({
  screenId,
  layer,
  index,
  total,
  expanded,
  onToggle,
}: {
  screenId: string;
  layer: ScreenLayer;
  /** Index within `screen.layers`, i.e. 0 is the bottom of the stack. */
  index: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const removeLayer = useEditorStore((s) => s.removeLayer);
  const duplicateLayer = useEditorStore((s) => s.duplicateLayer);
  const moveLayer = useEditorStore((s) => s.moveLayer);
  const centerLayer = useEditorStore((s) => s.centerLayer);
  const selectLayer = useEditorStore((s) => s.selectLayer);
  const selected = useEditorStore(
    (s) => s.screenId === screenId && s.layerId === layer.id,
  );

  const Icon = KIND_ICONS[layer.kind];
  const isDevice = isDeviceLayer(layer);

  const rowRef = useRef<HTMLDivElement>(null);

  /**
   * Bring a row into view as it opens.
   *
   * An expanded device panel is tall enough to push the rows below it out of the
   * scroll area, so a layer selected on the canvas could open somewhere the user
   * cannot see — which looks identical to not opening at all.
   *
   * `nearest` on both axes so this only scrolls when it has to: `inline` matters
   * because the inspector sits inside the horizontally scrolling filmstrip, and a
   * stronger alignment would drag the whole strip sideways on every click.
   */
  useEffect(() => {
    if (!expanded) return;
    rowRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [expanded]);

  const position =
    index === total - 1
      ? `layer ${index + 1} (top)`
      : index === 0
        ? `layer ${index + 1} (bottom)`
        : `layer ${index + 1}`;

  return (
    <div
      ref={rowRef}
      data-testid="layer-row"
      className={cn(
        "rounded-xl border bg-card transition-colors",
        selected && "border-primary/60 ring-1 ring-primary/20",
      )}
    >
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => {
            selectLayer(screenId, layer.id);
            onToggle();
          }}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {layerLabel(layer)}
            </span>
            <span className="block text-[11px] text-muted-foreground">{position}</span>
          </span>
        </button>

        <IconToggle
          label={layer.visible ? "Hide layer" : "Show layer"}
          active={!layer.visible}
          onClick={() => updateLayer(screenId, layer.id, { visible: !layer.visible })}
        >
          {layer.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </IconToggle>

        <IconToggle
          label="Centre horizontally"
          onClick={() => centerLayer(screenId, layer.id)}
        >
          <AlignCenterHorizontal className="size-3.5" />
        </IconToggle>

        <IconToggle
          label={layer.locked ? "Unlock layer" : "Lock layer"}
          active={layer.locked}
          onClick={() => {
            updateLayer(screenId, layer.id, { locked: !layer.locked });
            // A layer being locked while selected would leave the Transformer
            // attached to something that can no longer be dragged.
            if (!layer.locked) selectLayer(screenId, null);
          }}
        >
          {layer.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
        </IconToggle>

        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          onClick={onToggle}
          aria-label={expanded ? "Collapse layer" : "Expand layer"}
          aria-expanded={expanded}
        >
          <ChevronDown
            className={cn("size-4 transition-transform", expanded && "rotate-180")}
          />
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t p-3">
          {isDeviceLayer(layer) && (
            <DeviceLayerPanel screenId={screenId} layer={layer} />
          )}
          {isImageLayer(layer) && <ImageLayerPanel screenId={screenId} layer={layer} />}
          {isTextLayer(layer) && <TextLayerPanel screenId={screenId} layer={layer} />}

          <div className="flex items-center gap-1 border-t pt-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              disabled={index === total - 1}
              onClick={() => moveLayer(screenId, layer.id, "up")}
              aria-label="Bring forward"
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              disabled={index === 0}
              onClick={() => moveLayer(screenId, layer.id, "down")}
              aria-label="Send backward"
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => duplicateLayer(screenId, layer.id)}
              aria-label="Duplicate layer"
            >
              <Copy className="size-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="ml-auto size-7 text-muted-foreground hover:text-destructive"
              // The device is the subject of the mockup: with it gone there is
              // nothing left to show, so the button is absent rather than a
              // silent no-op the user has to discover.
              disabled={isDevice}
              title={isDevice ? "The device cannot be deleted" : undefined}
              onClick={() => removeLayer(screenId, layer.id)}
              aria-label="Delete layer"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconToggle({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-7 shrink-0",
        active
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "text-muted-foreground",
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}
