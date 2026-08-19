"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ImageOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getTemplateDetail } from "@/actions/templates/templateActions";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { TEMPLATES } from "@/config/templates";
import { createDocFromTemplate } from "@/lib/editor/defaults";
import { migrateDoc, saveDraft } from "@/lib/editor/persistence";
import { cn } from "@/lib/utils";
import type { TemplateSummary } from "@/schemas/template";

import { backgroundPreviewCss } from "./template-preview";

/**
 * The gallery on /templates.
 *
 * Choosing one writes the document straight into the local draft and then navigates
 * to the editor, which picks the draft up on mount. That is deliberately the same
 * path an anonymous session already uses to survive a reload — the alternative,
 * passing a template id through the URL, would need the editor to decide whether the
 * id or an existing draft wins, and would silently discard work either way.
 *
 * Built-in templates build their document locally from the static recipe; a
 * community template is a stored document snapshot, fetched and run through
 * `migrateDoc` — the same validation every saved project passes on open.
 */
export function TemplateGallery({ className }: { className?: string }) {
  const router = useRouter();

  const start = (templateId: string) => {
    saveDraft(createDocFromTemplate(templateId));
    router.push(routes.public.editor);
  };

  return (
    <div className={cn("grid gap-6 sm:grid-cols-2", className)}>
      {TEMPLATES.map((template) => (
        <article key={template.id} className="overflow-hidden rounded-2xl border">
          <div
            className="relative h-56 overflow-hidden"
            style={{ background: backgroundPreviewCss(template.background) }}
          >
            {/* A miniature of the first three screens, so the card shows what a set
                looks like rather than just a colour. */}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-3 px-6">
              {template.screens.slice(0, 3).map((copy, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex w-20 flex-col items-center gap-1 rounded-t-lg pt-3",
                    index === 1 ? "h-40" : "h-32",
                  )}
                >
                  <span
                    className="line-clamp-2 px-1 text-center text-[8px] font-bold leading-tight"
                    style={{ color: template.type.titleColor }}
                  >
                    {copy.title}
                  </span>
                  <span className="mt-auto h-full w-14 rounded-t-md border-2 border-b-0 border-neutral-800 bg-neutral-900" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 p-5">
            <div className="space-y-1">
              <h2 className="text-base font-medium">{template.label}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {template.description}
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              {template.screens.length} screens · {template.artboardPresetId
                .replace("appstore-", "App Store ")
                .replace("playstore-", "Play Store ")}
            </p>

            <Button className="w-full" onClick={() => start(template.id)}>
              Use this template
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}

/** Grid of user-saved templates, rendered below the built-ins on /templates. */
export function CommunityTemplateGrid({
  templates,
  className,
}: {
  templates: TemplateSummary[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {templates.map((template) => (
        <CommunityTemplateCard key={template.id} template={template} />
      ))}
    </div>
  );
}

function CommunityTemplateCard({ template }: { template: TemplateSummary }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const use = async () => {
    setBusy(true);
    try {
      const result = await getTemplateDetail(template.id);
      const doc =
        result?.status && result.data ? migrateDoc(result.data.doc) : null;

      if (!doc) {
        toast.error("This template can't be opened — it may have been removed.");
        return;
      }

      saveDraft(doc);
      router.push(routes.public.editor);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border">
      {template.thumbnailUrl ? (
        // A plain <img>: this never touches a canvas, so the tainting rules that
        // force the Konva path through the image cache do not apply here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={template.thumbnailUrl}
          alt={`Preview of ${template.name}`}
          className="aspect-[4/3] w-full bg-muted object-cover object-top"
          loading="lazy"
        />
      ) : (
        <div className="grid aspect-[4/3] w-full place-items-center bg-muted text-muted-foreground">
          <ImageOff className="size-6" />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-sm font-medium">{template.name}</h3>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
              {template.category}
            </span>
          </div>
          {template.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {template.description}
            </p>
          )}
        </div>

        {template.tags.length > 0 && (
          <p className="line-clamp-1 text-[11px] text-muted-foreground">
            {template.tags.map((tag) => `#${tag}`).join(" ")}
          </p>
        )}

        <div className="mt-auto space-y-2">
          <p className="text-[11px] text-muted-foreground">
            {/* The ISO date, not toLocaleDateString: locale formatting differs
                between the server render and the hydrating client. */}
            by {template.creatorName || "someone"} · {template.updatedAt.slice(0, 10)}
          </p>
          <Button className="w-full" size="sm" onClick={use} disabled={busy}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            Use this template
          </Button>
        </div>
      </div>
    </article>
  );
}
