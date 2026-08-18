import Link from "next/link";
import { ChevronLeft, ChevronRight, LayoutTemplate, Plus, Sparkles } from "lucide-react";

import { listProjectsAction } from "@/actions/projects/projectActions";
import { ProjectCard } from "@/components/dashboard/project-card";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";

export const metadata = { title: "Projects · Mockup Studio" };

// Per-user by definition. Stated explicitly so the build does not attempt a
// static render, fail on `headers()`, and log a stack trace for expected
// behaviour.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  // The list action has always been paginated; the page just never asked for a
  // second one, so a 25th project was invisible rather than merely off-screen.
  const { page } = await searchParams;
  // A hand-edited `?page=` is a bad URL, not an error worth a red message — the
  // action would reject anything non-numeric, so it is normalised to 1 here.
  const requested = Number(Array.isArray(page) ? page[0] : page);
  const result = await listProjectsAction({
    page: Number.isFinite(requested) && requested >= 1 ? requested : 1,
    limit: PAGE_SIZE,
  });

  if (!result.success) {
    return (
      <main className="p-4 sm:p-6">
        <p className="text-destructive text-sm">{result.error.message}</p>
      </main>
    );
  }

  const { docs, totalDocs, pages, hasNext, hasPrev } = result.data;
  const current = result.data.page;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
          <p className="text-muted-foreground text-sm">
            {totalDocs === 0
              ? "Nothing saved yet"
              : `${totalDocs} saved ${totalDocs === 1 ? "mockup" : "mockups"}`}
            {pages > 1 && ` · page ${current} of ${pages}`}
          </p>
        </div>

        <Button asChild>
          <Link href={routes.public.editor}>
            <Plus className="size-4" />
            New mockup
          </Link>
        </Button>
      </div>

      {docs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {docs.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          {pages > 1 && (
            <nav
              aria-label="Pagination"
              className="flex items-center justify-center gap-2 pt-2"
            >
              <PageLink page={current - 1} enabled={hasPrev}>
                <ChevronLeft className="size-4" />
                Previous
              </PageLink>

              <span className="text-muted-foreground px-2 text-sm tabular-nums">
                {current} / {pages}
              </span>

              <PageLink page={current + 1} enabled={hasNext}>
                Next
                <ChevronRight className="size-4" />
              </PageLink>
            </nav>
          )}
        </>
      )}
    </main>
  );
}

/**
 * One pager control in both states.
 *
 * The disabled arm renders its children directly rather than reusing the `asChild`
 * arm with a `<span>` wrapper: the wrapper becomes the button's only flex child, so
 * the icon and the label stack instead of sitting side by side.
 */
function PageLink({
  page,
  enabled,
  children,
}: {
  page: number;
  enabled: boolean;
  children: React.ReactNode;
}) {
  if (!enabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`${routes.private.dashboard}?page=${page}`}>{children}</Link>
    </Button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 rounded-xl border border-dashed p-10 text-center">
      <span className="bg-muted text-muted-foreground grid size-12 place-items-center rounded-full">
        <Sparkles className="size-5" />
      </span>

      <div className="space-y-1">
        <p className="font-medium">No mockups saved yet</p>
        <p className="text-muted-foreground max-w-sm text-sm text-pretty">
          Build a set of five screens in the editor, hit Save, and it lands here —
          ready to reopen from any device.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href={routes.public.editor}>
            <Plus className="size-4" />
            Open the editor
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={routes.public.templates}>
            <LayoutTemplate className="size-4" />
            Browse templates
          </Link>
        </Button>
      </div>
    </div>
  );
}
