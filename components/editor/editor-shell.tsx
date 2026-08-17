"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useEditorShortcuts } from "@/hooks/use-editor-shortcuts";
import { useProjectBootstrap } from "@/hooks/use-project-bootstrap";

import { AppBar } from "./app-bar";
import { EditorToolbar } from "./editor-toolbar";
import { ExportDialog } from "./export/export-dialog";
import { ScreenStrip } from "./screens/screen-strip";

export interface EditorShellProps {
  projectId?: string;
  projectName?: string;
  /**
   * Typed loosely on purpose: `Project.doc` is a `Mixed` subdocument, so what comes
   * back from the database is whatever version was written. The bootstrap hook runs
   * it through `migrateDoc` rather than trusting the declared type.
   */
  initialDoc?: unknown;
  signedIn: boolean;
}

/**
 * The editor: a product bar, a project toolbar, and the filmstrip of screens.
 *
 * There is no left rail of tabs any more. Everything that edits one screen lives in
 * that screen's inspector, inline in the strip beside it, and everything that edits
 * the project lives in the toolbar. The split is by scope rather than by category,
 * which is what makes it obvious whether a control will change one frame or five.
 */
export function EditorShell({
  projectId,
  projectName,
  initialDoc,
  signedIn,
}: EditorShellProps) {
  const ready = useProjectBootstrap(initialDoc);
  useEditorShortcuts();
  console.log("EditorShell render", {
    projectId,
    projectName,
    initialDoc,
    signedIn,
    ready,
  });

  return (
    <div className="flex h-dvh flex-col">
      <AppBar active="editor" projectName={projectName} signedIn={signedIn} />

      <EditorToolbar
        projectId={projectId}
        projectName={projectName}
        signedIn={signedIn}
      />

      {ready ? (
        <ScreenStrip />
      ) : (
        <div className="flex min-h-0 flex-1 items-center gap-3 overflow-hidden bg-muted/40 p-6">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-full w-56 shrink-0 rounded-xl" />
          ))}
        </div>
      )}

      <ExportDialog />
    </div>
  );
}
