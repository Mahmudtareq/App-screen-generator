"use client";

import { useEffect, useState } from "react";
import { Check, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  getTemplateDetail,
  getTemplateList,
} from "@/actions/templates/templateActions";
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
import { clearDraft, migrateDoc } from "@/lib/editor/persistence";
import { useEditorStore } from "@/lib/editor/store";
import { cn } from "@/lib/utils";
import {
  customTemplateId,
  isCustomTemplateId,
  parseCustomTemplateId,
  type TemplateSummary,
} from "@/schemas/template";

import { backgroundPreviewCss } from "./template-preview";

/**
 * Template chooser.
 *
 * Offers two genuinely different things, because "use this template" means two
 * things depending on whether there is work to lose:
 *
 *  - **Restyle** keeps every screen, its copy and its uploads, and repaints the
 *    look. Screen and layer ids survive, which matters because assets are keyed by
 *    them — rebuilding the screens would orphan every screenshot already dropped in.
 *  - **Start over** discards the screens and rebuilds a fresh set from the
 *    template.
 *
 * Collapsing the two into one button would either silently throw away uploads or
 * silently refuse to apply the template's text, and both read as a bug.
 *
 * Community templates are full document snapshots, not styling recipes, so they
 * only offer "start over" — there is nothing to derive a restyle from.
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
  const [community, setCommunity] = useState<TemplateSummary[] | null>(null);

  // The community list is fetched the first time the dialog opens: it is not
  // needed at first paint, and the built-ins render regardless of the network.
  useEffect(() => {
    if (!open || community !== null) return;

    let cancelled = false;
    void getTemplateList(1, 24).then((result) => {
      if (!cancelled) setCommunity(result.data.docs);
    });

    return () => {
      cancelled = true;
    };
  }, [open, community]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
    if (next) setChoice(currentTemplateId);
  };

  const customChoice = isCustomTemplateId(choice);

  const restyle = () => {
    applyTemplate(choice);
    toast.success("Template applied — your copy and images were kept");
    handleOpenChange(false);
  };

  const startOver = async () => {
    setBusy(true);
    try {
      if (customChoice) {
        const id = parseCustomTemplateId(choice);
        const result = id ? await getTemplateDetail(id) : null;
        const doc =
          result?.status && result.data ? migrateDoc(result.data.doc) : null;

        if (!doc) {
          toast.error(
            "This template can't be opened — it may have been removed.",
          );
          return;
        }

        loadDoc(doc);
      } else {
        loadDoc(createDocFromTemplate(choice));
      }

      // The draft is rewritten by the autosave a moment later; clearing first stops
      // a half-written old document being restored if the tab dies in between.
      clearDraft();
      toast.success("Started a fresh set of screens");
      handleOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Templates</DialogTitle>
          <DialogDescription>
            Built-in templates restyle or rebuild your screens; community
            templates open as a fresh copy of their screens.
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

        {community === null ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Loading community templates…
          </p>
        ) : community.length > 0 ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Community
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {community.map((template) => (
                <CommunityCard
                  key={template.id}
                  template={template}
                  selected={choice === customTemplateId(template.id)}
                  current={currentTemplateId === customTemplateId(template.id)}
                  onSelect={() => setChoice(customTemplateId(template.id))}
                />
              ))}
            </div>
          </>
        ) : null}

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={startOver} disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {customChoice
              ? "Start over from this template"
              : "Start over with five new screens"}
          </Button>
          {/* A community template is a snapshot, not a recipe — there is no
              restyle to offer for it. */}
          {!customChoice && (
            <Button onClick={restyle} disabled={busy}>
              Restyle my screens
            </Button>
          )}
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
        style={{ background: backgroundPreviewCss(template.background) }}
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

        {selected && <SelectedBadge />}
      </div>

      <CardMeta label={template.label} description={template.description} current={current} />
    </button>
  );
}

function CommunityCard({
  template,
  selected,
  current,
  onSelect,
}: {
  template: TemplateSummary;
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
      <div className="relative h-28 bg-muted">
        {template.thumbnailUrl ? (
          // Plain <img>: never drawn to a canvas, so tainting rules don't apply.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.thumbnailUrl}
            alt=""
            className="size-full object-cover object-top"
            loading="lazy"
          />
        ) : (
          <span className="grid size-full place-items-center text-muted-foreground">
            <ImageOff className="size-5" />
          </span>
        )}

        {selected && <SelectedBadge />}
      </div>

      <CardMeta
        label={template.name}
        description={
          template.description || `by ${template.creatorName || "someone"}`
        }
        current={current}
      />
    </button>
  );
}

function SelectedBadge() {
  return (
    <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
      <Check className="size-3" />
    </span>
  );
}

function CardMeta({
  label,
  description,
  current,
}: {
  label: string;
  description: string;
  current: boolean;
}) {
  return (
    <div className="space-y-1 p-3">
      <p className="flex items-center gap-2 text-sm font-medium">
        <span className="truncate">{label}</span>
        {current && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
            current
          </span>
        )}
      </p>
      <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
