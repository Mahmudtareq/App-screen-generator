"use client";

import type { SessionUser } from "@/components/auth/user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { registerCustomDevices } from "@/lib/devices/registry";
import type { DeviceSpec } from "@/lib/devices/types";
import { useEditorShortcuts } from "@/hooks/use-editor-shortcuts";
import { useProjectBootstrap } from "@/hooks/use-project-bootstrap";

import { AppBar } from "./app-bar";
import { ProjectTitle } from "./project-title";
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
  /** The signed-in user, or null when anonymous. Saving needs one; editing does not. */
  user: SessionUser | null;
  /** Admin-authored device specs, fetched by the server page. */
  customDevices?: DeviceSpec[];
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
  user,
  customDevices,
}: EditorShellProps) {
  // Registered during render, before any Stage mounts, so `resolveDevice` never
  // has a frame where a document's device id is unknown. The registry is an
  // idempotent module-level map (like the bitmap cache), so re-running under
  // Strict Mode is harmless.
  registerCustomDevices(customDevices ?? []);

  const ready = useProjectBootstrap(initialDoc, projectName);
  useEditorShortcuts();

  const signedIn = Boolean(user);

  return (
    <div className="flex h-dvh flex-col">
      <AppBar
        active="editor"
        title={<ProjectTitle projectId={projectId} />}
        user={user}
      />

      <EditorToolbar projectId={projectId} signedIn={signedIn} />

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
