"use client";

import { ChevronLeft, ChevronRight, Pin } from "lucide-react";

import { CanvasStage } from "@/components/canvas/canvas-host";
import { Button } from "@/components/ui/button";
import { CANVAS_GUTTER_X, CANVAS_GUTTER_Y } from "@/lib/canvas/fit";
import { selectScreen } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { cn } from "@/lib/utils";
import { screenLabel } from "@/schemas/editor";

/**
 * One screen in the filmstrip.
 *
 * The card is the click target that opens the inspector; clicks that land on a
 * shape inside the Stage select that layer as well, because Konva's own handlers
 * run first and this one is only reached by the bubble.
 */
export function ScreenCard({
  screenId,
  index,
  width,
  height,
  selected,
}: {
  screenId: string;
  index: number;
  width: number;
  height: number;
  selected: boolean;
}) {
  const screen = useEditorStore(selectScreen(screenId));
  const screenCount = useEditorStore((s) => s.doc.screens.length);
  const selectScreenAction = useEditorStore((s) => s.selectScreen);
  const moveScreen = useEditorStore((s) => s.moveScreen);

  if (!screen) return null;

  return (
    <div
      data-testid="screen-card"
      className="group/card flex shrink-0 flex-col"
      style={{ width }}
    >
      {/* The Stage is a gutter larger than the artboard on every side so selection
          chrome can draw past the artboard edge. The ring is therefore an inset
          overlay around the artboard rather than a border on this box, and the
          canvas clips the artwork to the same rounded rect itself. */}
      <div
        className="relative"
        style={{ width, height }}
        onPointerDown={() => selectScreenAction(screenId)}
      >
        <CanvasStage screenId={screenId} />

        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute rounded-xl ring-offset-2 ring-offset-background transition-shadow",
            selected
              ? "ring-2 ring-primary"
              : "ring-1 ring-border group-hover/card:ring-primary/40",
          )}
          style={{
            top: CANVAS_GUTTER_Y,
            bottom: CANVAS_GUTTER_Y,
            left: CANVAS_GUTTER_X,
            right: CANVAS_GUTTER_X,
          }}
        />

        {screen.pinned && (
          <span
            className="absolute grid size-6 place-items-center rounded-full bg-background/85 text-primary shadow-sm"
            style={{ top: CANVAS_GUTTER_Y + 6, right: CANVAS_GUTTER_X + 6 }}
            title="Pinned — bulk changes skip this screen"
          >
            <Pin className="size-3" />
          </span>
        )}
      </div>

      {/* Pulled up into the bottom gutter so the label keeps sitting just below
          the artboard, not a full gutter away from it. The row itself must not
          catch clicks — that strip of canvas is where bottom handles live — so
          only its two ends are interactive. */}
      <div
        className="pointer-events-none flex items-center justify-between gap-1"
        style={{
          marginTop: -(CANVAS_GUTTER_Y - 6),
          paddingInline: CANVAS_GUTTER_X + 2,
        }}
      >
        <span className="truncate text-[11px] text-muted-foreground">
          {screenLabel(screen, index)}
        </span>

        {/* Reordering only appears on hover: five always-visible arrow pairs is a
            lot of chrome for something used once per project. */}
        <span className="pointer-events-auto flex shrink-0 items-center opacity-0 transition-opacity group-hover/card:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-5 text-muted-foreground"
            disabled={index === 0}
            onClick={() => moveScreen(screenId, "left")}
            aria-label="Move screen left"
          >
            <ChevronLeft className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-5 text-muted-foreground"
            disabled={index === screenCount - 1}
            onClick={() => moveScreen(screenId, "right")}
            aria-label="Move screen right"
          >
            <ChevronRight className="size-3" />
          </Button>
        </span>
      </div>
    </div>
  );
}
