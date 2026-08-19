"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageOff, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { deleteProject } from "@/actions/projects/projectActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectSummary } from "@/schemas/project";

/**
 * The delete affordance on a dashboard card, with its confirmation dialog.
 *
 * A client island inside the otherwise server-rendered card. The trigger sits
 * inside the card's <Link>, so its click must be stopped from both navigating
 * and bubbling; the dialog itself renders in a portal, safely outside the link.
 *
 * Confirmation is a modal rather than an undo toast because the route's DELETE
 * is permanent — there is no trash to restore from. The modal restates which
 * project is about to go (thumbnail, name, last edit) so a mis-hover on a grid
 * of near-identical cards cannot end in the wrong deletion.
 *
 * `updatedLabel` is preformatted by the server card — the same string the card
 * itself shows — rather than recomputed here.
 */
export function DeleteProjectButton({
  project,
  updatedLabel,
}: {
  project: ProjectSummary;
  updatedLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirmDelete = () => {
    startTransition(async () => {
      const result = await deleteProject(project.id);

      if (!result?.status) {
        toast.error(result?.message ?? "Could not delete this project.");
        return;
      }

      toast.success(`“${project.name}” deleted`);
      setOpen(false);
      // The list is server-rendered; the action already bumped the cache tag.
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Delete ${project.name}`}
        title="Delete project"
        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-lg border border-transparent bg-background/95 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-all hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 group-hover:opacity-100"
        onClick={(e) => {
          // The whole card is a link to the editor; deleting must not open it.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Trash2 className="size-4" />
      </button>

      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent
          className="sm:max-w-md"
          // The portal keeps the dialog out of the <Link>'s DOM, but a click
          // that bubbles to document could still be caught by ancestors of the
          // trigger in React's tree — stop it at the boundary.
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <div className="mb-1 grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlert className="size-5" />
            </div>
            <DialogTitle>Delete this project?</DialogTitle>
            <DialogDescription>
              You are about to permanently delete this mockup project. This
              cannot be undone — there is no trash to restore it from.
            </DialogDescription>
          </DialogHeader>

          {/* Which project, restated — name, preview and last edit — so the
              confirmation is about a thing, not an id. */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            {project.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.thumbnailUrl}
                alt=""
                className="h-14 w-11 shrink-0 rounded-md border bg-background object-contain"
              />
            ) : (
              <span className="grid h-14 w-11 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground">
                <ImageOff className="size-4" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{project.name}</p>
              <p className="text-xs text-muted-foreground">
                Updated {updatedLabel}
              </p>
            </div>
          </div>

          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-destructive/60" />
              Every screen in this project — devices, images and captions — is
              deleted with it.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-destructive/60" />
              Templates you saved from it stay in the template list; they are
              independent copies.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-destructive/60" />
              Screenshots you already exported and downloaded are not affected.
            </li>
          </ul>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Keep project
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
