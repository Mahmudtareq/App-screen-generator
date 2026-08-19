"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutTemplate, Loader2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { createProject, updateProject } from "@/actions/projects/projectActions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routes } from "@/config/routes";
import { clearDraft, prepareDocForSave } from "@/lib/editor/persistence";
import { useEditorStore } from "@/lib/editor/store";
import { captureDocThumbnail } from "@/lib/editor/thumbnail";
import { isCustomTemplateId } from "@/schemas/template";

import { UNTITLED } from "./project-title";
import { SaveTemplateDialog } from "./templates/save-template-dialog";

export function SaveButton({
  projectId,
  signedIn,
}: {
  projectId?: string;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [templateDialog, setTemplateDialog] = useState<
    "create" | "update" | null
  >(null);
  // Whether the open document came from a user-saved template — that is what
  // makes "Update template" a meaningful offer. Ownership is checked by the
  // PATCH's filter server-side, not here.
  const fromCustomTemplate = useEditorStore((s) =>
    isCustomTemplateId(s.doc.templateId),
  );

  const handleSave = () => {
    if (!signedIn) {
      // The draft is already in localStorage, so bouncing through sign-up loses
      // nothing — the editor picks it back up on return.
      router.push(
        `${routes.public.register}?callbackUrl=${encodeURIComponent(routes.public.editor)}`,
      );
      return;
    }

    setSaving(true);
    startTransition(async () => {
      try {
        const state = useEditorStore.getState();

        // Uploads anything still held as a local object URL and patches the real
        // https URLs into the document. Skipping this would fail validation
        // rather than silently persist a dead blob: URL.
        const doc = await prepareDocForSave(state);

        // The dashboard card's preview. Null on failure — and then omitted from
        // an update, so a one-off capture hiccup cannot erase the card's
        // existing image.
        const thumbnailUrl = await captureDocThumbnail(state);

        const result = projectId
          ? await updateProject(projectId, {
              doc,
              ...(thumbnailUrl ? { thumbnailUrl } : {}),
            })
          : await createProject({
              // Trimmed-empty falls back too — `??` alone would send "" and fail
              // the name's own min(1) rather than saving.
              name: state.projectName.trim() || UNTITLED,
              doc,
              thumbnailUrl,
            });

        if (!result?.status) {
          toast.error(result?.message ?? "Could not save this project.");
          return;
        }

        clearDraft();
        toast.success(projectId ? "Project saved" : "Project created");

        if (!projectId) router.push(routes.private.project(result.data.id));
        else router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not save this project.",
        );
      } finally {
        setSaving(false);
      }
    });
  };

  const busy = pending || saving;

  // Signed out: the plain button (which routes through sign-up) is the whole
  // story — the template options only exist for an account to own them.
  if (!signedIn) {
    return (
      <Button variant="outline" size="sm" onClick={handleSave} disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        Save · sign up
      </Button>
    );
  }

  return (
    <>
      {/* A split control: the main button keeps its one-click project save,
          the chevron holds the template options. One bordered shell with ghost
          segments inside — two adjoining outline buttons read as a seam of
          doubled borders and mismatched corners. */}
      <div className="flex h-8 items-stretch overflow-hidden rounded-md border bg-background shadow-xs">
        <Button
          variant="ghost"
          size="sm"
          className="h-full rounded-none px-3"
          onClick={handleSave}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save
        </Button>
        <span aria-hidden className="my-1.5 w-px bg-border" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-full rounded-none px-1.5"
              disabled={busy}
              aria-label="More save options"
            >
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuItem
              className="items-start gap-3 py-2.5"
              onSelect={() => setTemplateDialog("create")}
            >
              <LayoutTemplate className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">Save as new template</span>
                <span className="text-xs text-muted-foreground">
                  Publish a copy of these screens for everyone to reuse
                </span>
              </span>
            </DropdownMenuItem>
            {fromCustomTemplate && (
              <DropdownMenuItem
                className="items-start gap-3 py-2.5"
                onSelect={() => setTemplateDialog("update")}
              >
                <RefreshCw className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">Update template</span>
                  <span className="text-xs text-muted-foreground">
                    Overwrite the template this project came from
                  </span>
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mounted only while open, so its form state initialises fresh each time. */}
      {templateDialog !== null && (
        <SaveTemplateDialog
          mode={templateDialog}
          onClose={() => setTemplateDialog(null)}
          projectId={projectId}
        />
      )}
    </>
  );
}
