import Link from "next/link";
import { ImageOff } from "lucide-react";

import { routes } from "@/config/routes";
import type { ProjectSummary } from "@/schemas/project";

import { DeleteProjectButton } from "./delete-project-button";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60_000],
  ["month", 30 * 24 * 60 * 60_000],
  ["week", 7 * 24 * 60 * 60_000],
  ["day", 24 * 60 * 60_000],
  ["hour", 60 * 60_000],
  ["minute", 60_000],
];

/**
 * "Updated 3 days ago" rather than a date, because on this screen the only thing
 * anyone reads the timestamp for is which card they were last working on.
 *
 * Formatted on the server, which is safe only because the whole route is
 * `force-dynamic` — a relative time rendered at build time and hydrated later is
 * the classic mismatch.
 */
function relativeTime(iso: string) {
  const elapsed = Date.now() - new Date(iso).getTime();
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const [unit, ms] of UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return format.format(-Math.round(elapsed / ms), unit);
    }
  }

  return "just now";
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      href={routes.private.project(project.id)}
      className="group bg-card ring-offset-background focus-visible:ring-ring block overflow-hidden rounded-xl border transition-[box-shadow,border-color] hover:border-foreground/20 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div className="from-muted/40 to-muted relative aspect-4/5 overflow-hidden bg-linear-to-b">
        {project.thumbnailUrl ? (
          // Contained rather than cropped: a store screenshot is a tall portrait
          // frame, and cover would cut the copy off the top of every card.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.thumbnailUrl}
            alt=""
            loading="lazy"
            className="size-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2">
            <ImageOff className="size-5" />
            <span className="text-xs">No preview yet</span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-linear-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-black">
            Open in editor
          </span>
        </div>

        <DeleteProjectButton
          project={project}
          updatedLabel={relativeTime(project.updatedAt)}
        />
      </div>

      <div className="space-y-0.5 border-t p-3">
        <p className="truncate text-sm font-medium">{project.name}</p>
        <p className="text-muted-foreground text-xs">
          Updated {relativeTime(project.updatedAt)}
        </p>
      </div>
    </Link>
  );
}
