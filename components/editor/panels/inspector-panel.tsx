"use client";

import { useState } from "react";
import {
  ChevronDown,
  Image as ImageIcon,
  Layers,
  Palette,
  Plus,
  Type,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { selectScreen } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { cn } from "@/lib/utils";
import { screenLabel } from "@/schemas/editor";

import { ScreenActions } from "../screens/screen-actions";
import { BackgroundPanel } from "./background-panel";
import { LayerRow } from "./layer-row";

/**
 * The edit box for the selected screen, rendered inline in the filmstrip beside
 * the card it belongs to.
 *
 * Inline rather than docked to the window edge, because the thing being edited is
 * one frame in a row of five: sitting next to its own card keeps the two visually
 * paired while scrolling, which a fixed side panel loses the moment the strip
 * moves. It matches the reference the design came from for the same reason.
 */
export function InspectorPanel({
  screenId,
  index,
  width,
  height,
}: {
  screenId: string;
  index: number;
  /** Matched to the card height so the panel lines up with the strip. */
  width: number;
  height: number;
}) {
  const screen = useEditorStore(selectScreen(screenId));
  const addLayer = useEditorStore((s) => s.addLayer);
  const selectLayer = useEditorStore((s) => s.selectLayer);

  /** This screen's selected layer, or null when the selection is elsewhere. */
  const selectedLayerId = useEditorStore((s) =>
    s.screenId === screenId ? s.layerId : null,
  );

  /**
   * Which sections are open, by id.
   *
   * Local rather than in the store: it is pure view state, and putting it in the
   * document would make expanding a section an undo step.
   */
  const [open, setOpen] = useState<string | null>("layers");
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);
  const [lastSelectedLayerId, setLastSelectedLayerId] = useState<string | null>(
    null,
  );

  /**
   * Selecting a layer on the canvas opens its row, and closes whichever was open.
   *
   * Without this the two halves drift apart: clicking a caption on the canvas set
   * the store's selection and highlighted the row, but the row stayed collapsed —
   * so the controls for the thing you just clicked were one more click away, and
   * the panel looked like it had ignored you.
   *
   * Synced during render rather than in an effect, so the row is already open in
   * the same commit that draws the selection ring; an effect would paint the
   * highlight first and expand a frame later, which reads as a flicker.
   *
   * Comparing against the *last seen* selection rather than assigning
   * unconditionally is what leaves the chevron working: collapsing an expanded row
   * by hand does not change the selection, so nothing here fights it back open.
   */
  if (selectedLayerId !== lastSelectedLayerId) {
    setLastSelectedLayerId(selectedLayerId);
    if (selectedLayerId) {
      setExpandedLayerId(selectedLayerId);
      // A layer selected while the Background section was open would otherwise
      // expand out of sight.
      setOpen("layers");
    }
  }

  if (!screen) return null;

  const toggleSection = (id: string) => setOpen((current) => (current === id ? null : id));

  const handleAdd = (kind: "image" | "text") => {
    const layerId = addLayer(screenId, kind);
    if (!layerId) return;

    selectLayer(screenId, layerId);
    setOpen("layers");
    // Open the new layer straight away — an image layer draws nothing until a file
    // is chosen, so a collapsed row would look like the click did nothing.
    setExpandedLayerId(layerId);
    if (kind === "image") toast.info("Choose an image for the new layer");
  };

  // Rendered top-first: the array is bottom-first, which is the order Konva paints
  // in, but a layer list that puts the backmost item at the top reads backwards.
  const rows = screen.layers
    .map((layer, layerIndex) => ({ layer, layerIndex }))
    .reverse();

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm"
      style={{ width, height }}
    >
      <div className="border-b p-2">
        <ScreenActions screenId={screenId} />
      </div>

      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="truncate text-xs font-medium text-muted-foreground">
          {screenLabel(screen, index)}
        </span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          <Section
            id="layers"
            label="Layouts & Elements"
            icon={<Layers className="size-4" />}
            open={open === "layers"}
            onToggle={toggleSection}
            action={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 bg-primary/10 text-primary hover:bg-primary/15"
                    aria-label="Add a layer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Plus className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleAdd("image")}>
                    <ImageIcon className="size-4" />
                    Image layer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAdd("text")}>
                    <Type className="size-4" />
                    Text layer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          >
            <div className="space-y-2">
              {rows.map(({ layer, layerIndex }) => (
                <LayerRow
                  key={layer.id}
                  screenId={screenId}
                  layer={layer}
                  index={layerIndex}
                  total={screen.layers.length}
                  expanded={expandedLayerId === layer.id}
                  onToggle={() =>
                    setExpandedLayerId((current) =>
                      current === layer.id ? null : layer.id,
                    )
                  }
                />
              ))}
            </div>
          </Section>

          <Section
            id="background"
            label="Background"
            icon={<Palette className="size-4" />}
            open={open === "background"}
            onToggle={toggleSection}
          >
            <BackgroundPanel screenId={screenId} />
          </Section>
        </div>
      </ScrollArea>
    </div>
  );
}

function Section({
  id,
  label,
  icon,
  open,
  onToggle,
  action,
  children,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: (id: string) => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-muted/30">
      <div className="flex items-center gap-2 p-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => onToggle(id)}
          aria-expanded={open}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-background text-muted-foreground">
            {icon}
          </span>
          <span className="truncate text-sm font-medium">{label}</span>
        </button>

        {action}

        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          onClick={() => onToggle(id)}
          aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
        >
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </Button>
      </div>

      {open && <div className="border-t p-2">{children}</div>}
    </div>
  );
}
