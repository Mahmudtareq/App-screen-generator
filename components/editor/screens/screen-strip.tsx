"use client";

import { Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { useCanvasFonts } from "@/components/canvas/canvas-host";
import { Skeleton } from "@/components/ui/skeleton";
import { MAX_SCREENS } from "@/config/templates";
import {
  CANVAS_GUTTER_X,
  CANVAS_GUTTER_Y,
  STRIP_PADDING,
} from "@/lib/canvas/fit";
import { useElementSize } from "@/hooks/use-element-size";
import {
  selectCardScale,
  selectScreenArtboard,
  selectScreenScale,
} from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";

import { InspectorPanel } from "../panels/inspector-panel";
import { ScreenCard } from "./screen-card";

/** How much wider the inspector is than a card, so its controls are not cramped. */
const PANEL_WIDTH_RATIO = 1.3;
const PANEL_MIN_WIDTH = 320;
const PANEL_MAX_WIDTH = 440;

/**
 * The horizontally scrolling row of screens.
 *
 * Cards are sized from the strip's height alone — every screen shares one artboard,
 * so they are all identical in size, and fitting to width as well would shrink the
 * set to thumbnails the moment a sixth screen was added.
 *
 * The inspector for the selected screen is inserted into the row immediately after
 * its card rather than docked to the window edge, which keeps the frame and the
 * controls editing it side by side while the strip scrolls.
 */
export function ScreenStrip() {
  const screenIds = useEditorStore(
    useShallow((s) => s.doc.screens.map((screen) => screen.id)),
  );
  const artboard = useEditorStore((s) => s.doc.artboard);
  const cardScale = useEditorStore(selectCardScale);
  const selectedScreenId = useEditorStore((s) => s.screenId);
  const setStripHeight = useEditorStore((s) => s.setStripHeight);
  const addScreen = useEditorStore((s) => s.addScreen);
  const selectScreen = useEditorStore((s) => s.selectScreen);

  const fontsReady = useCanvasFonts();

  const ref = useElementSize<HTMLDivElement>(({ height }) => setStripHeight(height));

  // Cards are the artboard plus the Stage's selection-chrome gutter on each side;
  // the gutter is visually empty, so the flex gap stays small to compensate.
  const cardWidth = artboard.width * cardScale + CANVAS_GUTTER_X * 2;
  const cardHeight = artboard.height * cardScale + CANVAS_GUTTER_Y * 2;

  const panelWidth = Math.round(
    Math.min(PANEL_MAX_WIDTH, Math.max(PANEL_MIN_WIDTH, cardWidth * PANEL_WIDTH_RATIO)),
  );

  // Gate the first Stage render on the canvas fonts: Konva bakes text metrics at
  // construction, so painting before the faces land produces wrong line breaks that
  // then visibly snap into place — five times over, with five Stages on screen.
  const ready = fontsReady && cardScale > 0;

  return (
    <div
      ref={ref}
      className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden bg-muted/40"
    >
      <div
        className="flex h-full items-center gap-1"
        style={{ padding: STRIP_PADDING }}
      >
        {!ready
          ? // Placeholders at the real card size, so the strip does not reflow the
            // moment the fonts resolve. The skeleton is inset to the artwork rect
            // so it matches what the canvas will occupy.
            screenIds.map((id) => (
              <div
                key={id}
                className="shrink-0"
                style={{
                  width: cardWidth || 220,
                  height: cardHeight || 460,
                  padding: `${CANVAS_GUTTER_Y}px ${CANVAS_GUTTER_X}px`,
                }}
              >
                <Skeleton className="size-full rounded-xl" />
              </div>
            ))
          : screenIds.map((id, index) => (
              <ScreenStripItem
                key={id}
                screenId={id}
                index={index}
                panelWidth={panelWidth}
                selected={selectedScreenId === id}
              />
            ))}

        {screenIds.length < MAX_SCREENS && (
          <div
            className="shrink-0"
            style={{
              width: cardWidth || 220,
              height: cardHeight || 460,
              padding: `${CANVAS_GUTTER_Y}px ${CANVAS_GUTTER_X}px`,
            }}
          >
            <button
              type="button"
              className="flex size-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-primary/50 hover:bg-accent/40 hover:text-foreground"
              onClick={() => {
                const id = addScreen(screenIds[screenIds.length - 1]);
                if (id) selectScreen(id);
              }}
            >
              <Plus className="size-6" />
              <span className="text-xs font-medium">Add screen</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * A card, plus its inspector when selected.
 *
 * Split into its own component so an unselected card does not re-render when the
 * selection moves between two other screens — and so each card can size itself:
 * a screen broken out to its own canvas renders at its own fit scale, giving the
 * strip mixed card widths while every card still fills the strip's height.
 */
function ScreenStripItem({
  screenId,
  index,
  panelWidth,
  selected,
}: {
  screenId: string;
  index: number;
  panelWidth: number;
  selected: boolean;
}) {
  const artboard = useEditorStore(selectScreenArtboard(screenId));
  const scale = useEditorStore(selectScreenScale(screenId));

  const cardWidth = artboard.width * scale + CANVAS_GUTTER_X * 2;
  const cardHeight = artboard.height * scale + CANVAS_GUTTER_Y * 2;

  return (
    <>
      <ScreenCard
        screenId={screenId}
        index={index}
        width={cardWidth}
        height={cardHeight}
        selected={selected}
      />

      {selected && (
        <InspectorPanel
          screenId={screenId}
          index={index}
          width={panelWidth}
          // The card's height includes the Stage gutter; the panel lines up with
          // the artboard itself (the row is items-center, so it stays centred).
          height={cardHeight - CANVAS_GUTTER_Y * 2}
        />
      )}
    </>
  );
}
