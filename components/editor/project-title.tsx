"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { updateProject } from "@/actions/projects/projectActions";
import { Input } from "@/components/ui/input";
import { useEditorStore } from "@/lib/editor/store";
import { cn } from "@/lib/utils";

export const UNTITLED = "Untitled mockup";
const MAX_LENGTH = 120;

/**
 * The project's name, edited in place in the app bar.
 *
 * One control covers both cases the name has, which is why it is not a dialog on
 * save: before a project exists, typing here is simply what the eventual
 * `createProject` call will be given; afterwards, committing writes the row
 * straight away. A "name this" dialog in front of Save would ask the question at
 * the worst moment and still leave renaming unsolved.
 *
 * The store holds the value (see `UiSlice.projectName`) rather than this
 * component, because the Save button needs it too and neither owns the other.
 */
export function ProjectTitle({ projectId }: { projectId?: string }) {
  const name = useEditorStore((s) => s.projectName);
  const setProjectName = useEditorStore((s) => s.setProjectName);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, startSaving] = useTransition();

  const startEditing = () => {
    setDraft(name);
    setEditing(true);
    // Focused on the next frame: the input does not exist until this render
    // commits, and `autoFocus` would fight the canvas for focus on first paint.
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const commit = () => {
    setEditing(false);

    const next = draft.trim().slice(0, MAX_LENGTH);
    if (!next || next === name) return;

    setProjectName(next);

    // An unsaved project has no row to rename — the value is simply carried to
    // whichever `createProject` call eventually happens.
    if (!projectId) return;

    startSaving(async () => {
      const result = await updateProject(projectId, { name: next });

      if (!result?.status) {
        // Put the old name back rather than leaving the bar showing a title the
        // database does not have.
        setProjectName(name);
        toast.error(result?.message ?? "Could not rename this project.");
        return;
      }

      // The dashboard and this route's metadata both read the name server-side.
      router.refresh();
    });
  };

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        maxLength={MAX_LENGTH}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setEditing(false);
        }}
        aria-label="Project name"
        className="h-8 w-56 text-sm"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      title="Rename this project"
      className={cn(
        "text-muted-foreground hover:text-foreground focus-visible:ring-ring group flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:outline-none",
        !name && "italic",
      )}
    >
      <span className="truncate">{name || UNTITLED}</span>
      {saving ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
      ) : (
        <Pencil className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}
