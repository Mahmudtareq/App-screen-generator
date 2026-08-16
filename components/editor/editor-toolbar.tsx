"use client";

import Link from "next/link";
import { Download, LayoutGrid, Redo2, RotateCcw, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { routes } from "@/config/routes";
import { selectFitScale } from "@/lib/editor/selectors";
import { useEditorHistory, useEditorStore } from "@/lib/editor/store";

import { SaveButton } from "./save-button";

export function EditorToolbar({
  projectId,
  projectName,
  signedIn,
}: {
  projectId?: string;
  projectName?: string;
  signedIn: boolean;
}) {
  const fitScale = useEditorStore(selectFitScale);
  const setExportOpen = useEditorStore((s) => s.setExportOpen);
  const resetDoc = useEditorStore((s) => s.resetDoc);

  const undo = useEditorHistory((s) => s.undo);
  const redo = useEditorHistory((s) => s.redo);
  const canUndo = useEditorHistory((s) => s.pastStates.length > 0);
  const canRedo = useEditorHistory((s) => s.futureStates.length > 0);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <span className="text-sm font-semibold">
        {projectName ?? "Mockup Studio"}
      </span>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => undo()}
        disabled={!canUndo}
        aria-label="Undo"
      >
        <Undo2 className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => redo()}
        disabled={!canRedo}
        aria-label="Redo"
      >
        <Redo2 className="size-4" />
      </Button>

      <Button variant="ghost" size="icon" onClick={resetDoc} aria-label="Start over">
        <RotateCcw className="size-4" />
      </Button>

      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
        {Math.round(fitScale * 100)}%
      </span>

      {signedIn && (
        <Button variant="ghost" size="sm" asChild>
          <Link href={routes.private.dashboard}>
            <LayoutGrid className="size-4" />
            Projects
          </Link>
        </Button>
      )}

      <SaveButton
        projectId={projectId}
        projectName={projectName}
        signedIn={signedIn}
      />

      <Button onClick={() => setExportOpen(true)} size="sm">
        <Download className="size-4" />
        Export
      </Button>
    </header>
  );
}
