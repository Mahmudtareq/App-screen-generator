"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  createTemplate,
  getTemplateDetail,
  updateTemplate,
} from "@/actions/templates/templateActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { prepareDocForSave } from "@/lib/editor/persistence";
import { useEditorStore } from "@/lib/editor/store";
import { captureDocThumbnail } from "@/lib/editor/thumbnail";
import {
  parseCustomTemplateId,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
} from "@/schemas/template";

import { Field } from "../panels/panel-section";
import { UNTITLED } from "../project-title";

/**
 * Collects template details and saves the current document as one.
 *
 * Mounted fresh each time it opens (the parent renders it conditionally), so
 * the form state initialises from the store without effect-driven resets.
 *
 * "Update" targets the template the document came from (`doc.templateId` is a
 * `custom:` id); ownership is enforced by the PATCH's filter server-side, so a
 * template that is not the user's — or was deleted — comes back 404 and the
 * dialog recommends saving as a new one instead. The document snapshot goes
 * through `prepareDocForSave` exactly like a project save, so local images are
 * uploaded first and the stored doc only ever holds https URLs.
 */
export function SaveTemplateDialog({
  mode,
  onClose,
  projectId,
}: {
  mode: "create" | "update";
  onClose: () => void;
  projectId?: string;
}) {
  const fallbackName =
    useEditorStore.getState().projectName.trim() || UNTITLED;
  const sourceTemplateId = parseCustomTemplateId(
    useEditorStore.getState().doc.templateId,
  );

  const [name, setName] = useState(fallbackName);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("general");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  // Update mode degrades to create when the source template cannot be read.
  const [effectiveMode, setEffectiveMode] = useState(
    mode === "update" && sourceTemplateId ? "update" : "create",
  );
  const [notice, setNotice] = useState<string | null>(null);

  const setTemplateId = useEditorStore((s) => s.setTemplateId);

  // Update mode prefills from the template's stored details. Async, so a slow
  // response just means the fields fill in a beat later.
  useEffect(() => {
    if (mode !== "update" || !sourceTemplateId) return;

    let cancelled = false;
    void getTemplateDetail(sourceTemplateId).then((result) => {
      if (cancelled) return;

      if (result?.status && result.data) {
        setName(result.data.name);
        setDescription(result.data.description);
        setCategory(result.data.category);
        setTags(result.data.tags.join(", "));
      } else {
        setEffectiveMode("create");
        setNotice(
          "The original template is no longer available — this will be saved as a new one.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [mode, sourceTemplateId]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Give your template a name.");
      return;
    }

    setSaving(true);
    try {
      const state = useEditorStore.getState();

      // Same pre-save pass as a project save: anything still held as a local
      // object URL is uploaded, so the snapshot only carries https URLs.
      const doc = await prepareDocForSave(state);
      const thumbnailUrl = await captureDocThumbnail(state);

      const meta = {
        name: trimmedName,
        description: description.trim(),
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim().slice(0, 30))
          .filter(Boolean)
          .slice(0, 10),
      };

      if (effectiveMode === "update" && sourceTemplateId) {
        const result = await updateTemplate(sourceTemplateId, {
          ...meta,
          doc,
          thumbnailUrl,
        });

        if (!result?.status) {
          toast.error(
            result?.message === "That template could not be found."
              ? "This template isn't yours (or was removed) — save it as a new template instead."
              : (result?.message ?? "Could not update the template."),
          );
          return;
        }

        toast.success(
          thumbnailUrl
            ? "Template updated"
            : "Template updated — the preview image could not be generated.",
        );
      } else {
        const result = await createTemplate({
          ...meta,
          doc,
          thumbnailUrl,
          sourceProjectId: projectId ?? null,
        });

        const created =
          result?.status &&
          result.data &&
          typeof result.data === "object" &&
          "templateId" in result.data
            ? (result.data as { id: string; templateId: string })
            : null;

        if (!created) {
          toast.error(result?.message ?? "Could not save the template.");
          return;
        }

        // The document now belongs to the template it just produced, which is
        // what makes "Update template" available from here on.
        setTemplateId(created.templateId);
        toast.success(
          thumbnailUrl
            ? "Template saved — it is now in the template list."
            : "Template saved — the preview image could not be generated.",
        );
      }

      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the template.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updating = effectiveMode === "update";

  return (
    <Dialog open onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {updating ? "Update template" : "Save as template"}
          </DialogTitle>
          <DialogDescription>
            {updating
              ? "Overwrites the template this project came from, for everyone who uses it."
              : "Publishes a snapshot of every screen as a reusable template, visible to everyone."}
          </DialogDescription>
        </DialogHeader>

        {notice && (
          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            {notice}
          </p>
        )}

        <div className="space-y-4">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Bold gradient promo"
            />
          </Field>

          <Field label="Description" hint="optional">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="One line about when to use it"
            />
          </Field>

          <Field label="Category">
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as TemplateCategory)}
            >
              <SelectTrigger className="w-full capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map((option) => (
                  <SelectItem key={option} value={option} className="capitalize">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Tags" hint="comma-separated, up to 10">
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="fitness, dark, minimal"
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {updating ? "Update template" : "Save template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
