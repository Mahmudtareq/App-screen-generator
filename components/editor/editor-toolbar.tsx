"use client";

import {
  ArrowLeft,
  Download,
  LayoutTemplate,
  Redo2,
  RotateCcw,
  Settings2,
  Undo2,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ARTBOARD_PRESETS, getArtboardPreset } from "@/config/artboards";
import { routes } from "@/config/routes";
import { getTemplate } from "@/config/templates";
import { useEditorHistory, useEditorStore } from "@/lib/editor/store";
import { cn } from "@/lib/utils";

import { SetupPanel } from "./panels/setup-panel";
import { SaveButton } from "./save-button";
import { TemplatePicker } from "./template-picker";

const CUSTOM = "custom";
const PRESET_GROUPS = [...new Set(ARTBOARD_PRESETS.map((p) => p.group))];

/**
 * The editing toolbar: everything that applies to the project rather than to one
 * screen.
 *
 * The size selector lives here, not in a screen's inspector, because it is
 * document-level — five frames of one store listing have to share a canvas size or
 * they stop being a set.
 */
export function EditorToolbar({
  projectId,
  projectName,
  signedIn,
}: {
  projectId?: string;
  projectName?: string;
  signedIn: boolean;
}) {
  const artboard = useEditorStore((s) => s.doc.artboard);
  const templateId = useEditorStore((s) => s.doc.templateId);
  const screenCount = useEditorStore((s) => s.doc.screens.length);
  const selectedScreenId = useEditorStore((s) => s.screenId);
  const firstScreenId = useEditorStore((s) => s.doc.screens[0]?.id);

  const setArtboard = useEditorStore((s) => s.setArtboard);
  const resetScreen = useEditorStore((s) => s.resetScreen);
  const openExport = useEditorStore((s) => s.openExport);

  const undo = useEditorHistory((s) => s.undo);
  const redo = useEditorHistory((s) => s.redo);
  const canUndo = useEditorHistory((s) => s.pastStates.length > 0);
  const canRedo = useEditorHistory((s) => s.futureStates.length > 0);

  const exportTarget = selectedScreenId ?? firstScreenId;

  const applyPreset = (id: string) => {
    if (id === CUSTOM) {
      setArtboard({ ...artboard, preset: null });
      return;
    }
    const preset = getArtboardPreset(id);
    if (preset) {
      setArtboard({
        width: preset.width,
        height: preset.height,
        preset: preset.id,
      });
    }
  };

  return (
    <div className="flex h-12 shrink-0 items-center gap-1.5 border-b bg-background px-3">
      <Button variant="ghost" size="icon" className="size-8" asChild>
        <Link
          href={signedIn ? routes.private.dashboard : routes.public.home}
          aria-label="Back"
        >
          <ArrowLeft className="size-4" />
        </Link>
      </Button>

      <SaveButton
        projectId={projectId}
        projectName={projectName}
        signedIn={signedIn}
      />

      <TemplatePicker>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-8 bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-400",
          )}
          aria-label="Change template"
          title={`Template — ${getTemplate(templateId).label}`}
        >
          <LayoutTemplate className="size-4" />
        </Button>
      </TemplatePicker>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => undo()}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (⌘Z)"
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => redo()}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (⇧⌘Z)"
      >
        <Redo2 className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground"
        disabled={!selectedScreenId}
        onClick={() => selectedScreenId && resetScreen(selectedScreenId)}
        aria-label="Reset the selected screen's layout"
        title={
          selectedScreenId
            ? "Reset the selected screen's layout"
            : "Select a screen to reset it"
        }
      >
        <RotateCcw className="size-4" />
      </Button>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm" className="h-8">
            <Settings2 className="size-4" />
            Setup
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <SetupPanel />
        </PopoverContent>
      </Popover>

      <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
        {screenCount} {screenCount === 1 ? "screen" : "screens"}
      </span>

      <Select value={artboard.preset ?? CUSTOM} onValueChange={applyPreset}>
        <SelectTrigger className="w-47.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESET_GROUPS.map((group) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {ARTBOARD_PRESETS.filter((p) => p.group === group).map(
                (preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ),
              )}
            </SelectGroup>
          ))}
          <SelectGroup>
            <SelectLabel>Other</SelectLabel>
            <SelectItem value={CUSTOM}>
              Custom — {artboard.width} × {artboard.height}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <Button
        size="sm"
        className="h-8"
        disabled={!exportTarget}
        onClick={() => exportTarget && openExport(exportTarget)}
      >
        <Download className="size-4" />
        Export
      </Button>
    </div>
  );
}
