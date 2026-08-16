"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CanvasHost } from "@/components/canvas/canvas-host";
import { useEditorShortcuts } from "@/hooks/use-editor-shortcuts";
import { useProjectBootstrap } from "@/hooks/use-project-bootstrap";
import type { EditorDoc } from "@/schemas/editor";

import { EditorToolbar } from "./editor-toolbar";
import { ExportDialog } from "./export/export-dialog";
import { ArtboardPanel } from "./panels/artboard-panel";
import { BackgroundPanel } from "./panels/background-panel";
import { DevicePanel } from "./panels/device-panel";
import { LogoPanel } from "./panels/logo-panel";
import { TextPanel } from "./panels/text-panel";

export interface EditorShellProps {
  projectId?: string;
  projectName?: string;
  initialDoc?: EditorDoc;
  signedIn: boolean;
}

export function EditorShell({
  projectId,
  projectName,
  initialDoc,
  signedIn,
}: EditorShellProps) {
  const ready = useProjectBootstrap(initialDoc);
  useEditorShortcuts();

  return (
    <div className="flex h-dvh flex-col">
      <EditorToolbar
        projectId={projectId}
        projectName={projectName}
        signedIn={signedIn}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-80 shrink-0 border-r md:block">
          <Tabs defaultValue="device" className="flex h-full flex-col gap-0">
            <TabsList className="m-3 grid w-auto grid-cols-3">
              <TabsTrigger value="device">Device</TabsTrigger>
              <TabsTrigger value="design">Design</TabsTrigger>
              <TabsTrigger value="text">Text</TabsTrigger>
            </TabsList>

            <ScrollArea className="min-h-0 flex-1">
              {ready ? (
                <>
                  <TabsContent value="device" className="m-0">
                    <DevicePanel />
                  </TabsContent>
                  <TabsContent value="design" className="m-0">
                    <BackgroundPanel />
                    <LogoPanel />
                    <ArtboardPanel />
                  </TabsContent>
                  <TabsContent value="text" className="m-0">
                    <TextPanel />
                  </TabsContent>
                </>
              ) : (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </aside>

        <main className="min-w-0 flex-1">
          <CanvasHost />
        </main>
      </div>

      <ExportDialog />
    </div>
  );
}
