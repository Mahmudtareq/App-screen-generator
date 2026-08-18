"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TEMPLATES, type Template } from "@/config/templates";
import { createDocFromTemplate } from "@/lib/editor/defaults";
import { clearDraft } from "@/lib/editor/persistence";
import { useEditorStore } from "@/lib/editor/store";
import { cn } from "@/lib/utils";

/**
 * Template chooser.
 *
 * Offers two genuinely different things, because "use this template" means two
 * things depending on whether there is work to lose:
 *
 *  - **Restyle** keeps every screen, its copy and its uploads, and repaints the
 *    look. Screen and layer ids survive, which matters because assets are keyed by
 *    them — rebuilding the screens would orphan every screenshot already dropped in.
 *  - **Start over** discards the screens and rebuilds five fresh ones from the
 *    template's own copy.
 *
 * Collapsing the two into one button would either silently throw away uploads or
 * silently refuse to apply the template's text, and both read as a bug.
 */
export function TemplatePicker({
  children,
  onOpenChange,
}: {
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  const currentTemplateId = useEditorStore((s) => s.doc.templateId);
  const applyTemplate = useEditorStore((s) => s.applyTemplate);
  const loadDoc = useEditorStore((s) => s.loadDoc);

  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string>(currentTemplateId);
  const [busy, setBusy] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (next) setChoice(currentTemplateId);
  };

  const restyle = () => {
    applyTemplate(choice);
    toast.success("Template applied — your copy and images were kept");
    handleOpenChange(false);
  };

  const startOver = () => {
    setBusy(true);
    try {
      loadDoc(createDocFromTemplate(choice));
      // The draft is rewritten by the autosave a moment later; clearing first stops
      // a half-written old document being restored if the tab dies in between.
      clearDraft();
      toast.success("Started a fresh set of five screens");
      handleOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Templates</DialogTitle>
          <DialogDescription>
            Every template starts as five screens, one device each. More are coming.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              selected={choice === template.id}
              current={currentTemplateId === template.id}
              onSelect={() => setChoice(template.id)}
            />
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={startOver} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Start over with five new screens
          </Button>
          <Button onClick={restyle} disabled={busy}>
            Restyle my screens
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({
  template,
  selected,
  current,
  onSelect,
}: {
  template: Template;
  selected: boolean;
  current: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "overflow-hidden rounded-xl border text-left transition-shadow",
        selected ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/40",
      )}
    >
      <div
        className="relative flex h-28 items-start justify-center p-3"
        style={{ background: previewCss(template) }}
      >
        <span
          className="text-center text-xs font-bold leading-tight"
          style={{ color: template.type.titleColor }}
        >
          {template.screens[0].title}
        </span>

        {/* A stand-in for the device, so the swatch reads as a screenshot frame
            rather than a colour chip. */}
        <span className="absolute -bottom-3 left-1/2 h-12 w-16 -translate-x-1/2 rounded-t-lg border-2 border-b-0 border-neutral-800 bg-neutral-900" />

        {selected && (
          <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3" />
          </span>
        )}
      </div>

      <div className="space-y-1 p-3">
        <p className="flex items-center gap-2 text-sm font-medium">
          {template.label}
          {current && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
              current
            </span>
          )}
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {template.description}
        </p>
      </div>
    </button>
  );
}

/** The template background as a CSS value, for the preview swatch only. */
function previewCss(template: Template): string {
  const background = template.background;

  if (background.type === "color") return background.color;
  if (background.type === "gradient") {
    const stops = background.stops
      .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
      .join(", ");
    return `linear-gradient(${background.angle}deg, ${stops})`;
  }
  return "#e5e7eb";
}
