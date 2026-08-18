"use client";

import {
  Check,
  Copy,
  Download,
  Palette,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MAX_SCREENS } from "@/config/templates";
import { selectScreen } from "@/lib/editor/selectors";
import { useEditorStore } from "@/lib/editor/store";
import { cn } from "@/lib/utils";

/**
 * The action row above the selected screen's inspector.
 *
 * Everything here operates on one screen. `applyBackgroundToAll` is the one that
 * reaches outside it, and it is deliberately the same "copy this outward" gesture
 * as in the reference rather than a hidden menu item — matching five frames is the
 * job, and doing it one frame at a time is the tedium this replaces.
 */
export function ScreenActions({ screenId }: { screenId: string }) {
  const screen = useEditorStore(selectScreen(screenId));
  const screenCount = useEditorStore((s) => s.doc.screens.length);

  const duplicateScreen = useEditorStore((s) => s.duplicateScreen);
  const removeScreen = useEditorStore((s) => s.removeScreen);
  const resetScreen = useEditorStore((s) => s.resetScreen);
  const setScreenPinned = useEditorStore((s) => s.setScreenPinned);
  const applyBackgroundToAll = useEditorStore((s) => s.applyBackgroundToAll);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const selectScreenAction = useEditorStore((s) => s.selectScreen);
  const openExport = useEditorStore((s) => s.openExport);

  if (!screen) return null;

  const atLimit = screenCount >= MAX_SCREENS;

  return (
    <div className="flex items-center gap-1">
      <Action
        label="Done editing"
        tone="confirm"
        onClick={clearSelection}
      >
        <Check className="size-4" />
      </Action>

      <Action
        label="Reset this screen's layout"
        onClick={() => {
          resetScreen(screenId);
          toast.success("Layout reset — copy and images kept");
        }}
      >
        <RotateCcw className="size-4" />
      </Action>

      <Action
        label={atLimit ? `Limit is ${MAX_SCREENS} screens` : "Duplicate this screen"}
        disabled={atLimit}
        onClick={() => {
          const id = duplicateScreen(screenId);
          if (id) selectScreenAction(id);
        }}
      >
        <Copy className="size-4" />
      </Action>

      <Action label="Export this screen" onClick={() => openExport(screenId)}>
        <Download className="size-4" />
      </Action>

      <Action
        label="Apply this background to every screen"
        disabled={screenCount < 2}
        onClick={() => {
          applyBackgroundToAll(screenId);
          toast.success("Background applied to the other screens");
        }}
      >
        <Palette className="size-4" />
      </Action>

      <Action
        label={
          screen.pinned
            ? "Unpin — let bulk changes touch this screen"
            : "Pin — keep bulk changes off this screen"
        }
        active={screen.pinned}
        onClick={() => setScreenPinned(screenId, !screen.pinned)}
      >
        {screen.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
      </Action>

      <Action
        label={
          screenCount <= 1 ? "A project needs at least one screen" : "Delete this screen"
        }
        tone="danger"
        disabled={screenCount <= 1}
        onClick={() => removeScreen(screenId)}
      >
        <Trash2 className="size-4" />
      </Action>
    </div>
  );
}

function Action({
  label,
  tone = "default",
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  tone?: "default" | "confirm" | "danger";
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-8 shrink-0",
        tone === "default" && "bg-muted text-muted-foreground hover:bg-muted/80",
        tone === "confirm" &&
          "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400",
        tone === "danger" &&
          "bg-destructive/10 text-destructive hover:bg-destructive/20",
        active && tone === "default" && "bg-primary/15 text-primary hover:bg-primary/20",
      )}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );
}
