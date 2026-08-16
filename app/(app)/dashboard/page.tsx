import { Plus } from "lucide-react";
import Link from "next/link";

import { listProjectsAction } from "@/actions/projects/projectActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { routes } from "@/config/routes";

export const metadata = { title: "Projects · Mockup Studio" };

// Per-user by definition. Stated explicitly so the build does not attempt a
// static render, fail on `headers()`, and log a stack trace for expected
// behaviour.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const result = await listProjectsAction({ page: 1, limit: 24 });

  if (!result.success) {
    return (
      <main className="mx-auto max-w-5xl p-8">
        <p className="text-sm text-destructive">{result.error.message}</p>
      </main>
    );
  }

  const { docs } = result.data;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your projects
          </h1>
          <p className="text-sm text-muted-foreground">
            {result.data.totalDocs} saved{" "}
            {result.data.totalDocs === 1 ? "mockup" : "mockups"}
          </p>
        </div>

        <Button asChild>
          <Link href={routes.public.editor}>
            <Plus className="size-4" />
            New mockup
          </Link>
        </Button>
      </header>

      {docs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing saved yet. Build a mockup and hit Save to keep it here.
          </p>
          <Button asChild variant="outline">
            <Link href={routes.public.editor}>Open the editor</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {docs.map((project) => (
            <Link key={project.id} href={routes.private.project(project.id)}>
              <Card className="overflow-hidden p-0 transition-shadow hover:shadow-md">
                <div className="aspect-3/4 bg-muted">
                  {project.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.thumbnailUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div className="space-y-0.5 p-3">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
