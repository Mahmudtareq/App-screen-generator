"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { TEMPLATES, type Template } from "@/config/templates";
import { createDocFromTemplate } from "@/lib/editor/defaults";
import { saveDraft } from "@/lib/editor/persistence";
import { cn } from "@/lib/utils";

/**
 * The gallery on /templates.
 *
 * Choosing one writes the document straight into the local draft and then navigates
 * to the editor, which picks the draft up on mount. That is deliberately the same
 * path an anonymous session already uses to survive a reload — the alternative,
 * passing a template id through the URL, would need the editor to decide whether the
 * id or an existing draft wins, and would silently discard work either way.
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
            style={{ background: previewCss(template) }}
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

/** The template background as a CSS value, for the preview only. */
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
