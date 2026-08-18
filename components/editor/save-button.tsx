"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { createProject, updateProject } from "@/actions/projects/projectActions";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { clearDraft, prepareDocForSave } from "@/lib/editor/persistence";
import { useEditorStore } from "@/lib/editor/store";

import { UNTITLED } from "./project-title";

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

        const result = projectId
          ? await updateProject(projectId, { doc })
          : await createProject({
              // Trimmed-empty falls back too — `??` alone would send "" and fail
              // the name's own min(1) rather than saving.
              name: state.projectName.trim() || UNTITLED,
              doc,
              thumbnailUrl: null,
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

  return (
    <Button variant="outline" size="sm" onClick={handleSave} disabled={busy}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
      {signedIn ? "Save" : "Save · sign up"}
    </Button>
  );
}
